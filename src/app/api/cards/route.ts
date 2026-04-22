import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAuthenticatedClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { client, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const partId = searchParams.get('partId');
    const search = searchParams.get('search');

    // 直接查询 cards，通过 topic 关联获取 part_id 和 topic 名称
    let query = client
      .from('cards')
      .select(`
        *,
        topics!inner(
          id,
          name,
          part_id
        ),
        questions(count)
      `)
      .eq('topics.user_id', user.id)
      .order('created_at', { ascending: false });

    if (partId) {
      query = query.eq('topics.part_id', parseInt(partId));
    }

    const { data, error } = await query;

    if (error) throw new Error(`查询失败: ${error.message}`);

    // 转换数据格式，添加 topic_name 和 part_id
    const cardsWithInfo = data?.map(card => ({
      id: card.id,
      topic_id: card.topic_id,
      title: card.title,
      description: card.description,
      hints: card.hints,
      order: card.order,
      created_at: card.created_at,
      updated_at: card.updated_at,
      topic_name: card.topics?.name,
      part_id: card.topics?.part_id,
      questions: card.questions?.[0]?.count || 0
    })) || [];

    // 如果有搜索关键词，进行过滤
    let filteredCards = cardsWithInfo;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredCards = cardsWithInfo.filter(card =>
        card.title.toLowerCase().includes(searchLower) ||
        card.description?.toLowerCase().includes(searchLower) ||
        card.topic_name?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ success: true, data: filteredCards });
  } catch (error) {
    console.error('获取Cards列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

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
        description: body.description || null,
        hints: body.hints || null,
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