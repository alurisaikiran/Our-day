'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SideNav() {
  const path = usePathname();
  const link = (href: string, label: string) => {
    const active = href === '/admin' ? path === '/admin' : path.startsWith(href);
    return <Link href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>{label}</Link>;
  };
  return <>{link('/admin', 'Dashboard')}{link('/admin/plan', 'Plan her day')}</>;
}
