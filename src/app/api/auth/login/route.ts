import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseBrowserClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '请提供邮箱和密码' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseBrowserClient();

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
