import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAuthenticatedClient } from '@/lib/auth';

export async function GET(
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

    // 获取卡片信息
    const { data: card, error: cardError } = await client
      .from('cards')
      .select('*, topics!inner(part_id, name, user_id)')
      .eq('id', cardIdNum)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ success: false, error: '卡片不存在' }, { status: 404 });
    }

    // 验证用户权限
    const topicUserId = (card as any)?.topics?.user_id;
    if (topicUserId !== user.id) {
      return NextResponse.json({ success: false, error: '卡片不存在' }, { status: 404 });
    }

    // 获取该卡片的所有问题
    const { data: questions, error: questionsError } = await client
      .from('questions')
      .select('*')
      .eq('card_id', cardIdNum)
      .order('order', { ascending: true });

    if (questionsError) throw new Error(`查询问题失败: ${questionsError.message}`);

    return NextResponse.json({
      success: true,
      data: {
        ...card,
        part_id: (card as any).topics?.part_id,
        topic_name: (card as any).topics?.name,
        questions: questions || []
      }
    });
  } catch (error) {
    console.error('获取Card详情失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

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

    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.hints !== undefined) updateData.hints = body.hints;

      const { data, error } = await client
        .from('cards')
        .update(updateData)
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
