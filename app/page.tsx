import { redirect } from 'next/navigation';
import { getRole } from '@/lib/auth';

export default async function Home() {
  const role = await getRole();
  redirect(role === 'admin' ? '/admin' : role === 'her' ? '/me' : '/login');
}
