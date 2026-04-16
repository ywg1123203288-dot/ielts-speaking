import { cookies } from 'next/headers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_COOKIE_NAME = 'sb-access-token';

export interface User {
  id: string;
  email: string;
  subscriptionStatus: 'free' | 'active' | 'expired' | 'banned';
  expiresAt: string | null;
}

// 获取带用户认证的 Supabase 客户端
export async function getAuthenticatedClient(): Promise<{ client: SupabaseClient; user: User | null }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPABASE_COOKIE_NAME)?.value;

  if (!token) {
    return { client: createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), user: null };
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 验证 token 并获取用户信息
  const { data: { user: authUser }, error } = await client.auth.getUser(token);

  if (error || !authUser) {
    return { client, user: null };
  }

  // 获取用户 profile
  const { data: profile } = await client
    .from('profiles')
    .select('subscription_status, expires_at')
    .eq('id', authUser.id)
    .single();

  const user: User = {
    id: authUser.id,
    email: authUser.email || '',
    subscriptionStatus: (profile?.subscription_status as User['subscriptionStatus']) || 'free',
    expiresAt: profile?.expires_at || null,
  };

  return { client, user };
}

// 检查订阅是否有效
export function isSubscriptionValid(user: User | null): boolean {
  if (!user) return false;
  if (user.subscriptionStatus === 'banned') return false;
  if (user.subscriptionStatus === 'active') return true;
  if (user.subscriptionStatus === 'free') return true; // free 用户始终有效
  if (user.subscriptionStatus === 'expired') {
    // 检查是否在宽限期（7天）内
    if (user.expiresAt) {
      const expiryDate = new Date(user.expiresAt);
      const now = new Date();
      const daysSinceExpiry = (now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceExpiry <= 7; // 7天宽限期
    }
    return false;
  }
  return false;
}

// 生成邀请码
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆的字符
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
