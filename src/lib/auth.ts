import { createServerClient, createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface User {
  id: string;
  email: string;
  subscriptionStatus: 'free' | 'active' | 'expired' | 'banned';
  expiresAt: string | null;
}

// 创建服务端 Supabase 客户端
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}

// 获取当前用户
export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, expires_at')
    .eq('id', authUser.id)
    .single();

  return {
    id: authUser.id,
    email: authUser.email || '',
    subscriptionStatus: (profile?.subscription_status as User['subscriptionStatus']) || 'free',
    expiresAt: profile?.expires_at || null,
  };
}

// 获取带用户认证的 Supabase 客户端（兼容旧接口）
export async function getAuthenticatedClient(): Promise<{ client: Awaited<ReturnType<typeof createSupabaseServerClient>>; user: User | null }> {
  const supabase = await createSupabaseServerClient();
  const user = await getUser();
  return { client: supabase, user };
}

// 检查订阅是否有效
export function isSubscriptionValid(user: User | null): boolean {
  if (!user) return false;
  if (user.subscriptionStatus === 'banned') return false;
  if (user.subscriptionStatus === 'active') return true;
  if (user.subscriptionStatus === 'free') return true;
  if (user.subscriptionStatus === 'expired') {
    if (user.expiresAt) {
      const expiryDate = new Date(user.expiresAt);
      const now = new Date();
      const daysSinceExpiry = (now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceExpiry <= 7;
    }
    return false;
  }
  return false;
}

// 生成邀请码
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 创建浏览器 Supabase 客户端
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
