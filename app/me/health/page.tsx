import Link from 'next/link';
import { db } from '@/lib/db';
import { fmtDay, fmtStamp, fmtTime, today } from '@/lib/time';
import { ReportList, ReportUpload } from '@/components/Reports';

export default async function HerHealth() {
  const sql = await db();
  const day = today();
  const appts = await sql`SELECT * FROM plans WHERE category = 'Appointment' AND date >= ${day} ORDER BY date, time NULLS LAST LIMIT 10`;
  const logs = await sql`SELECT data, created_at, shared FROM logs WHERE kind = 'health' ORDER BY created_at DESC LIMIT 8`;
  const reports = await sql`SELECT * FROM reports ORDER BY uploaded_at DESC LIMIT 30`;

  return (
    <>
      <div className="row-between">
        <h1>Health</h1>
        <Link href="/me/log?type=health" className="btn btn-primary">+ Log how I feel</Link>
      </div>

      <section className="stack" style={{ gap: 10 }}>
        <div className="row-between"><h2>Appointments</h2><Link href="/me/plans" className="small bold">+ Add</Link></div>
        {appts.length === 0 ? <p className="empty">No upcoming appointments.</p> : appts.map((a) => (
          <div key={a.id} className="card-tight row">
            <div className="date-box soft-green">
              <span className="m">{fmtDay(a.date, { month: 'short' }).toUpperCase()}</span>
              <span className="d">{Number(a.date.slice(8))}</span>
            </div>
            <div className="grow stack-sm" style={{ gap: 3 }}>
              <span className="bold" style={{ fontSize: 15 }}>{a.title}</span>
              <span className="small muted">{a.time ? fmtTime(a.time) : 'Time not set'}{a.place ? ` · ${a.place}` : ''}</span>
              {a.date === day && <span className="tiny bold" style={{ color: 'var(--rose-dark)' }}>Today</span>}
            </div>
          </div>
        ))}
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <h2>Recent health notes</h2>
        {logs.length === 0 ? <p className="empty">Nothing logged yet.</p> : (
          <div className="card" style={{ padding: '4px 14px' }}>
            {logs.map((l, n) => (
              <div key={n} className="stack-sm" style={{ padding: '10px 0', borderTop: n ? '1px solid #ECEEF4' : 'none', gap: 2 }}>
                <span className="small bold">{l.data.summary}</span>
                <span className="tiny muted">{fmtStamp(l.created_at)}{l.shared ? '' : ' · private'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <h2>Reports</h2>
        <ReportUpload />
        <ReportList reports={reports} />
      </section>
    </>
  );
}
