import Anthropic from '@anthropic-ai/sdk';
import { addEvent, db } from '@/lib/db';
import { addDays, today } from '@/lib/time';

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
let cachedModel: string | null = null;

function ai() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/** Uses AI_MODEL if set, otherwise the newest Sonnet model your API key can use. */
async function model(c: Anthropic) {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  if (cachedModel) return cachedModel;
  const page = await c.models.list({ limit: 50 });
  const ids = page.data.map((m) => m.id);
  cachedModel = ids.find((id) => id.includes('sonnet')) || ids[0];
  return cachedModel;
}

async function ask(system: string, content: Anthropic.MessageParam['content'], maxTokens = 1500) {
  const c = ai();
  const res = await c.messages.create({ model: await model(c), max_tokens: maxTokens, system, messages: [{ role: 'user', content }] });
  return res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
}

const FORMAT = 'Format: short sections that start with "## " headings, "- " bullet points, **bold** for key values. No tables. Plain, warm, simple English.';

/* ---------------- Report checker ---------------- */

const REPORT_SYSTEM = `You help a couple understand a medical report (lab results, prescription, scan summary, etc.) uploaded to their private health tracker.
You are not a doctor and must not diagnose or prescribe. Explain what the report says in plain language.

Write these sections:
## What this report is
One or two lines: type of report, date and lab/clinic if shown.
## Results that look outside the normal range
Each value outside the reference range printed on the report: name, her value, the printed range, and one plain sentence on what that marker generally measures. If the report prints no ranges, say so instead of guessing. If everything is in range, say that clearly.
## Everything else, briefly
One line summarising the normal results.
## Questions to ask the doctor
2–4 specific questions based on this report.
## When to call a doctor soon
Only if a value is marked critical/very abnormal or the report itself says so: say plainly to contact a doctor promptly. Otherwise write "Nothing on this report is marked urgent."

End with: "_This is an AI summary to help you read the report — it is not medical advice. Please go over it with her doctor._"
If the file is unreadable or is not a health document, say so in one line.
${FORMAT}`;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function analyzeReport(id: number) {
  const sql = await db();
  const rows = await sql`SELECT id, name, url FROM reports WHERE id = ${id}`;
  const r = rows[0];
  if (!r) return;
  if (!aiEnabled()) {
    await sql`UPDATE reports SET ai_status = 'off' WHERE id = ${id}`;
    return;
  }
  await sql`UPDATE reports SET ai_status = 'working', ai_summary = NULL WHERE id = ${id}`;
  try {
    const res = await fetch(r.url);
    if (!res.ok) throw new Error('Could not download the file');
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const isPdf = type === 'application/pdf' || r.name.toLowerCase().endsWith('.pdf');
    if (!isPdf && !IMAGE_TYPES.includes(type)) {
      await sql`UPDATE reports SET ai_status = 'error', ai_summary = ${'The AI can read PDF, JPG, PNG or WEBP files. Please upload this report in one of those formats (on iPhone, a screenshot of the photo works).'} WHERE id = ${id}`;
      return;
    }
    const data = Buffer.from(await res.arrayBuffer()).toString('base64');
    const file: Anthropic.ContentBlockParam = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : { type: 'image', source: { type: 'base64', media_type: type as 'image/jpeg', data } };
    const text = await ask(REPORT_SYSTEM, [file, { type: 'text', text: `File name: ${r.name}. Please explain this report.` }]);
    await sql`UPDATE reports SET ai_status = 'done', ai_summary = ${text}, ai_at = now() WHERE id = ${id}`;
    await addEvent('report', `AI finished reading “${r.name}” — summary is on the report.`);
  } catch (e) {
    console.error('analyzeReport', e);
    await sql`UPDATE reports SET ai_status = 'error', ai_summary = ${'The AI could not read this report right now. Try “Check again” in a minute.'} WHERE id = ${id}`;
  }
}

/* ---------------- Learning coach ---------------- */

const LEARNING_SYSTEM = `You are a friendly learning coach inside a private app a couple uses. He plans her day and sets learning goals; she logs her study sessions. Both read your review.
Speak to her directly ("you"), encouraging and specific, never guilt-tripping. Base everything only on the data given; do not invent sessions.

Write these sections:
## How the last two weeks went
Per goal: sessions done vs. goal, total time, how steady it was.
## What's working
1–3 bullets drawn from her notes and timing (e.g. mornings go better).
## Next steps for each goal
Per goal: the next 2–3 concrete topics or exercises to learn next, in a sensible order for a beginner unless her notes show otherwise.
## Suggested plan for next week
3–6 bullets like "Mon 9:00 AM — Python: functions, 45 min". Fit the times she usually studies and leave rest days, especially if she logged sick days.
## One small tip
One line.
Keep it under 350 words. ${FORMAT}`;

export async function runLearningReview(by: 'her' | 'admin' | 'schedule') {
  if (!aiEnabled()) throw new Error('Add ANTHROPIC_API_KEY in Vercel to turn on the learning coach.');
  const sql = await db();
  const since = addDays(today(), -14);
  const [goals, sessions, blocks, sick] = await Promise.all([
    sql`SELECT g.id, g.name, g.target, g.total, (SELECT count(*)::int FROM logs l WHERE l.kind = 'study' AND l.shared AND l.data->>'goalId' = g.id::text) AS done FROM goals g ORDER BY g.id`,
    sql`SELECT day, data FROM logs WHERE kind = 'study' AND shared AND day >= ${since} ORDER BY day, created_at`,
    sql`SELECT day, time, title, status, note FROM plan_items WHERE category = 'Study' AND day >= ${since} AND day <= ${today()} ORDER BY day, time`,
    sql`SELECT day FROM day_status WHERE sick AND day >= ${since}`,
  ]);
  if (!goals.length && !sessions.length) throw new Error('Add a learning goal or log a study session first.');

  const goalName = (id: unknown) => goals.find((g) => String(g.id) === String(id))?.name || 'Other';
  const payload = {
    today: today(),
    goals: goals.map((g) => ({ name: g.name, howOften: g.target, sessionsDone: g.done, sessionsGoal: g.total })),
    studySessionsLast14Days: sessions.map((s) => ({ day: s.day, goal: goalName(s.data.goalId), topic: s.data.topic, from: s.data.from, to: s.data.to, minutes: s.data.minutes, notes: s.data.notes })),
    plannedStudyBlocksLast14Days: blocks.map((b) => ({ day: b.day, time: b.time, title: b.title, status: b.status, note: b.note })),
    sickDays: sick.map((s) => s.day),
  };
  const text = await ask(LEARNING_SYSTEM, [{ type: 'text', text: 'Here is the data as JSON:\n' + JSON.stringify(payload, null, 1) }], 1800);
  await sql`INSERT INTO ai_reviews (kind, content, requested_by) VALUES ('learning', ${text}, ${by})`;
  await addEvent('plan', 'The learning coach wrote a new review.');
  return text;
}
