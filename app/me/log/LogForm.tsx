'use client';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { addLog } from '../../actions';

const TYPES: [string, string][] = [['meal', 'Meal'], ['sleep', 'Sleep'], ['health', 'Health'], ['study', 'Study'], ['activity', 'Activity']];
const FEELINGS = ['Good', 'Tired', 'Headache', 'Cramps', 'Fever', 'Cold', 'Stomach ache', 'Stressed'];

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary btn-block" disabled={pending}>{pending ? 'Saving…' : `Save ${label}`}</button>;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="stack-sm"><label htmlFor={id}>{label}</label>{children}</div>;
}

export default function LogForm({ initialType, goals, partner, day, now }: { initialType: string; goals: { id: number; name: string }[]; partner: string; day: string; now: string }) {
  const [type, setType] = useState(initialType);
  const [shared, setShared] = useState(true);
  const [rested, setRested] = useState(0);
  const [goal, setGoal] = useState(goals[0] ? String(goals[0].id) : 'new');
  const label = TYPES.find((t) => t[0] === type)![1].toLowerCase();

  return (
    <form action={addLog} className="stack" style={{ gap: 14 }}>
      <input type="hidden" name="kind" value={type} />
      <input type="hidden" name="day" value={day} />
      {shared && <input type="hidden" name="shared" value="on" />}

      <div className="chip-group" role="group" aria-label="What are you logging?">
        {TYPES.map(([v, l]) => (
          <button key={v} type="button" className="chip" aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>
        ))}
      </div>

      <div className="card stack" style={{ gap: 14 }}>
        {type === 'meal' && (<>
          <div className="grid2">
            <Field id="meal" label="Meal">
              <select id="meal" name="meal" className="input"><option>Breakfast</option><option>Lunch</option><option>Snack</option><option>Dinner</option></select>
            </Field>
            <Field id="time" label="Time"><input id="time" name="time" type="time" defaultValue={now} className="input" /></Field>
          </div>
          <Field id="what" label="What did you eat?"><input id="what" name="what" type="text" placeholder="e.g. rice, dal, salad" className="input" /></Field>
          <Field id="water" label="Glasses of water so far today"><input id="water" name="water" type="number" min={0} max={20} inputMode="numeric" className="input" /></Field>
        </>)}

        {type === 'sleep' && (<>
          <div className="grid2">
            <Field id="bed" label="Went to bed"><input id="bed" name="bed" type="time" required defaultValue="23:00" className="input" /></Field>
            <Field id="wake" label="Woke up"><input id="wake" name="wake" type="time" required defaultValue="07:00" className="input" /></Field>
          </div>
          <input type="hidden" name="rested" value={rested || ''} />
          <span className="label">How rested do you feel?</span>
          <div className="row" style={{ gap: 6 }} role="group" aria-label="How rested, 1 to 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className="chip grow" style={{ justifyContent: 'center' }} aria-pressed={rested === n} onClick={() => setRested(n)}>{n}</button>
            ))}
          </div>
        </>)}

        {type === 'health' && (<>
          <span className="label">How are you feeling?</span>
          <div className="chip-group">
            {FEELINGS.map((f) => (
              <label key={f} className="radio-chip"><input type="checkbox" name="feeling" value={f} /><span>{f}</span></label>
            ))}
          </div>
          <Field id="other" label="Anything else?"><input id="other" name="other" type="text" placeholder="Describe how you feel" className="input" /></Field>
          <div className="grid2">
            <Field id="medicine" label="Medicine taken"><input id="medicine" name="medicine" type="text" placeholder="e.g. Vitamin D" className="input" /></Field>
            <Field id="weight" label="Weight (kg)"><input id="weight" name="weight" type="number" step="0.1" inputMode="decimal" className="input" /></Field>
          </div>
          <Field id="report" label="Health report (PDF or photo, optional)">
            <input id="report" name="report" type="file" accept="application/pdf,image/*" className="input" style={{ paddingTop: 10 }} />
          </Field>
        </>)}

        {type === 'study' && (<>
          <Field id="goalId" label="Learning goal">
            <select id="goalId" name="goalId" className="input" value={goal} onChange={(e) => setGoal(e.target.value)}>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              <option value="new">+ Something new I&apos;m learning</option>
              <option value="">Just a one-off</option>
            </select>
          </Field>
          {goal === 'new' && (
            <Field id="newGoal" label="What are you starting to learn?"><input id="newGoal" name="newGoal" required maxLength={80} placeholder="e.g. Guitar, Spanish, Excel" className="input" /></Field>
          )}
          <Field id="topic" label="What did you learn?"><input id="topic" name="topic" type="text" placeholder="e.g. loops and lists" className="input" /></Field>
          <div className="grid2">
            <Field id="from" label="From"><input id="from" name="from" type="time" className="input" /></Field>
            <Field id="to" label="To"><input id="to" name="to" type="time" defaultValue={now} className="input" /></Field>
          </div>
          <Field id="notes" label="Notes"><textarea id="notes" name="notes" rows={3} placeholder="What clicked, what was hard" className="input" /></Field>
        </>)}

        {type === 'activity' && (<>
          <Field id="awhat" label="What did you do?"><input id="awhat" name="what" type="text" required placeholder="e.g. walk, work, shopping, call with mom" className="input" /></Field>
          <div className="grid2">
            <Field id="afrom" label="From"><input id="afrom" name="from" type="time" className="input" /></Field>
            <Field id="ato" label="To"><input id="ato" name="to" type="time" defaultValue={now} className="input" /></Field>
          </div>
        </>)}
      </div>

      <div className="card-tight row">
        <div className="grow stack-sm" style={{ gap: 2 }}>
          <span className="bold" style={{ fontSize: 14 }}>Share with {partner}</span>
          <span className="tiny muted">Turn off to keep this entry private</span>
        </div>
        <button type="button" role="switch" aria-checked={shared} aria-label={`Share this entry with ${partner}`} className="switch" onClick={() => setShared(!shared)}><span /></button>
      </div>

      <Save label={label} />
    </form>
  );
}
