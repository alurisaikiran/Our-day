'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { put } from '@vercel/blob';
import { after } from 'next/server';
import { aiEnabled, analyzeReport, runLearningReview } from '@/lib/ai';
import { checkCredentials, clearSession, createSession, requireAction } from '@/lib/auth';
import { addEvent, db } from '@/lib/db';
import { fmtDay, fmtDuration, fmtTime, isDay, minutesBetween, nowHM, today } from '@/lib/time';

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? '').trim().slice(0, max);
const isHM = (s: string) => /^\d{2}:\d{2}$/.test(s);
const CATS = ['Meal', 'Sleep', 'Study', 'Health', 'Activity', 'Work'];
const PLAN_CATS = ['Appointment', 'Outing', 'Study', 'Work', 'Other'];

function refreshAll() {
  revalidatePath('/me', 'layout');
  revalidatePath('/admin', 'layout');
}

/* ---------- login ---------- */

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const role = checkCredentials(str(form, 'email'), String(form.get('password') ?? ''));
  if (!role) return 'That email or password is not right.';
  await createSession(role);
  redirect(role === 'admin' ? '/admin' : '/me');
}

export async function logout() {
  await clearSession();
  redirect('/login');
}

/* ---------- her: today's plan ---------- */

export async function markDone(id: number, done: boolean) {
  await requireAction('her');
  const sql = await db();
  if (done) {
    await sql`UPDATE plan_items SET status = 'done', actual_time = COALESCE(actual_time, ${nowHM()}), updated_at = now() WHERE id = ${id}`;
  } else {
    await sql`UPDATE plan_items SET status = 'todo', actual_time = NULL, note = NULL, updated_at = now() WHERE id = ${id}`;
  }
  refreshAll();
}

export async function updatePlanItem(id: number, status: string, actual: string, note: string) {
  await requireAction('her');
  if (!['done', 'changed', 'skipped', 'todo'].includes(status)) throw new Error('Bad status');
  const sql = await db();
  const cleanNote = note.trim().slice(0, 200) || null;
  const time = status === 'skipped' || status === 'todo' ? null : isHM(actual) ? actual : nowHM();
  const rows = await sql`UPDATE plan_items SET status = ${status}, actual_time = ${time}, note = ${cleanNote}, updated_at = now()
    WHERE id = ${id} RETURNING title, time`;
  const item = rows[0];
  if (item && (status === 'changed' || status === 'skipped')) {
    const what = status === 'changed' ? `moved “${item.title}” from ${fmtTime(item.time)} to ${fmtTime(time)}` : `skipped “${item.title}”`;
    await addEvent(status, `${what}${cleanNote ? ` — “${cleanNote}”` : ''}`);
  }
  refreshAll();
}

export async function setSick(sick: boolean) {
  await requireAction('her');
  const sql = await db();
  const day = today();
  await sql`INSERT INTO day_status (day, sick) VALUES (${day}, ${sick})
    ON CONFLICT (day) DO UPDATE SET sick = ${sick}, updated_at = now()`;
  await addEvent(sick ? 'sick' : 'better', sick ? 'Not feeling well — marked today as a sick day.' : 'Feeling better now.');
  refreshAll();
}

/* ---------- her: logging ---------- */

export async function addLog(form: FormData) {
  await requireAction('her');
  const kind = str(form, 'kind', 20);
  const shared = form.get('shared') === 'on';
  const day = isDay(str(form, 'day')) ? str(form, 'day') : today();
  const data: Record<string, unknown> = {};
  let summary = '';

  if (kind === 'meal') {
    data.meal = str(form, 'meal', 20) || 'Meal';
    data.time = isHM(str(form, 'time')) ? str(form, 'time') : nowHM();
    data.what = str(form, 'what', 200);
    const water = Number(form.get('water'));
    if (water >= 0 && water <= 20) data.water = water;
    summary = `${data.meal} at ${fmtTime(data.time as string)}${data.what ? ` — ${data.what}` : ''}`;
  } else if (kind === 'sleep') {
    const bed = str(form, 'bed');
    const wake = str(form, 'wake');
    if (!isHM(bed) || !isHM(wake)) throw new Error('Please enter both times');
    data.bed = bed;
    data.wake = wake;
    data.minutes = minutesBetween(bed, wake);
    data.rested = Number(form.get('rested')) || null;
    summary = `Slept ${fmtDuration(data.minutes as number)} (${fmtTime(bed)} → ${fmtTime(wake)})`;
  } else if (kind === 'health') {
    data.feeling = form.getAll('feeling').map(String).slice(0, 8);
    data.other = str(form, 'other', 200);
    data.medicine = str(form, 'medicine', 100);
    data.weight = str(form, 'weight', 10);
    const file = form.get('report');
    if (file instanceof File && file.size > 0) {
      const url = await saveReport(file, 'her');
      data.report = url;
    }
    summary = `Health: ${[...(data.feeling as string[]), data.other].filter(Boolean).join(', ') || 'update'}${data.medicine ? ` · took ${data.medicine}` : ''}`;
  } else if (kind === 'study') {
    data.goalId = Number(form.get('goalId')) || null;
    const newGoal = str(form, 'newGoal', 80);
    if (form.get('goalId') === 'new' && newGoal) {
      const sql0 = await db();
      const g = await sql0`INSERT INTO goals (name, total, added_by) VALUES (${newGoal}, 10, 'her') RETURNING id`;
      data.goalId = g[0].id;
      await addEvent('plan', `Started learning something new: ${newGoal}`);
    }
    data.topic = str(form, 'topic', 100);
    data.from = str(form, 'from');
    data.to = str(form, 'to');
    data.notes = str(form, 'notes', 500);
    if (isHM(data.from as string) && isHM(data.to as string)) data.minutes = minutesBetween(data.from as string, data.to as string);
    summary = `Studied ${data.topic || 'something'}${data.minutes ? ` for ${fmtDuration(data.minutes as number)}` : ''}`;
  } else if (kind === 'activity') {
    data.what = str(form, 'what', 200);
    data.from = str(form, 'from');
    data.to = str(form, 'to');
    summary = `${data.what || 'Activity'}${isHM(data.from as string) ? ` at ${fmtTime(data.from as string)}` : ''}`;
  } else {
    throw new Error('Unknown log type');
  }
  data.summary = summary;

  const sql = await db();
  await sql`INSERT INTO logs (day, kind, data, shared) VALUES (${day}, ${kind}, ${JSON.stringify(data)}, ${shared})`;
  if (shared && kind === 'health') await addEvent('health', summary);
  refreshAll();
  redirect('/me?saved=1');
}

