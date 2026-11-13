'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Reloads the page data every few seconds while something (like the AI) is still working. */
export default function AutoRefresh({ active, every = 5000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [active, every, router]);
  return null;
}
