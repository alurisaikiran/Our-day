import { NextResponse } from 'next/server';
import { aiEnabled, runLearningReview } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Called by Vercel Cron every Sunday (see vercel.json). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!aiEnabled()) return NextResponse.json({ ok: false, reason: 'AI is off' });
  try {
    await runLearningReview('schedule');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: e instanceof Error ? e.message : 'failed' });
  }
}
