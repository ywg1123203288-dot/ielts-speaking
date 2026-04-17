import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要登录才能访问的路径
const PROTECTED_PATHS = ['/', '/topics', '/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是受保护的路径
  const isProtectedPath = PROTECTED_PATHS.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // 创建 Supabase SSR 客户端
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 验证用户会话
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // 未登录，重定向到登录页
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - /api (API 路由)
     * - /login (登录页)
     * /register (注册页)
     * - /_next (Next.js 内部)
     * - /favicon.ico, etc.
     */
    '/((?!api|login|register|_next|favicon.ico).*)',
  ],
};
