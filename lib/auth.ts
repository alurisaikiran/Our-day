import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type Role = 'admin' | 'her';

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s || 'dev-only-secret-change-me-dev-only-secret');
}

export async function signSession(role: Role) {
  return new SignJWT({ role }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Role | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === 'admin' || payload.role === 'her' ? payload.role : null;
  } catch {
    return null;
  }
}

export async function createSession(role: Role) {
  const token = await signSession(role);
  (await cookies()).set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  (await cookies()).delete('session');
}

export async function getRole(): Promise<Role | null> {
  return verifySession((await cookies()).get('session')?.value);
}

/** Use in pages/layouts: sends the visitor to /login if they are not this role. */
export async function requirePage(role: Role) {
  const r = await getRole();
  if (r !== role) redirect('/login');
  return r;
}

/** Use in server actions: throws if the caller is not one of the roles. */
export async function requireAction(...roles: Role[]): Promise<Role> {
  const r = await getRole();
  if (!r || !roles.includes(r)) throw new Error('Not allowed');
  return r;
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkCredentials(email: string, password: string): Role | null {
  const e = email.trim().toLowerCase();
  const pairs: [Role, string | undefined, string | undefined][] = [
    ['admin', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD],
    ['her', process.env.HER_EMAIL, process.env.HER_PASSWORD],
  ];
  for (const [role, em, pw] of pairs) {
    if (em && pw && same(e, em.trim().toLowerCase()) && same(password, pw)) return role;
  }
  return null;
}

export const names = {
  admin: process.env.ADMIN_NAME || 'Sai',
  her: process.env.HER_NAME || 'love',
};
