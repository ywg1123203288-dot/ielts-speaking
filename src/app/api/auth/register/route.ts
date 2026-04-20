import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, generateInviteCode } from '@/lib/auth';

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

    const supabase = await createSupabaseServerClient();

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
        subscription_status: 'free',
      });

    if (profileError) {
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
          max_uses: 3,
          is_active: true,
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
