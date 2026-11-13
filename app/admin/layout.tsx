import { requirePage } from '@/lib/auth';
import { logout } from '../actions';
import { Heart } from '@/components/Icons';
import SideNav from './SideNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePage('admin');
  return (
    <div className="admin">
      <aside className="side">
        <div className="row brand" style={{ padding: '0 8px 18px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart size={18} /></div>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18 }}>Our Days</span>
        </div>
        <SideNav />
        <form action={logout} style={{ marginTop: 'auto' }}><button type="submit" className="logout">Sign out</button></form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
