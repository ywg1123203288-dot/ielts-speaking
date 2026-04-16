import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SUPABASE_COOKIE_NAME = 'sb-access-token';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SUPABASE_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
