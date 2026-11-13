'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Plus, Pulse, Today } from '@/components/Icons';

const tabs = [
  { href: '/me', label: 'Today', Icon: Today },
  { href: '/me/log', label: 'Log', Icon: Plus },
  { href: '/me/plans', label: 'Plans', Icon: Calendar },
  { href: '/me/health', label: 'Health', Icon: Pulse },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ href, label, Icon }) => {
        const active = href === '/me' ? path === '/me' : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            <Icon />{label}
          </Link>
        );
      })}
    </nav>
  );
}
