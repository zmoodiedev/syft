import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COMING_SOON = process.env.COMING_SOON === 'true';

export function middleware(request: NextRequest) {
  if (!COMING_SOON) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Pass through: the splash page itself, static files, and API routes
  if (
    pathname === '/coming-soon' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    /\.(?:ico|png|jpg|jpeg|svg|webp|gif|txt|xml|webmanifest)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/coming-soon', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
