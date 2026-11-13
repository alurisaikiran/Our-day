import Link from 'next/link';
import { names } from '@/lib/auth';
import { db } from '@/lib/db';
import { addDays, fmtDay, fmtDuration, fmtStamp, fmtTime, isDay, today } from '@/lib/time';
import { ReportList, ReportUpload } from '@/components/Reports';
import LearningCoach from '@/components/LearningCoach';

const statusBadge: Record<string, [string, string]> = {
  done: ['Done', 'soft-green'],
  changed: ['Changed by her', 'soft-indigo'],
  skipped: ['Skipped', 'soft-amber'],
  todo: ['Not yet', 'soft-gray'],
};
const eventTone: Record<string, string> = { sick: 'soft-rose', health: 'soft-rose', changed: 'soft-indigo', skipped: 'soft-amber', plan: 'soft-gray', report: 'soft-green', better: 'soft-green' };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const sp = await searchParams;
  const now = today();
  const day = isDay(sp.day) ? sp.day : now;
  const weekStart = addDays(day, -6);
  const sql = await db();

  const [items, statusRows, events, logs, sleepRows, appts, goals, reports] = await Promise.all([
    sql`SELECT * FROM plan_items WHERE day = ${day} ORDER BY time, id`,
    sql`SELECT sick FROM day_status WHERE day = ${day}`,
    sql`SELECT * FROM events ORDER BY at DESC LIMIT 8`,
    sql`SELECT kind, data, created_at FROM logs WHERE day = ${day} AND shared ORDER BY created_at`,
    sql`SELECT day, data FROM logs WHERE kind = 'sleep' AND shared AND day >= ${weekStart} AND day <= ${day} ORDER BY created_at`,
    sql`SELECT * FROM plans WHERE category = 'Appointment' AND date >= ${now} ORDER BY date, time NULLS LAST LIMIT 4`,
    sql`SELECT g.*, (SELECT count(*)::int FROM logs l WHERE l.kind = 'study' AND l.shared AND l.data->>'goalId' = g.id::text) AS done FROM goals g ORDER BY g.id`,
    sql`SELECT * FROM reports ORDER BY uploaded_at DESC LIMIT 5`,
  ]);

  const sick = !!statusRows[0]?.sick;
  const finished = items.filter((i) => i.status === 'done' || i.status === 'changed').length;
  const changed = items.filter((i) => i.status === 'changed').length;
  const skipped = items.filter((i) => i.status === 'skipped').length;
  const meals = logs.filter((l) => l.kind === 'meal');
  const health = logs.filter((l) => l.kind === 'health');
  const studyMin = logs.filter((l) => l.kind === 'study').reduce((s, l) => s + (Number(l.data.minutes) || 0), 0);
  const water = meals.reduce((m, l) => Math.max(m, Number(l.data.water) || 0), 0);

  const sleepByDay: Record<string, number> = {};
  for (const r of sleepRows) sleepByDay[r.day] = Number(r.data.minutes) || 0;
  const week = Array.from({ length: 7 }, (_, n) => {
    const d = addDays(weekStart, n);
    return { d, label: fmtDay(d, { weekday: 'short' }), min: sleepByDay[d] || 0 };
  });
  const lastSleep = sleepByDay[day] ?? sleepByDay[addDays(day, -1)];

  return (
    <>
      <div className="row-between" style={{ alignItems: 'flex-end' }}>
        <div className="stack-sm">
          <span className="muted small">{fmtDay(day)}{day === now ? ' · today' : ''}</span>
          <h1 style={{ fontSize: 30 }}>{names.her === 'love' ? 'Her' : names.her + '’s'} day at a glance</h1>
        </div>
        <div className="row wrap">
          <Link href={`/admin?day=${addDays(day, -1)}`} className="btn">← Prev</Link>
          {day !== now && <Link href="/admin" className="btn">Today</Link>}
          <Link href={`/admin?day=${addDays(day, 1)}`} className="btn">Next →</Link>
          <Link href={`/admin/plan?day=${addDays(now, 1)}`} className="btn btn-indigo">Plan tomorrow</Link>
        </div>
      </div>

      {sick && day === now && <p className="notice soft-rose"><strong>She marked today as a sick day.</strong> Go easy on the plan.</p>}

      <section className="card stack">
        <h2>Updates from her</h2>
        {events.length === 0 ? <p className="muted small">Nothing yet. When she changes a plan, feels unwell or adds something, it shows here.</p> : (
          <div className="row wrap" style={{ alignItems: 'stretch' }}>
            {events.map((e) => (
              <div key={e.id} className={`notice ${eventTone[e.kind] || 'soft-gray'}`} style={{ flex: '1 1 240px' }}>
                <div className="tiny bold" style={{ marginBottom: 4 }}>{fmtStamp(e.at)}</div>
                <div style={{ lineHeight: 1.4 }}>{e.text}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid-auto">
        <div className="card kpi stack-sm"><span className="small muted">Plan done</span><span className="v">{finished} / {items.length}</span><span className="tiny bold" style={{ color: 'var(--indigo-dark)' }}>{changed} changed · {skipped} skipped</span></div>
        <div className="card kpi stack-sm"><span className="small muted">Last sleep</span><span className="v">{lastSleep ? fmtDuration(lastSleep) : '—'}</span><span className="tiny muted">from her sleep log</span></div>
        <div className="card kpi stack-sm"><span className="small muted">Meals logged</span><span className="v">{meals.length}</span><span className="tiny muted">water: {water} glasses</span></div>
        <div className="card kpi stack-sm"><span className="small muted">Studied</span><span className="v">{studyMin ? fmtDuration(studyMin) : '—'}</span><span className="tiny muted">on this day</span></div>
      </div>

      <div className="cols">
        <section className="card stack col-wide">
          <div className="row-between"><h2>Plan vs. what she did</h2><Link href={`/admin/plan?day=${day}`} className="small bold" style={{ color: 'var(--indigo)' }}>Edit plan</Link></div>
          {items.length === 0 ? <p className="empty">No plan for this day. <Link href={`/admin/plan?day=${day}`}>Make one</Link>.</p> : (
            <div className="table-box">
              <table className="table">
                <thead><tr><th>Time</th><th>You planned</th><th>She logged</th><th>Status</th></tr></thead>
                <tbody>
                  {items.map((i) => {
                    const [label, tone] = statusBadge[i.status] || statusBadge.todo;
                    const logged = i.status === 'todo' ? '—'
                      : i.status === 'skipped' ? (i.note ? `“${i.note}”` : 'Skipped')
                      : `${i.status === 'changed' ? 'Moved to' : 'At'} ${fmtTime(i.actual_time)}${i.note ? ` — “${i.note}”` : ''}`;
                    return (
                      <tr key={i.id}>
                        <td className="bold muted">{fmtTime(i.time)}</td>
                        <td className="bold">{i.title}</td>
                        <td>{logged}</td>
                        <td><span className={`badge ${tone}`}>{label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="col-narrow stack" style={{ gap: 18 }}>
          <section className="card stack">
            <div className="row-between"><h2>Sleep — 7 days</h2><span className="tiny muted">pink = under 7 h</span></div>
            <div className="bars" role="img" aria-label={`Hours slept: ${week.map((w) => `${w.label} ${(w.min / 60).toFixed(1)}`).join(', ')}`}>
              {week.map((w) => (
                <div key={w.d}>
                  <span className="tiny bold">{w.min ? (w.min / 60).toFixed(1) : ''}</span>
                  <div className={`bar ${w.min && w.min < 420 ? 'low' : ''}`} style={{ height: `${Math.min(w.min / 600, 1) * 120}px` }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10, marginTop: -6 }}>
              {week.map((w) => <span key={w.d} className="tiny muted" style={{ textAlign: 'center' }}>{w.label}</span>)}
            </div>
          </section>

          <section className="card stack">
            <h2>Meals</h2>
            {meals.length === 0 ? <p className="muted small">No meals logged.</p> : meals.map((m, n) => (
              <div key={n} className="row" style={{ alignItems: 'flex-start' }}>
                <span className="small bold muted" style={{ width: 70, flexShrink: 0 }}>{fmtTime(m.data.time)}</span>
                <span className="small"><b>{m.data.meal}</b>{m.data.what ? ` · ${m.data.what}` : ''}</span>
              </div>
            ))}
          </section>
        </div>
      </div>

      <div className="cols">
        <section className="card stack col-narrow">
          <h2>Health &amp; appointments</h2>
          {health.length === 0 ? <p className="muted small">No health notes on this day.</p> : health.map((h, n) => (
            <p key={n} className="notice soft-rose">{h.data.summary}{h.data.report && <> · <a href={h.data.report} target="_blank" rel="noreferrer">report</a></>}</p>
          ))}
          {appts.map((a) => (
            <div key={a.id} className="notice soft-gray row"><span className="bold" style={{ width: 90 }}>{fmtDay(a.date, { month: 'short', day: 'numeric' })}</span><span className="grow">{a.title}{a.time ? `, ${fmtTime(a.time)}` : ''}{a.place ? ` · ${a.place}` : ''}</span></div>
          ))}
          <h3 style={{ fontSize: 15 }}>Reports</h3>
          <ReportList reports={reports} />
          <ReportUpload />
        </section>

        <section className="card stack col-narrow">
          <div className="row-between"><h2>Learning</h2><Link href="/admin/plan#goals" className="small bold" style={{ color: 'var(--indigo)' }}>Manage goals</Link></div>
          {goals.length === 0 ? <p className="muted small">No learning goals yet.</p> : goals.map((g) => {
            const pct = Math.min(100, Math.round((g.done / Math.max(g.total, 1)) * 100));
            return (
              <div key={g.id} className="stack-sm">
                <div className="row-between small"><span className="bold">{g.name}</span><span className="muted">{g.done} of {g.total} sessions{g.target ? ` · ${g.target}` : ''}</span></div>
                <div className="progress"><div style={{ width: `${pct}%`, background: 'var(--indigo)' }} /></div>
              </div>
            );
          })}
          <h3 style={{ fontSize: 15, marginTop: 6 }}>Learning coach (AI)</h3>
          <LearningCoach compact />
        </section>
      </div>
    </>
  );
}
