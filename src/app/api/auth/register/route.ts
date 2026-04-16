import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { generateInviteCode } from '@/lib/auth';

const SUPABASE_COOKIE_NAME = 'sb-access-token';

export async function POST(request: NextRequest) {
  try {
    const { email, password, inviteCode } = await request.json();

    if (!email || !password || !inviteCode) {
      return NextResponse.json(
        { success: false, error: '请提供邮箱、密码和邀请码' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少需要6个字符' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 验证邀请码
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.toUpperCase())
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { success: false, error: '邀请码无效' },
        { status: 400 }
      );
    }

    if (!invite.is_active) {
      return NextResponse.json(
        { success: false, error: '邀请码已失效' },
        { status: 400 }
      );
    }

    if (invite.current_uses >= invite.max_uses) {
      return NextResponse.json(
        { success: false, error: '邀请码已用完' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已注册
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '该邮箱已注册' },
        { status: 400 }
      );
    }

    // 创建用户（Supabase Auth）
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: authError?.message || '注册失败' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 创建用户 profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        subscription_status: 'free', // 默认免费用户
      });

    if (profileError) {
      // 如果 profile 创建失败，删除 auth 用户
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { success: false, error: '创建用户资料失败' },
        { status: 500 }
      );
    }

    // 更新邀请码使用次数
    await supabase
      .from('invite_codes')
      .update({
        used_by: userId,
        used_at: new Date().toISOString(),
        current_uses: invite.current_uses + 1,
      })
      .eq('id', invite.id);

    // 如果邀请码用完了，自动生成新的邀请码给邀请人
    if (invite.used_by && invite.current_uses + 1 >= invite.max_uses) {
      const newCode = generateInviteCode();
      await supabase
        .from('invite_codes')
        .insert({
          code: newCode,
          used_by: invite.used_by,
          max_uses: 3, // 新邀请码允许3次使用
          is_active: true,
        });
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
          email,
          subscriptionStatus: 'free',
          expiresAt: null,
        },
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
