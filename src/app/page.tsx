'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Part, CardWithQuestions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Headphones, Plus, MessageCircle, Trash2, Settings, Search, X } from 'lucide-react';

export default function Home() {
  const [parts, setParts] = useState<Part[]>([]);
  const [cards, setCards] = useState<CardWithQuestions[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 获取Part列表
  useEffect(() => {
    const savedPartId = localStorage.getItem('selectedPartId');

    fetch('/api/parts')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setParts(result.data);
          if (result.data.length > 0) {
            const parsedId = savedPartId ? parseInt(savedPartId) : null;
            const exists = result.data.find((p: Part) => p.id === parsedId);
            setSelectedPartId(exists ? parsedId : result.data[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 保存选择的 Part 到 localStorage
  useEffect(() => {
    if (selectedPartId) {
      localStorage.setItem('selectedPartId', selectedPartId.toString());
    }
  }, [selectedPartId]);

  // 获取所有卡片
  const fetchCards = () => {
    setCardsLoading(true);
    let url = '/api/cards';
    const params = new URLSearchParams();
    if (selectedPartId) params.append('partId', selectedPartId.toString());
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (params.toString()) url += '?' + params.toString();

    fetch(url)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setCards(result.data);
        }
      })
      .catch(console.error)
      .finally(() => setCardsLoading(false));
  };

  useEffect(() => {
    fetchCards();
  }, [selectedPartId, searchQuery]);

  const handleCreateCard = async () => {
    if (!newCardTitle.trim()) {
      alert('请输入卡片标题');
      return;
    }
    if (!selectedPartId) {
      alert('请先选择一个Part');
      return;
    }

    try {
      // 先创建一个默认 Topic（如果该 Part 下没有的话）
      // 或者直接让用户选择 Topic - 为了简化，我们先检查是否有 topic，没有就创建一个
      const topicRes = await fetch(`/api/topics?partId=${selectedPartId}`);
      const topicData = await topicRes.json();
      let topicId;

      if (topicData.success && topicData.data && topicData.data.length > 0) {
        topicId = topicData.data[0].id;
      } else {
        // 创建一个新 topic
        const createTopicRes = await fetch('/api/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            part_id: selectedPartId,
            name: parts.find(p => p.id === selectedPartId)?.name || '默认话题',
            order: 1
          })
        });
        const createTopicData = await createTopicRes.json();
        if (createTopicData.success && createTopicData.data) {
          topicId = createTopicData.data.id;
        } else {
          alert('创建卡片失败：无法创建话题');
          return;
        }
      }

      // 创建卡片
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topicId,
          title: newCardTitle.trim()
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        setNewCardTitle('');
        setShowNewCard(false);
        fetchCards();
      } else {
        alert('创建失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('创建卡片失败:', error);
      alert('创建卡片失败，请查看控制台');
    }
  };

  // 删除卡片
  const handleDeleteCard = async (cardId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('确定要删除这个卡片吗？')) return;

    try {
      const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setCards(cards.filter(c => c.id !== cardId));
      } else {
        alert('删除失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('删除卡片失败:', error);
      alert('删除卡片失败');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="decoration-blob decoration-blob-pink w-96 h-96 -top-48 -left-48" />
        <div className="decoration-blob decoration-blob-mint w-96 h-96 -bottom-48 -right-48" />
        <div className="decoration-blob decoration-blob-lavender w-64 h-64 top-1/3 right-1/4" />

        <aside className="w-64 border-r border-border bg-sidebar/50 backdrop-blur-sm relative z-10 p-6">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-auto relative z-10 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="border-0 bg-card/80 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                <Skeleton className="h-2 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-1/2 rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
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
              <div className="flex-1">
                <h1 className="font-semibold text-foreground">IELTS Study</h1>
                <p className="text-xs text-muted-foreground">雅思口语素材库</p>
              </div>
              <Link href="/settings" className="p-2 hover:bg-accent rounded-lg transition-colors">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Part 导航 */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedPartId(null)}
                className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                  selectedPartId === null
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">全部</span>
                </div>
              </button>
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
                      {cards.filter(c => c.part_id === part.id).length}
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
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {selectedPartId
                  ? parts.find(p => p.id === selectedPartId)?.name
                  : '全部卡片'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {cards.length} 个卡片
              </p>
            </div>
            <Button
              onClick={() => setShowNewCard(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增卡片
            </Button>
          </div>

          {/* 搜索栏 */}
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索卡片标题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-12 pr-10 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* 新增卡片对话框 */}
          {showNewCard && (
            <Card className="mb-6 border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="输入卡片标题，如 Describe a song that is meaningful to you..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    className="flex-1 rounded-xl border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCard();
                      }
                    }}
                  />
                  <Button onClick={handleCreateCard} className="rounded-xl">
                    创建
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewCard(false);
                      setNewCardTitle('');
                    }}
                    className="rounded-xl"
                  >
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 卡片网格 */}
          {cardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="border-0 bg-card/80 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                  <Skeleton className="h-2 w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-1/2 rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-medium text-muted-foreground mb-2">
                {searchQuery ? '没有找到匹配的卡片' : '还没有卡片'}
              </h3>
              <p className="text-sm text-muted-foreground/80">
                {searchQuery ? '试试其他搜索词' : '点击右上角"新增卡片"按钮创建你的第一个卡片'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map(card => (
                <div key={card.id} className="relative group">
                  <Link href={`/cards/${card.id}`}>
                    <Card className="cursor-pointer border-0 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-macaron-pink via-macaron-mint to-macaron-lavender" />
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {card.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                            {parts.find(p => p.id === card.part_id)?.name || '未知'}
                          </span>
                          <span>
                            {card.questions?.length || 0} 个问题
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => handleDeleteCard(card.id, e)}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-background/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="删除卡片"
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