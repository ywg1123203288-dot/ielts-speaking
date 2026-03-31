import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const topicIdNum = parseInt(id);
    
    // 1. 查询话题
    const { data: topicData, error: topicError } = await client
      .from('topics')
      .select('*')
      .eq('id', topicIdNum)
      .single();
    
    if (topicError) throw new Error(`查询话题失败: ${topicError.message}`);
    
    // 2. 查询卡片
    const { data: cardsData, error: cardsError } = await client
      .from('cards')
      .select('*')
      .eq('topic_id', topicIdNum)
      .order('order', { ascending: true });
    
    if (cardsError) throw new Error(`查询卡片失败: ${cardsError.message}`);
    
    // 3. 一次性查询所有问题（如果有卡片的话）
    let questionsData: any[] = [];
    if (cardsData && cardsData.length > 0) {
      const cardIds = cardsData.map(c => c.id);
      const { data: qData, error: qError } = await client
        .from('questions')
        .select('*')
        .in('card_id', cardIds)
        .order('order', { ascending: true });
      
      if (!qError && qData) {
        questionsData = qData;
      }
    }
    
    // 4. 在内存中分组问题到对应卡片
    const questionsByCardId = new Map<number, any[]>();
    questionsData.forEach(q => {
      const list = questionsByCardId.get(q.card_id) || [];
      list.push(q);
      questionsByCardId.set(q.card_id, list);
    });
    
    // 5. 组装卡片数据
    const cardsWithQuestions = (cardsData || []).map(card => ({
      ...card,
      questions: questionsByCardId.get(card.id) || [],
      question_count: questionsByCardId.get(card.id)?.length || 0
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: { ...topicData, cards: cardsWithQuestions }
    });
  } catch (error) {
    console.error('获取Topic详情失败:', error);
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
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.order !== undefined) updateData.order = body.order;
    
    const { data, error } = await client
      .from('topics')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();
    
    if (error) throw new Error(`更新失败: ${error.message}`);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('更新Topic失败:', error);
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
    const client = getSupabaseClient();
    const { id } = await params;
    
    const { error } = await client
      .from('topics')
      .delete()
      .eq('id', parseInt(id));
    
    if (error) throw new Error(`删除失败: ${error.message}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除Topic失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
