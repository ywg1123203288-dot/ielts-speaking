import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    
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
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const cardId = searchParams.get('cardId');
    
    if (!cardId) {
      return NextResponse.json(
        { success: false, error: '缺少cardId参数' },
        { status: 400 }
      );
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
