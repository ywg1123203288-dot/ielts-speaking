import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAuthenticatedClient } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const cardIdNum = parseInt(id);

    // 验证用户拥有该卡片（通过 topic）
    const { data: card } = await client
      .from('cards')
      .select('id, topics!inner(user_id)')
      .eq('id', cardIdNum)
      .single();

    const topicUserId = (card as any)?.topics?.user_id;
    if (!card || topicUserId !== user.id) {
      return NextResponse.json({ success: false, error: '卡片不存在' }, { status: 404 });
    }

    const { error } = await client
      .from('cards')
      .delete()
      .eq('id', cardIdNum);

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除Card失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const cardIdNum = parseInt(id);
    const body = await request.json();

    // 验证用户拥有该卡片（通过 topic）
    const { data: card } = await client
      .from('cards')
      .select('id, topics!inner(user_id)')
      .eq('id', cardIdNum)
      .single();

    const topicUserId = (card as any)?.topics?.user_id;
    if (!card || topicUserId !== user.id) {
      return NextResponse.json({ success: false, error: '卡片不存在' }, { status: 404 });
    }

    const { data, error } = await client
      .from('cards')
      .update({
        title: body.title,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardIdNum)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('更新Card失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
