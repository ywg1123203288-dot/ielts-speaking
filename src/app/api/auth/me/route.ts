import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/auth';

export async function GET() {
  try {
    const { user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json({ success: true, data: { user: null } });
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
