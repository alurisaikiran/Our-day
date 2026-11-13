import { db } from '@/lib/db';
import { names } from '@/lib/auth';
import { nowHM, today } from '@/lib/time';
import LogForm from './LogForm';

const TYPES = ['meal', 'sleep', 'health', 'study', 'activity'];

export default async function LogPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const sql = await db();
  const goals = await sql`SELECT id, name FROM goals ORDER BY id`;
  return (
    <>
      <h1>What did you do?</h1>
      <LogForm
        initialType={type && TYPES.includes(type) ? type : 'meal'}
        goals={goals.map((g) => ({ id: g.id, name: g.name }))}
        partner={names.admin}
        day={today()}
        now={nowHM()}
      />
    </>
  );
}
