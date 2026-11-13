'use client';
import Link from 'next/link';
import { useTransition } from 'react';
import { setSick } from '../actions';
import { Thermo } from '@/components/Icons';

export default function SickCard({ sick }: { sick: boolean }) {
  const [pending, start] = useTransition();
  if (!sick) {
    return (
      <button type="button" className="btn btn-block" disabled={pending} onClick={() => start(() => setSick(true))}
        style={{ borderColor: '#F2C6D3', color: 'var(--rose-dark)', fontSize: 15 }}>
        <Thermo size={18} /> Not feeling well today?
      </button>
    );
  }
  return (
    <div className="card soft-rose stack" style={{ gap: 8 }}>
      <strong>Marked as a sick day — he can see this</strong>
      <p className="small" style={{ lineHeight: 1.4 }}>Skip or move anything you can&apos;t do. Rest is part of the plan today.</p>
      <div className="row">
        <Link href="/me/log?type=health" className="btn btn-primary grow">Add symptoms</Link>
        <button type="button" className="btn grow" disabled={pending} onClick={() => start(() => setSick(false))}>I&apos;m OK now</button>
      </div>
    </div>
  );
}
