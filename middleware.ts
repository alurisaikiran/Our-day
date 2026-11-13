import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

async function roleOf(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  if (!token) return null;
  try {
    const s = process.env.AUTH_SECRET || 'dev-only-secret-change-me-dev-only-secret';
    const { payload } = await jwtVerify(token, new TextEncoder().encode(s));
    return payload.role as string;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await roleOf(req);
  const home = role === 'admin' ? '/admin' : role === 'her' ? '/me' : '/login';
  if (pathname === '/' || (pathname === '/login' && role)) return NextResponse.redirect(new URL(home, req.url));
  if (pathname.startsWith('/admin') && role !== 'admin') return NextResponse.redirect(new URL(home, req.url));
  if (pathname.startsWith('/me') && role !== 'her') return NextResponse.redirect(new URL(home, req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/', '/login', '/admin/:path*', '/me/:path*'] };
