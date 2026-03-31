import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { updates } = body; // [{ id: 1, order: 1 }, { id: 2, order: 2 }, ...]

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: '无效的更新数据' },
        { status: 400 }
      );
    }

    // 批量更新每个卡片的顺序
    for (const update of updates) {
      const { error } = await client
        .from('cards')
        .update({ order: update.order })
        .eq('id', update.id);
      
      if (error) {
        console.error('更新卡片顺序失败:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('卡片排序失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
