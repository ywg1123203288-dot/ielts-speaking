import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('parts')
      .select('*')
      .order('order', { ascending: true });
    
    if (error) throw new Error(`查询失败: ${error.message}`);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('获取Part列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
