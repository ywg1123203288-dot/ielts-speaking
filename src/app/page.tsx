'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Part, TopicWithCards } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, Plus, MessageCircle, Trash2 } from 'lucide-react';

export default function Home() {
  const [parts, setParts] = useState<Part[]>([]);
  const [topics, setTopics] = useState<TopicWithCards[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  // 获取Part列表
  useEffect(() => {
    fetch('/api/parts')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setParts(result.data);
          if (result.data.length > 0) {
            setSelectedPartId(result.data[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 获取话题列表
  const fetchTopics = () => {
    if (selectedPartId) {
      fetch(`/api/topics?partId=${selectedPartId}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            setTopics(result.data);
          }
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [selectedPartId]);

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) {
      alert('请输入话题名称');
      return;
    }
    if (!selectedPartId) {
      alert('请先选择一个Part');
      return;
    }

    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_id: selectedPartId,
          name: newTopicName.trim(),
          order: topics.length + 1
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        setNewTopicName('');
        setShowNewTopic(false);
        // 刷新话题列表
        fetchTopics();
      } else {
        alert('创建失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('创建话题失败:', error);
      alert('创建话题失败，请查看控制台');
    }
  };

  // 删除话题
  const handleDeleteTopic = async (topicId: number, e: React.MouseEvent) => {
    e.preventDefault(); // 阻止跳转
    e.stopPropagation(); // 阻止事件冒泡

    try {
      const response = await fetch(`/api/topics/${topicId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setTopics(topics.filter(t => t.id !== topicId));
      } else {
        alert('删除失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('删除话题失败:', error);
      alert('删除话题失败');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 装饰性背景元素 */}
      <div className="decoration-blob decoration-blob-pink w-96 h-96 -top-48 -left-48" />
      <div className="decoration-blob decoration-blob-mint w-96 h-96 -bottom-48 -right-48" />
      <div className="decoration-blob decoration-blob-lavender w-64 h-64 top-1/3 right-1/4" />

      {/* 左侧导航栏 */}
      <aside className="w-64 border-r border-border bg-sidebar/50 backdrop-blur-sm relative z-10">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-border p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-macaron-pink to-macaron-lavender">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">IELTS Study</h1>
                <p className="text-xs text-muted-foreground">雅思口语素材库</p>
              </div>
            </div>
          </div>

          {/* Part 导航 */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              {parts.map(part => (
                <button
                  key={part.id}
                  onClick={() => setSelectedPartId(part.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                    selectedPartId === part.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{part.name}</span>
                    <span className={`text-sm ${
                      selectedPartId === part.id
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    }`}>
                      {topics.filter(t => t.part_id === part.id).length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 底部说明 */}
          <div className="border-t border-border p-4">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                💡 所有数据保存在云端，可随时访问
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="flex-1 overflow-auto relative z-10">
        <div className="container mx-auto p-8">
          {/* 标题栏 */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {parts.find(p => p.id === selectedPartId)?.name || '话题列表'}
              </h2>
              <p className="text-muted-foreground mt-1">
                管理你的雅思口语话题卡片
              </p>
            </div>
            <Button
              onClick={() => setShowNewTopic(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增话题
            </Button>
          </div>

          {/* 新增话题对话框 */}
          {showNewTopic && (
            <Card className="mb-6 border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="输入话题名称，如 Music、Hometown..."
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    className="flex-1 rounded-xl border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTopic()}
                  />
                  <Button onClick={handleCreateTopic} className="rounded-xl">
                    创建
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewTopic(false);
                      setNewTopicName('');
                    }}
                    className="rounded-xl"
                  >
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 话题卡片网格 */}
          {topics.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-medium text-muted-foreground mb-2">
                还没有话题
              </h3>
              <p className="text-sm text-muted-foreground/80">
                点击右上角"新增话题"按钮创建你的第一个话题
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map(topic => (
                <div key={topic.id} className="relative group">
                  <Link href={`/topics/${topic.id}`}>
                    <Card className="cursor-pointer border-0 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-macaron-pink via-macaron-mint to-macaron-lavender" />
                      <CardHeader>
                        <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                          {topic.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <MessageCircle className="h-4 w-4 text-primary" />
                          </div>
                          <span>{topic.card_count || 0} 张卡片</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => handleDeleteTopic(topic.id, e)}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-background/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="删除话题"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
