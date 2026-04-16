import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAuthenticatedClient } from '@/lib/auth';

async function verifyQuestionOwnership(client: any, questionId: number, userId: string): Promise<boolean> {
  const { data } = await client
    .from('questions')
    .select('id, cards!inner(topics!inner(user_id))')
    .eq('id', questionId)
    .single();

  return !!(data && (data as any).cards?.topics?.user_id === userId);
}

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
    const questionIdNum = parseInt(id);

    // 验证用户拥有该问题
    const isOwner = await verifyQuestionOwnership(client, questionIdNum, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: '问题不存在' }, { status: 404 });
    }

    const { data, error } = await client
      .from('questions')
      .select()
      .eq('id', questionIdNum)
      .single();

    if (error) throw new Error(`获取失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('获取Question失败:', error);
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
    const questionIdNum = parseInt(id);

    // 验证用户拥有该问题
    const isOwner = await verifyQuestionOwnership(client, questionIdNum, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: '问题不存在' }, { status: 404 });
    }

    const { error } = await client
      .from('questions')
      .delete()
      .eq('id', questionIdNum);

    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除Question失败:', error);
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
    const questionIdNum = parseInt(id);
    const body = await request.json();

    // 验证用户拥有该问题
    const isOwner = await verifyQuestionOwnership(client, questionIdNum, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: '问题不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (body.content !== undefined) updateData.content = body.content;
    if (body.audio_url !== undefined) updateData.audio_url = body.audio_url;
    if (body.english_transcript !== undefined) updateData.english_transcript = body.english_transcript;
    if (body.chinese_translation !== undefined) updateData.chinese_translation = body.chinese_translation;
    if (body.sentences !== undefined) updateData.sentences = body.sentences;
    if (body.note !== undefined) updateData.note = body.note;

    const { data, error } = await client
      .from('questions')
      .update(updateData)
      .eq('id', questionIdNum)
      .select()
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('更新Question失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
