import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body as { updates: Array<{ id: number; order: number }> };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: '无效的更新数据' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 批量更新顺序
    for (const update of updates) {
      const { error } = await client
        .from('questions')
        .update({ order: update.order })
        .eq('id', update.id);
      
      if (error) {
        console.error(`更新问题 ${update.id} 顺序失败:`, error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新顺序失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
