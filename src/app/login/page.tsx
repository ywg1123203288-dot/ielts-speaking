'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '登录失败');
        setLoading(false);
        return;
      }

      // 登录成功，跳转到首页
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('网络错误，请重试');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-macaron-mint/20 via-background to-macaron-lavender/20 p-4">
      <Card className="w-full max-w-md border-0 bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">登录</CardTitle>
          <CardDescription>登录到 IELTS Speaking 练习</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                邮箱
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                密码
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">还没有账号？</span>
            <Link href="/register" className="text-primary hover:underline ml-1">
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