async function saveReport(file: File, by: 'her' | 'admin') {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('File uploads are not set up yet (BLOB_READ_WRITE_TOKEN missing).');
  if (file.size > 10 * 1024 * 1024) throw new Error('File is larger than 10 MB');
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 80) || 'report';
  const blob = await put(`reports/${safeName}`, file, { access: 'public', addRandomSuffix: true });
  const sql = await db();
  const rows = await sql`INSERT INTO reports (name, url, uploaded_by, ai_status) VALUES (${safeName}, ${blob.url}, ${by}, ${aiEnabled() ? 'working' : 'off'}) RETURNING id`;
  const id = rows[0].id as number;
  // The AI report checker runs in the background after the page responds.
  if (aiEnabled()) after(() => analyzeReport(id));
  if (by === 'her') await addEvent('report', `Uploaded a health report: ${safeName}`);
  return blob.url;
}

export async function uploadReport(form: FormData) {
  const role = await requireAction('her', 'admin');
  const file = form.get('report');
  if (!(file instanceof File) || file.size === 0) return;
  await saveReport(file, role);
  refreshAll();
}

export async function deleteReport(id: number) {
  await requireAction('her', 'admin');
  const sql = await db();
  await sql`DELETE FROM reports WHERE id = ${id}`;
  refreshAll();
}

export async function checkReport(id: number) {
  await requireAction('her', 'admin');
  await analyzeReport(id);
  refreshAll();
}

/* ---------- AI learning coach ---------- */

export async function askLearningCoach(_prev: string | null): Promise<string | null> {
  const role = await requireAction('her', 'admin');
  try {
    await runLearningReview(role);
  } catch (e) {
    return e instanceof Error ? e.message : 'The coach could not run right now.';
  }
  refreshAll();
  return null;
}

/* ---------- plans (future) — both can add ---------- */

export async function addPlan(form: FormData) {
  const role = await requireAction('her', 'admin');
  const title = str(form, 'title', 120);
  const date = str(form, 'date');
  const time = str(form, 'time');
  const category = PLAN_CATS.includes(str(form, 'category')) ? str(form, 'category') : 'Other';
  const place = str(form, 'place', 120) || null;
  if (!title || !isDay(date)) return;
  const sql = await db();
  await sql`INSERT INTO plans (date, time, title, category, place, added_by)
    VALUES (${date}, ${isHM(time) ? time : null}, ${title}, ${category}, ${place}, ${role})`;
  if (role === 'her') {
    await addEvent('plan', `Added a plan: ${title} — ${fmtDay(date, { weekday: 'short', day: 'numeric', month: 'short' })}${isHM(time) ? `, ${fmtTime(time)}` : ''}`);
  }
  refreshAll();
}

export async function deletePlan(id: number) {
  await requireAction('her', 'admin');
  const sql = await db();
  await sql`DELETE FROM plans WHERE id = ${id}`;
  refreshAll();
}

/* ---------- admin: daily schedule ---------- */

export async function addPlanItem(form: FormData) {
  await requireAction('admin');
  const day = str(form, 'day');
  const time = str(form, 'time');
  const title = str(form, 'title', 120);
  const category = CATS.includes(str(form, 'category')) ? str(form, 'category') : 'Activity';
  if (!isDay(day) || !isHM(time) || !title) return;
  const sql = await db();
  await sql`INSERT INTO plan_items (day, time, title, category) VALUES (${day}, ${time}, ${title}, ${category})`;
  refreshAll();
}

export async function deletePlanItem(id: number) {
  await requireAction('admin');
  const sql = await db();
  await sql`DELETE FROM plan_items WHERE id = ${id}`;
  refreshAll();
}

export async function copyPlan(form: FormData) {
  await requireAction('admin');
  const from = str(form, 'from');
  const to = str(form, 'to');
  if (!isDay(from) || !isDay(to) || from === to) return;
  const sql = await db();
  await sql`INSERT INTO plan_items (day, time, title, category)
    SELECT ${to}, time, title, category FROM plan_items WHERE day = ${from}`;
  refreshAll();
}

/* ---------- admin: learning goals ---------- */

export async function addGoal(form: FormData) {
  const role = await requireAction('admin', 'her');
  const name = str(form, 'name', 80);
  const target = str(form, 'target', 60) || null;
  const total = Math.min(Math.max(Number(form.get('total')) || 10, 1), 500);
  if (!name) return;
  const sql = await db();
  await sql`INSERT INTO goals (name, target, total, added_by) VALUES (${name}, ${target}, ${total}, ${role})`;
  if (role === 'her') await addEvent('plan', `Added a learning goal: ${name}`);
  refreshAll();
}

export async function deleteGoal(id: number) {
  await requireAction('admin', 'her');
  const sql = await db();
  await sql`DELETE FROM goals WHERE id = ${id}`;
  refreshAll();
}
