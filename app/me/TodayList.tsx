'use client';
import { useState, useTransition } from 'react';
import { markDone, updatePlanItem } from '../actions';
import { Check, Pencil } from '@/components/Icons';

type Item = { id: number; time: string; title: string; status: string; actual: string; note: string };

function fmt(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function statusLine(i: Item) {
  const extra = i.note ? ` · ${i.note}` : '';
  if (i.status === 'done') return { text: `Done at ${fmt(i.actual || i.time)}${extra}`, color: 'var(--green-dark)' };
  if (i.status === 'changed') return { text: `Moved to ${fmt(i.actual)}${extra}`, color: 'var(--indigo-dark)' };
  if (i.status === 'skipped') return { text: `Skipped${extra}`, color: 'var(--amber-dark)' };
  return { text: 'Not yet', color: 'var(--muted)' };
}

const choices: [string, string][] = [['done', 'On time'], ['changed', 'Different time'], ['skipped', 'Skipped']];

export default function TodayList({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState({ status: 'done', time: '', note: '' });
  const [pending, start] = useTransition();

  function edit(i: Item) {
    if (open === i.id) return setOpen(null);
    setOpen(i.id);
    setDraft({ status: i.status === 'todo' ? 'done' : i.status, time: i.actual || i.time, note: i.note });
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {items.map((i) => {
        const line = statusLine(i);
        const finished = i.status !== 'todo';
        const isOpen = open === i.id;
        return (
          <div key={i.id} className="plan-item">
            <div className="row">
              <span style={{ width: 62, flexShrink: 0 }} className="small bold muted">{fmt(i.time)}</span>
              <div className="grow stack-sm" style={{ gap: 2 }}>
                <span className="bold" style={{ fontSize: 15 }}>{i.title}</span>
                <span className="tiny" style={{ color: line.color, fontWeight: 500 }}>{line.text}</span>
              </div>
              <button type="button" className="icon-btn" aria-label={`Edit ${i.title}`} aria-expanded={isOpen} onClick={() => edit(i)}
                style={{ background: isOpen ? 'var(--indigo-soft)' : undefined }}><Pencil size={18} /></button>
              <button type="button" disabled={pending} className={`check ${i.status === 'skipped' ? 'skipped' : finished ? 'done' : ''}`}
                aria-label={finished ? `Mark ${i.title} not done` : `Mark ${i.title} done`}
                onClick={() => start(() => markDone(i.id, !finished))}><Check size={18} /></button>
            </div>
            {isOpen && (
              <div className="stack" style={{ borderTop: '1px solid #ECEEF4', paddingTop: 12, gap: 10 }}>
                <span className="small bold">What actually happened?</span>
                <div className="row" style={{ gap: 6 }}>
                  {choices.map(([v, label]) => (
                    <button key={v} type="button" className="chip grow" style={{ justifyContent: 'center', padding: '0 6px', fontSize: 13 }}
                      aria-pressed={draft.status === v} onClick={() => setDraft({ ...draft, status: v })}>{label}</button>
                  ))}
                </div>
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  {draft.status !== 'skipped' && (
                    <div className="stack-sm" style={{ width: 120 }}>
                      <label htmlFor={`t${i.id}`} className="tiny">Actual time</label>
                      <input id={`t${i.id}`} type="time" className="input" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
                    </div>
                  )}
                  <div className="stack-sm grow">
                    <label htmlFor={`n${i.id}`} className="tiny">Note (optional)</label>
                    <input id={`n${i.id}`} type="text" className="input" placeholder="e.g. woke up late, headache" maxLength={200}
                      value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                  </div>
                </div>
                <button type="button" className="btn btn-primary" disabled={pending}
                  onClick={() => start(async () => { await updatePlanItem(i.id, draft.status, draft.time, draft.note); setOpen(null); })}>
                  {pending ? 'Saving…' : 'Save change'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
