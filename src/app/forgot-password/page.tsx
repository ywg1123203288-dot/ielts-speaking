'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '发送失败');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-macaron-mint/20 via-background to-macaron-lavender/20 p-4">
        <Card className="w-full max-w-md border-0 bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">查收邮件</CardTitle>
            <CardDescription>重置密码链接已发送到你的邮箱</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>请登录邮箱，点击链接重置密码。</p>
            <p className="mt-2">如果没有收到邮件，请检查垃圾邮件文件夹。</p>
            <Link href="/login">
              <Button className="mt-4 rounded-xl" variant="outline">
                返回登录
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-macaron-mint/20 via-background to-macaron-lavender/20 p-4">
      <Card className="w-full max-w-md border-0 bg-card/80 backdrop-blur-sm shadow-xl rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">忘记密码</CardTitle>
          <CardDescription>输入你的邮箱，我们会发送重置密码链接</CardDescription>
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

            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? '发送中...' : '发送重置链接'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-muted-foreground hover:underline">
              返回登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
