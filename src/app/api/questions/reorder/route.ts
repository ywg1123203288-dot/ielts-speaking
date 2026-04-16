import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAuthenticatedClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { client: authClient, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body as { updates: Array<{ id: number; order: number }> };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: '无效的更新数据' },
        { status: 400 }
      );
    }

    // 验证用户拥有所有这些问题
    const questionIds = updates.map(u => u.id);
    const { data: questions } = await authClient
      .from('questions')
      .select('id, cards!inner(topics!inner(user_id))')
      .in('id', questionIds);

    const invalidQuestions = questions?.filter(
      (q: any) => q.cards?.topics?.user_id !== user.id
    );

    if (invalidQuestions && invalidQuestions.length > 0) {
      return NextResponse.json(
        { success: false, error: '无权修改这些问题' },
        { status: 403 }
      );
    }

    // 批量更新顺序
    for (const update of updates) {
      const { error } = await authClient
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
