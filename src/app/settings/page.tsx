'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ADMIN_ID = 'feb9db84-a40b-44a1-9ce8-77c43f79bdd4'; // 管理员ID

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(result => {
        if (result.data?.user) {
          setUser(result.data.user);
          if (result.data.user.id === ADMIN_ID) {
            fetchInviteCodes();
          }
        } else {
          router.push('/login');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchInviteCodes = () => {
    fetch('/api/auth/invite-codes')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setInviteCodes(result.data?.codes || []);
        }
      });
  };

  const generateCode = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/auth/invite-codes', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert(`新邀请码: ${result.data.code}`);
        fetchInviteCodes();
      } else {
        alert(result.error || '生成失败');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-8">加载中...</div>;
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.id === ADMIN_ID;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">账号设置</h1>

        {/* 用户信息 */}
        <Card>
          <CardHeader>
            <CardTitle>账号信息</CardTitle>
            <CardDescription>当前登录账号</CardDescription>
          </CardHeader>
          <CardContent>
            <p><strong>邮箱：</strong>{user.email}</p>
            <p><strong>订阅状态：</strong>{user.subscriptionStatus}</p>
          </CardContent>
        </Card>

        {/* 邀请码管理 - 只有管理员能看到 */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>邀请码管理</CardTitle>
              <CardDescription>生成邀请码给你的朋友</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateCode} disabled={generating}>
                {generating ? '生成中...' : '生成新邀请码'}
              </Button>

              {inviteCodes.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="font-medium">已有的邀请码：</p>
                  {inviteCodes.map((code: any) => (
                    <div key={code.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-mono font-bold text-lg">{code.code}</span>
                      <span className="text-sm text-muted-foreground">
                        剩余 {code.max_uses - code.current_uses} / {code.max_uses} 次
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">还没有邀请码，点击上方按钮生成</p>
              )}
            </CardContent>
          </Card>
        )}

        {!isAdmin && (
          <Card>
            <CardContent>
              <p className="text-muted-foreground">普通用户无法生成邀请码</p>
            </CardContent>
          </Card>
        )}

        {/* 登出 */}
        <Card>
          <CardContent>
            <Button variant="outline" onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/login');
              router.refresh();
            }}>
              退出登录
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
