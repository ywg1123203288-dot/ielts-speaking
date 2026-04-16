import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedClient, generateInviteCode } from '@/lib/auth';

// 生成邀请码
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${request.headers.get('cookie')?.match(/sb-access-token=([^;]+)/)?.[1] || ''}` },
        },
      }
    );

    // 检查用户是否已有激活的邀请码
    // 生成新邀请码
    const code = generateInviteCode();

    const { data, error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        used_by: user.id,
        max_uses: 3, // 每个用户初始有3次邀请机会
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('生成邀请码错误:', error);
      return NextResponse.json(
        { success: false, error: '生成邀请码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { code: data.code },
    });
  } catch (error) {
    console.error('生成邀请码错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 获取用户的邀请码列表
export async function GET() {
  try {
    const { user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('used_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取邀请码列表错误:', error);
      return NextResponse.json(
        { success: false, error: '获取邀请码列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { codes: data },
    });
  } catch (error) {
    console.error('获取邀请码列表错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
