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

    // 验证用户拥有该 topic
    const { data: topic } = await client
      .from('topics')
      .select('id')
      .eq('id', body.topic_id)
      .eq('user_id', user.id)
      .single();

    if (!topic) {
      return NextResponse.json({ success: false, error: '话题不存在' }, { status: 404 });
    }

    const { data, error } = await client
      .from('cards')
      .insert({
        topic_id: body.topic_id,
        title: body.title,
        order: body.order || 1
      })
      .select()
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('创建Card失败:', error);
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
    const topicId = searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json(
        { success: false, error: '缺少topicId参数' },
        { status: 400 }
      );
    }

    // 验证用户拥有该 topic
    const { data: topic } = await client
      .from('topics')
      .select('id')
      .eq('id', parseInt(topicId))
      .eq('user_id', user.id)
      .single();

    if (!topic) {
      return NextResponse.json({ success: false, error: '话题不存在' }, { status: 404 });
    }

    const { data, error } = await client
      .from('cards')
      .select(`
        *,
        questions(*)
      `)
      .eq('topic_id', parseInt(topicId))
      .order('order', { ascending: true });

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('获取Card列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
