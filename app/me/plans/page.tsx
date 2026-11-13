import { names } from '@/lib/auth';
import { db } from '@/lib/db';
import { today } from '@/lib/time';
import { PlanForm, PlanList } from '@/components/Plans';
import { Goals } from '@/components/Goals';
import LearningCoach from '@/components/LearningCoach';

export default async function MyPlans() {
  const sql = await db();
  const goals = await sql`SELECT g.*, (SELECT count(*)::int FROM logs l WHERE l.kind = 'study' AND l.data->>'goalId' = g.id::text) AS done FROM goals g ORDER BY g.id`;
  const plans = await sql`SELECT * FROM plans WHERE date >= ${today()} ORDER BY date, time NULLS LAST, id`;
  return (
    <>
      <div className="stack-sm">
        <h1>My plans</h1>
        <p className="muted small">Add anything coming up — {names.admin} sees it on his side.</p>
      </div>
      <PlanForm defaultDate={today()} />
      <h2>Coming up</h2>
      <PlanList plans={plans} me="her" partnerName={names.admin} empty="Nothing planned yet." />
      <h2 style={{ marginTop: 8 }}>What I&apos;m learning</h2>
      <section className="card stack">
        <h3 style={{ fontSize: 15 }}>Learning coach (AI)</h3>
        <LearningCoach />
      </section>
      <section className="card"><Goals goals={goals} me="her" partnerName={names.admin} /></section>
    </>
  );
}
