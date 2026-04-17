import { NextResponse } from 'next/server';
import { createSupabaseBrowserClient } from '@/lib/auth';

export async function POST() {
  try {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
