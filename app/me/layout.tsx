import { requirePage } from '@/lib/auth';
import TabBar from './TabBar';

export const dynamic = 'force-dynamic';

export default async function HerLayout({ children }: { children: React.ReactNode }) {
  await requirePage('her');
  return (
    <div className="phone">
      <main className="phone-main">{children}</main>
      <TabBar />
    </div>
  );
}
