'use client';
import { useActionState } from 'react';
import { askLearningCoach } from '@/app/actions';

export default function CoachButton({ hasReview }: { hasReview: boolean }) {
  const [error, action, pending] = useActionState(askLearningCoach, null);
  return (
    <form action={action} className="stack-sm">
      <button type="submit" className="btn btn-indigo" disabled={pending}>
        {pending ? 'Coach is reviewing… (about 30 s)' : hasReview ? 'Ask the coach again' : 'Ask the learning coach'}
      </button>
      {error && <p role="alert" className="notice soft-rose small">{error}</p>}
    </form>
  );
}
