import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要登录才能访问的路径
const PROTECTED_PATHS = ['/', '/topics'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是受保护的路径
  const isProtectedPath = PROTECTED_PATHS.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // 检查是否有登录 cookie
  const token = request.cookies.get('sb-access-token')?.value;

  if (!token) {
    // 未登录，重定向到登录页
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - /api (API 路由)
     * - /login (登录页)
     * - /register (注册页)
     * - /_next (Next.js 内部)
     * - /favicon.ico, etc.
     */
    '/((?!api|login|register|_next|favicon.ico).*)',
  ],
};
