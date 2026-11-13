import Link from 'next/link';
import { names } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtDay, today } from '@/lib/time';
import TodayList from './TodayList';
import SickCard from './SickCard';
import { logout } from '../actions';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: process.env.APP_TIMEZONE || 'America/New_York', hour: '2-digit', hour12: false }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default async function HerToday({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const day = today();
  const sql = await db();
  const items = await sql`SELECT id, time, title, category, status, actual_time, note FROM plan_items WHERE day = ${day} ORDER BY time, id`;
  const status = (await sql`SELECT sick FROM day_status WHERE day = ${day}`)[0];
  const done = items.filter((i) => i.status === 'done' || i.status === 'changed').length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <>
      <div className="row-between" style={{ alignItems: 'flex-end' }}>
        <div className="stack-sm">
          <span className="muted small">{fmtDay(day)}</span>
          <h1>{greeting()}, {names.her}</h1>
        </div>
        <form action={logout}><button className="btn btn-ghost small" type="submit">Sign out</button></form>
      </div>

      {saved && <p className="notice soft-green" role="status">Saved ✓</p>}

      {items.length > 0 && (
        <div className="stack-sm">
          <div className="row-between"><span className="small bold">{done} of {items.length} planned done</span><span style={{ fontFamily: 'var(--display)', fontWeight: 800, color: 'var(--rose)', fontSize: 20 }}>{pct}%</span></div>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      <SickCard sick={!!status?.sick} />

      <div className="row-between">
        <h2>Today&apos;s plan</h2>
        <Link href="/me/plans" className="btn small">+ Add plan</Link>
      </div>

      {items.length === 0
        ? <p className="empty">No plan for today yet. You can still log what you do from the Log tab.</p>
        : <TodayList items={items.map((i) => ({ id: i.id, time: i.time, title: i.title, status: i.status, actual: i.actual_time ?? '', note: i.note ?? '' }))} />}
    </>
  );
}
