import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAuthenticatedClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { client, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();

    // 验证用户拥有该卡片（通过 topic）
    const { data: card } = await client
      .from('cards')
      .select('id, topics!inner(user_id)')
      .eq('id', body.card_id)
      .single();

    const topicUserId = (card as any)?.topics?.user_id;
    if (!card || topicUserId !== user.id) {
      return NextResponse.json({ success: false, error: '卡片不存在' }, { status: 404 });
    }

    const { data, error } = await client
      .from('questions')
      .insert({
        card_id: body.card_id,
        content: body.content,
        order: body.order || 1
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('创建Question失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { client, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cardId = searchParams.get('cardId');

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: '缺少cardId参数' },
        { status: 400 }
      );
    }

    // 验证用户拥有该卡片（通过 topic）
    const { data: card } = await client
      .from('cards')
      .select('id, topics!inner(user_id)')
      .eq('id', parseInt(cardId))
      .single();

    const topicUserId = (card as any)?.topics?.user_id;
    if (!card || topicUserId !== user.id) {
      return NextResponse.json({ success: false, error: '卡片不存在' }, { status: 404 });
    }

    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('card_id', parseInt(cardId))
      .order('order', { ascending: true });

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('获取Question列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
