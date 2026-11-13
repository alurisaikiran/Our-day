import Link from 'next/link';
import { names } from '@/lib/auth';
import { db } from '@/lib/db';
import { addDays, fmtDay, fmtTime, isDay, today } from '@/lib/time';
import { addPlanItem, copyPlan, deletePlanItem } from '../../actions';
import { Goals } from '@/components/Goals';
import LearningCoach from '@/components/LearningCoach';
import { X } from '@/components/Icons';
import { PlanForm, PlanList } from '@/components/Plans';

const CATS = ['Meal', 'Sleep', 'Study', 'Health', 'Activity', 'Work'];
const tone: Record<string, string> = { Meal: 'soft-rose', Sleep: 'soft-indigo', Study: 'soft-amber', Health: 'soft-green', Activity: 'soft-gray', Work: 'soft-indigo' };

export default async function PlanDay({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const sp = await searchParams;
  const now = today();
  const day = isDay(sp.day) ? sp.day : addDays(now, 1);
  const sql = await db();
  const [items, goals, plans] = await Promise.all([
    sql`SELECT * FROM plan_items WHERE day = ${day} ORDER BY time, id`,
    sql`SELECT g.*, (SELECT count(*)::int FROM logs l WHERE l.kind = 'study' AND l.shared AND l.data->>'goalId' = g.id::text) AS done FROM goals g ORDER BY g.id`,
    sql`SELECT * FROM plans WHERE date >= ${now} ORDER BY date, time NULLS LAST, id`,
  ]);
  const source = day === now ? addDays(now, -1) : now;

  return (
    <>
      <div className="row-between" style={{ alignItems: 'flex-end' }}>
        <div className="stack-sm">
          <span className="muted small">Planning for</span>
          <h1 style={{ fontSize: 30 }}>{fmtDay(day)}</h1>
        </div>
        <div className="row wrap">
          <Link href={`/admin/plan?day=${addDays(day, -1)}`} className="btn">← Prev day</Link>
          <Link href={`/admin/plan?day=${addDays(day, 1)}`} className="btn">Next day →</Link>
          {items.length === 0 && (
            <form action={copyPlan}>
              <input type="hidden" name="from" value={source} /><input type="hidden" name="to" value={day} />
              <button type="submit" className="btn">Copy from {source === now ? 'today' : 'yesterday'}</button>
            </form>
          )}
        </div>
      </div>
      <p className="notice soft-indigo small">She sees this plan on her Today screen on that day. Changes save straight away.</p>

      <div className="cols">
        <section className="card stack col-wide">
          <h2>Schedule ({items.length} {items.length === 1 ? 'block' : 'blocks'})</h2>
          <form action={addPlanItem} className="row wrap" style={{ alignItems: 'flex-end', background: 'var(--ground)', padding: 14, borderRadius: 14 }}>
            <input type="hidden" name="day" value={day} />
            <div className="stack-sm" style={{ width: 130 }}><label htmlFor="it">Time</label><input id="it" name="time" type="time" required className="input" /></div>
            <div className="stack-sm grow" style={{ minWidth: 200 }}><label htmlFor="ititle">What should she do?</label><input id="ititle" name="title" required maxLength={120} placeholder="e.g. Study English 45 min" className="input" /></div>
            <div className="stack-sm" style={{ width: 140 }}><label htmlFor="icat">Type</label>
              <select id="icat" name="category" className="input">{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <button type="submit" className="btn btn-dark">Add block</button>
          </form>
          {items.length === 0 ? <p className="empty">No blocks yet. Add the first one above.</p> : (
            <div className="stack" style={{ gap: 8 }}>
              {items.map((i) => (
                <div key={i.id} className="row" style={{ padding: '6px 6px 6px 12px', border: '1px solid #ECEEF4', borderRadius: 12 }}>
                  <span className="bold small" style={{ width: 72 }}>{fmtTime(i.time)}</span>
                  <span className={`badge ${tone[i.category] || 'soft-gray'}`} style={{ width: 72, textAlign: 'center' }}>{i.category}</span>
                  <span className="grow bold">{i.title}</span>
                  {i.status !== 'todo' && <span className="tiny muted">{i.status}</span>}
                  <form action={deletePlanItem.bind(null, i.id)}>
                    <button type="submit" className="icon-btn" style={{ background: 'transparent' }} aria-label={`Remove ${i.title}`}><X size={18} /></button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card stack col-narrow" id="goals">
          <h2>What to learn</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Goals show up in her Study log. She can add her own too. Each study session she logs counts toward a goal.</p>
          <LearningCoach compact />
          <Goals goals={goals} me="admin" partnerName={names.her === 'love' ? 'her' : names.her} />
        </section>
      </div>

      <div className="cols">
        <section className="stack col-narrow">
          <h2>Add a future plan or appointment</h2>
          <PlanForm defaultDate={now} />
        </section>
        <section className="stack col-wide">
          <h2>Coming up (both of you)</h2>
          <PlanList plans={plans} me="admin" partnerName={names.her === 'love' ? 'her' : names.her} empty="Nothing planned yet." />
        </section>
      </div>
    </>
  );
}
