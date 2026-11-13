import AiText from '@/components/AiText';
import CoachButton from '@/components/CoachButton';
import { db } from '@/lib/db';
import { aiEnabled } from '@/lib/ai';
import { fmtStamp } from '@/lib/time';

/** Latest learning-coach review + a button to ask for a fresh one. */
export default async function LearningCoach({ compact = false }: { compact?: boolean }) {
  const sql = await db();
  const latest = (await sql`SELECT content, created_at, requested_by FROM ai_reviews WHERE kind = 'learning' ORDER BY created_at DESC LIMIT 1`)[0];
  const on = aiEnabled();
  return (
    <div className="stack" style={{ gap: 10 }}>
      {latest ? (
        <details open={!compact} className="notice soft-indigo" style={{ color: 'var(--ink)' }}>
          <summary className="small bold" style={{ cursor: 'pointer', color: 'var(--indigo-dark)' }}>
            Coach review · {fmtStamp(latest.created_at)}{latest.requested_by === 'schedule' ? ' (weekly)' : ''}
          </summary>
          <div style={{ marginTop: 8 }}><AiText text={latest.content} /></div>
        </details>
      ) : (
        <p className="small muted">{on ? 'No review yet. The coach looks at goals and study logs and suggests next steps.' : 'The AI learning coach is off. Add ANTHROPIC_API_KEY in Vercel to turn it on.'}</p>
      )}
      {on && <CoachButton hasReview={!!latest} />}
    </div>
  );
}
