import { addPlan, deletePlan } from '@/app/actions';
import { X } from '@/components/Icons';
import type { Row } from '@/lib/db';
import { fmtDay, fmtTime } from '@/lib/time';

const CATS = ['Appointment', 'Outing', 'Study', 'Work', 'Other'];
export const catTone: Record<string, string> = { Appointment: 'soft-green', Outing: 'soft-rose', Study: 'soft-amber', Work: 'soft-indigo', Other: 'soft-gray' };

export function PlanForm({ defaultDate }: { defaultDate: string }) {
  return (
    <form action={addPlan} className="card stack">
      <div className="stack-sm">
        <label htmlFor="ptitle">What&apos;s the plan?</label>
        <input id="ptitle" name="title" required maxLength={120} placeholder="e.g. Dinner with friends" className="input" />
      </div>
      <div className="grid2">
        <div className="stack-sm"><label htmlFor="pdate">Date</label><input id="pdate" name="date" type="date" required defaultValue={defaultDate} className="input" /></div>
        <div className="stack-sm"><label htmlFor="ptime">Time</label><input id="ptime" name="time" type="time" className="input" /></div>
      </div>
      <div className="stack-sm"><label htmlFor="pplace">Where (optional)</label><input id="pplace" name="place" maxLength={120} placeholder="e.g. clinic name, address" className="input" /></div>
      <span className="label">Type</span>
      <div className="chip-group">
        {CATS.map((c, n) => (
          <label key={c} className="radio-chip"><input type="radio" name="category" value={c} defaultChecked={n === 0} /><span>{c}</span></label>
        ))}
      </div>
      <button type="submit" className="btn btn-primary btn-block">Add plan</button>
    </form>
  );
}

export function PlanList({ plans, me, partnerName, empty }: { plans: Row[]; me: 'her' | 'admin'; partnerName: string; empty: string }) {
  if (!plans.length) return <p className="empty">{empty}</p>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {plans.map((p) => (
        <div key={p.id} className="card-tight row" style={{ paddingRight: 6 }}>
          <div className={`date-box ${catTone[p.category] || 'soft-gray'}`}>
            <span className="m">{fmtDay(p.date, { month: 'short' }).toUpperCase()}</span>
            <span className="d">{Number(p.date.slice(8))}</span>
          </div>
          <div className="grow stack-sm" style={{ gap: 3 }}>
            <span className="bold" style={{ fontSize: 15 }}>{p.title}</span>
            <span className="tiny muted">
              {fmtDay(p.date, { weekday: 'short' })}{p.time ? ` · ${fmtTime(p.time)}` : ''} · {p.category}{p.place ? ` · ${p.place}` : ''} · added by {p.added_by === me ? 'you' : partnerName}
            </span>
          </div>
          <form action={deletePlan.bind(null, p.id)}>
            <button type="submit" className="icon-btn" style={{ background: 'transparent' }} aria-label={`Remove ${p.title}`}><X size={18} /></button>
          </form>
        </div>
      ))}
    </div>
  );
}
