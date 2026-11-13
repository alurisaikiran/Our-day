import { addGoal, deleteGoal } from '@/app/actions';
import { X } from '@/components/Icons';
import type { Row } from '@/lib/db';

/** Learning goals with progress, plus a form to add one. Used on both sides. */
export function Goals({ goals, me, partnerName }: { goals: Row[]; me: 'her' | 'admin'; partnerName: string }) {
  return (
    <div className="stack">
      {goals.length === 0 && <p className="muted small">No learning goals yet.</p>}
      {goals.map((g) => {
        const pct = Math.min(100, Math.round(((g.done ?? 0) / Math.max(g.total, 1)) * 100));
        return (
          <div key={g.id} className="stack-sm">
            <div className="row">
              <span className="grow bold small">{g.name}</span>
              <span className="tiny muted">{g.done ?? 0}/{g.total}{g.target ? ` · ${g.target}` : ''} · by {g.added_by === me ? 'you' : partnerName}</span>
              <form action={deleteGoal.bind(null, g.id)}>
                <button type="submit" className="icon-btn" style={{ background: 'transparent', width: 36, height: 36 }} aria-label={`Delete goal ${g.name}`}><X size={16} /></button>
              </form>
            </div>
            <div className="progress"><div style={{ width: `${pct}%`, background: 'var(--indigo)' }} /></div>
          </div>
        );
      })}
      <form action={addGoal} className="stack" style={{ gap: 10, marginTop: 6 }}>
        <div className="stack-sm"><label htmlFor="gname">New thing to learn</label><input id="gname" name="name" required maxLength={80} placeholder="e.g. Python basics, guitar" className="input" /></div>
        <div className="grid2">
          <div className="stack-sm"><label htmlFor="gtarget">How often</label><input id="gtarget" name="target" maxLength={60} placeholder="e.g. 1 h / day" className="input" /></div>
          <div className="stack-sm"><label htmlFor="gtotal">Sessions</label><input id="gtotal" name="total" type="number" min={1} max={500} defaultValue={10} className="input" /></div>
        </div>
        <button type="submit" className="btn">+ Add learning goal</button>
      </form>
    </div>
  );
}

