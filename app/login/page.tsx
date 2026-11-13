import LoginForm from './LoginForm';
import { Heart } from '@/components/Icons';

export default function LoginPage() {
  return (
    <div className="phone">
      <main className="phone-main" style={{ paddingTop: 64, gap: 28 }}>
        <div className="stack">
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--rose)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={28} />
          </div>
          <h1 style={{ fontSize: 32 }}>Our Days</h1>
          <p className="muted" style={{ fontSize: 16, lineHeight: 1.5 }}>One place for plans, meals, sleep, health and learning — for the two of us.</p>
        </div>
        <LoginForm />
      </main>
    </div>
  );
}
