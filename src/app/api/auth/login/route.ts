import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SUPABASE_COOKIE_NAME = 'sb-access-token';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '请提供邮箱和密码' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: authError?.message || '登录失败' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // 获取用户 profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, expires_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: '获取用户信息失败' },
        { status: 500 }
      );
    }

    // 检查用户状态
    if (profile.subscription_status === 'banned') {
      return NextResponse.json(
        { success: false, error: '账号已被禁用' },
        { status: 403 }
      );
    }

    // 设置 cookie
    if (authData.session?.access_token) {
      const cookieStore = await cookies();
      cookieStore.set(SUPABASE_COOKIE_NAME, authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7天
        path: '/',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userId,
          email: authData.user.email,
          subscriptionStatus: profile.subscription_status,
          expiresAt: profile.expires_at,
        },
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
