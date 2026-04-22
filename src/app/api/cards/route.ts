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
        )
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
      part_id: card.topics?.part_id
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