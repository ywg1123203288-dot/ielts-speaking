import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const partId = searchParams.get('partId');
    
    let query = client
      .from('topics')
      .select(`
        *,
        cards(count)
      `)
      .order('order', { ascending: true });
    
    if (partId) {
      query = query.eq('part_id', parseInt(partId));
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    // 转换数据格式，添加 card_count
    const topicsWithCount = data?.map(topic => ({
      ...topic,
      card_count: topic.cards?.[0]?.count || 0
    }));
    
    return NextResponse.json({ success: true, data: topicsWithCount });
  } catch (error) {
    console.error('获取Topic列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    
    const { data, error } = await client
      .from('topics')
      .insert({
        part_id: body.part_id,
        name: body.name,
        order: body.order || 1
      })
      .select()
      .single();
    
    if (error) throw new Error(`创建失败: ${error.message}`);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('创建Topic失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
