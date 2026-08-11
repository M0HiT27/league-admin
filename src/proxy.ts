// proxy.ts
import { NextRequest, NextResponse } from 'next/server';

export default function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie exists — let the request through.
  // Do NOT verify against a DB here; that belongs in a client component
  // that calls the backend and handles an invalid/expired session.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};