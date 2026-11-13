'use client';
import { useActionState } from 'react';
import { login } from '../actions';

export default function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="stack" style={{ gap: 16 }}>
      <div className="stack-sm">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div className="stack-sm">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      {error && <p role="alert" className="notice soft-rose">{error}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
