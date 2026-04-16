'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Headphones,
  ChevronLeft,
  Plus,
  Trash2,
  MessageCircle,
  Upload,
  Play,
  Pause,
  FileText,
  Languages,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Check,
  X,
  Save,
  ChevronRight,
  StickyNote,
  Mic
} from 'lucide-react';
import { TopicWithCards, CardWithQuestions, Question, TimestampedSentence } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type TTSSegment = {
  id: number;
  text: string;
  start: number;
  end: number;
};

function buildTTSSegments(text: string): TTSSegment[] {
  const normalizedText = text.trim();
  if (!normalizedText) return [];

  const parts = normalizedText
    .split(/(?<=[.!?])\s+/)
    .map(segment => segment.trim())
    .filter(Boolean);

  if (parts.length === 0) return [];

  const totalChars = parts.reduce((sum, segment) => sum + segment.length, 0);
  const estimatedTotalDuration = Math.max(totalChars * 0.08, parts.length * 1.2);

  let currentStart = 0;

  return parts.map((segment, index) => {
    const duration = totalChars > 0
      ? (segment.length / totalChars) * estimatedTotalDuration
      : estimatedTotalDuration / parts.length;
    const start = Number(currentStart.toFixed(1));
    const end = Number((currentStart + duration).toFixed(1));
    currentStart += duration;

    return {
      id: index + 1,
      text: segment,
      start,
      end
    };
  });
}

export default function TopicPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<TopicWithCards | null>(null);
  const [cards, setCards] = useState<CardWithQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newQuestionCardId, setNewQuestionCardId] = useState<number | null>(null);
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  // 话题名称编辑状态
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  // 卡片名称编辑状态
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editCardTitle, setEditCardTitle] = useState('');

  // 精准更新单个 question，不触发全页刷新
  const updateQuestionInState = (updatedQuestion: Question) => {
    setCards(prevCards =>
      prevCards.map(card => {
        if (!card.questions) return card;
        const questionIndex = card.questions.findIndex(q => q.id === updatedQuestion.id);
        if (questionIndex === -1) return card;
        const newQuestions = [...card.questions];
        newQuestions[questionIndex] = updatedQuestion;
        return { ...card, questions: newQuestions };
      })
    );
  };

  // 精准删除单个 question，不触发全页刷新
  const deleteQuestionInState = (questionId: number) => {
    setCards(prevCards =>
      prevCards.map(card => {
        if (!card.questions) return card;
        return { ...card, questions: card.questions.filter(q => q.id !== questionId) };
      })
    );
  };

  // 获取话题详情
  const fetchTopicData = () => {
    if (topicId) {
      setLoading(true);
      fetch(`/api/topics/${topicId}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            setTopic(result.data);
            setCards(result.data.cards || []);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchTopicData();
  }, [topicId]);

  const toggleCard = (cardId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const handleCreateCard = async () => {
    if (!newCardTitle.trim()) {
      alert('请输入卡片标题');
      return;
    }

    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: parseInt(topicId),
          title: newCardTitle.trim(),
          order: cards.length + 1
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        setNewCardTitle('');
        setShowNewCard(false);
        fetchTopicData();
      } else {
        alert('创建失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('创建卡片失败:', error);
      alert('创建卡片失败，请查看控制台');
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    try {
      const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setCards(cards.filter(c => c.id !== cardId));
      }
    } catch (error) {
      console.error('删除卡片失败:', error);
    }
  };

  // 更新话题名称
  const handleUpdateTopicName = async () => {
    if (!editTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/topics/${topicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editTitle.trim() })
      });
      const result = await response.json();
      if (result.success && result.data) {
        setTopic({ ...topic!, name: result.data.name });
        setIsEditingTitle(false);
      } else {
        alert('更新失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('更新话题名称失败:', error);
      alert('更新失败');
    }
  };

  // 更新卡片名称
  const handleUpdateCardTitle = async (cardId: number) => {
    if (!editCardTitle.trim()) {
      setEditingCardId(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editCardTitle.trim() })
      });
      const result = await response.json();
      if (result.success) {
        setCards(cards.map(c => c.id === cardId ? { ...c, title: editCardTitle.trim() } : c));
        setEditingCardId(null);
      } else {
        alert('更新失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('更新卡片名称失败:', error);
      alert('更新失败');
    }
  };

  const handleAddQuestion = async (cardId: number, content: string) => {
    if (!content.trim()) {
      alert('请输入问题内容');
      return;
    }

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: cardId,
          content: content.trim(),
          order: (cards.find(c => c.id === cardId)?.questions?.length || 0) + 1
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        setNewQuestionCardId(null);
        setNewQuestionContent('');
        // 直接更新本地状态，不刷新整个页面
        setCards(prevCards =>
          prevCards.map(card => {
            if (card.id === cardId) {
              return {
                ...card,
                questions: [...(card.questions || []), result.data]
              };
            }
            return card;
          })
        );
        // 展开该卡片，显示新添加的问题
        setExpandedCards(prev => new Set(prev).add(cardId));
        // 展开该问题
        setExpandedQuestionId(result.data.id);
      } else {
        alert('添加问题失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('创建问题失败:', error);
      alert('创建问题失败，请查看控制台');
    }
  };

  // 拖拽传感器配置 - 必须在组件顶层定义
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖拽排序
  const handleDragEnd = async (event: DragEndEvent, cardId: number) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const card = cards.find(c => c.id === cardId);
      if (!card?.questions) return;

      const oldIndex = card.questions.findIndex((q: any) => q.id === active.id);
      const newIndex = card.questions.findIndex((q: any) => q.id === over.id);

      const newQuestions = arrayMove(card.questions, oldIndex, newIndex);
      
      // 更新本地状态
      setCards(cards.map(c => {
        if (c.id === cardId) {
          return { ...c, questions: newQuestions };
        }
        return c;
      }));

      // 更新数据库顺序
      const updates = newQuestions.map((q: any, index: number) => ({
        id: q.id,
        order: index + 1
      }));

      try {
        await fetch('/api/questions/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });
      } catch (error) {
        console.error('更新顺序失败:', error);
      }
    }
  };

  // 卡片拖拽排序
  const handleCardDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex(c => c.id === active.id);
      const newIndex = cards.findIndex(c => c.id === over.id);

      const newCards = arrayMove(cards, oldIndex, newIndex);
      
      // 更新本地状态
      setCards(newCards);

      // 更新数据库顺序
      const updates = newCards.map((c, index) => ({
        id: c.id,
        order: index + 1
      }));

      try {
        await fetch('/api/cards/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });
      } catch (error) {
        console.error('更新卡片顺序失败:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">话题不存在</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 装饰性背景元素 */}
      <div className="decoration-blob decoration-blob-mint w-96 h-96 -top-48 -right-48" />
      <div className="decoration-blob decoration-blob-lavender w-64 h-64 bottom-1/4 left-1/4" />

      <div className="flex-1 overflow-auto relative z-10">
        <div className="container mx-auto p-8 max-w-5xl">
          {/* 面包屑导航 */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              首页
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium">{topic.name}</span>
          </div>

          {/* 标题栏 */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-3xl font-bold bg-transparent border-b-2 border-primary focus:outline-none text-foreground"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTopicName();
                        if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                          setEditTitle(topic.name);
                        }
                      }}
                    />
                    <Button variant="ghost" size="icon" onClick={handleUpdateTopicName} className="text-green-600">
                      <Check className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setIsEditingTitle(false); setEditTitle(topic.name); }}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h2 className="text-3xl font-bold text-foreground">{topic.name}</h2>
                    <button
                      onClick={() => { setIsEditingTitle(true); setEditTitle(topic.name); }}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="text-muted-foreground mt-1">
                  {cards.length} 张卡片
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowNewCard(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增卡片
            </Button>
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
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCard()}
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

          {/* 卡片列表 */}
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-medium text-muted-foreground mb-2">
                还没有卡片
              </h3>
              <p className="text-sm text-muted-foreground/80">
                点击右上角"新增卡片"按钮创建你的第一张卡片
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCardDragEnd}
            >
              <SortableContext
                items={cards.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {cards.map(card => (
                    <SortableCard 
                      key={card.id}
                      card={card}
                      isExpanded={expandedCards.has(card.id)}
                      onToggleExpand={() => toggleCard(card.id)}
                      editingCardId={editingCardId}
                      editCardTitle={editCardTitle}
                      setEditCardTitle={setEditCardTitle}
                      setEditingCardId={setEditingCardId}
                      handleUpdateCardTitle={handleUpdateCardTitle}
                      handleDeleteCard={handleDeleteCard}
                    >
                      {/* 添加问题输入框 */}
                      {newQuestionCardId === card.id ? (
                        <div className="mb-4 space-y-2">
                          <textarea
                            placeholder="输入问题内容，如：Why is this song meaningful to you?"
                            value={newQuestionContent}
                            onChange={(e) => setNewQuestionContent(e.target.value)}
                            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAddQuestion(card.id, newQuestionContent)}
                              className="rounded-xl"
                            >
                              添加
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setNewQuestionCardId(null);
                                setNewQuestionContent('');
                              }}
                              className="rounded-xl"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setNewQuestionCardId(card.id)}
                          className="mb-4 rounded-xl w-full border-dashed border-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          添加问题
                        </Button>
                      )}

                      {/* 问题列表 - 可拖拽排序 */}
                      {card.questions && card.questions.length > 0 ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, card.id)}
                        >
                          <SortableContext
                            items={card.questions.map((q: any) => q.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {card.questions.map((question: any, index: number) => (
                                <SortableQuestionItem
                                  key={question.id}
                                  question={question}
                                  index={index}
                                  onQuestionUpdate={updateQuestionInState}
                                  onQuestionDelete={deleteQuestionInState}
                                  isExpanded={expandedQuestionId === question.id}
                                  onToggleExpand={() => {
                                    setExpandedQuestionId(
                                      expandedQuestionId === question.id ? null : question.id
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          点击上方按钮添加问题
                        </div>
                      )}
                    </SortableCard>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

// 可排序的卡片组件
function SortableCard({ 
  card,
  isExpanded,
  onToggleExpand,
  editingCardId,
  editCardTitle,
  setEditCardTitle,
  setEditingCardId,
  handleUpdateCardTitle,
  handleDeleteCard,
  children
}: { 
  card: CardWithQuestions;
  isExpanded: boolean;
  onToggleExpand: () => void;
  editingCardId: number | null;
  editCardTitle: string;
  setEditCardTitle: (title: string) => void;
  setEditingCardId: (id: number | null) => void;
  handleUpdateCardTitle: (id: number) => void;
  handleDeleteCard: (id: number) => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="border-0 bg-card/80 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
        {/* 卡片头部 */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-3 flex-1">
            {/* 拖拽手柄 */}
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-macaron-mint to-macaron-lavender">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            {/* 卡片标题 - 可编辑 */}
            {editingCardId === card.id ? (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={editCardTitle}
                  onChange={(e) => setEditCardTitle(e.target.value)}
                  className="font-semibold bg-transparent border-b-2 border-primary focus:outline-none text-foreground"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateCardTitle(card.id);
                    if (e.key === 'Escape') {
                      setEditingCardId(null);
                    }
                  }}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleUpdateCardTitle(card.id)} 
                  className="text-green-600 h-8 w-8"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setEditingCardId(null)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h3 className="font-semibold text-foreground">{card.title}</h3>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingCardId(card.id); 
                    setEditCardTitle(card.title); 
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCard(card.id);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* 卡片内容 */}
        {isExpanded && (
          <CardContent className="border-t border-border pt-4">
            {children}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// 可排序的问题项组件
function SortableQuestionItem({
  question,
  index,
  onQuestionUpdate,
  onQuestionDelete,
  isExpanded,
  onToggleExpand
}: {
  question: Question;
  index: number;
  onQuestionUpdate?: (question: Question) => void;
  onQuestionDelete?: (questionId: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionItem
        question={question}
        index={index}
        dragHandleProps={{ attributes, listeners }}
        onQuestionUpdate={onQuestionUpdate}
        onQuestionDelete={onQuestionDelete}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    </div>
  );
}

// 问题组件
function QuestionItem({
  question,
  index,
  dragHandleProps,
  onQuestionUpdate,
  onQuestionDelete,
  isExpanded,
  onToggleExpand
}: {
  question: Question;
  index: number;
  dragHandleProps?: { attributes: any; listeners: any };
  onQuestionUpdate?: (question: Question) => void;
  onQuestionDelete?: (questionId: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(question.audio_url || null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0.75);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(question.content || '');
  const [saved, setSaved] = useState(!!question.audio_url);
  const [editingSentenceIndex, setEditingSentenceIndex] = useState<number | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editSentenceText, setEditSentenceText] = useState('');
  const [note, setNote] = useState(question.note || '');
  const [showNote, setShowNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // TTS 相关状态
  const [mode, setMode] = useState<'tts' | 'stt'>('stt');
  const [ttsInput, setTtsInput] = useState('');
  const [ttsSegments, setTtsSegments] = useState<TTSSegment[]>([]);
  const [editingTTSSegmentId, setEditingTTSSegmentId] = useState<number | null>(null);
  const [editingTTSSegmentText, setEditingTTSSegmentText] = useState('');
  const [editingTTSSegmentStart, setEditingTTSSegmentStart] = useState('');
  const [editingTTSSegmentEnd, setEditingTTSSegmentEnd] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<'en_uk_male' | 'en_uk_female'>('en_uk_male');
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const questionId = question?.id;
  if (!questionId) {
    return <div className="text-destructive">问题数据错误</div>;
  }

  // 调试：打印句子数据
  useEffect(() => {
    if (question.sentences && question.sentences.length > 0) {
      console.log('问题', questionId, '句子数据:', question.sentences.map(s => ({
        text: s.text.substring(0, 30) + '...',
        start: s.start,
        end: s.end
      })));
    }
  }, [question.sentences, questionId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      // 重置播放状态
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      setSaved(false); // 新文件未保存
      
      // 获取音频时长
      const tempAudio = new Audio(url);
      tempAudio.addEventListener('loadedmetadata', async () => {
        const duration = tempAudio.duration;
        if (duration && !isNaN(duration)) {
          setAudioDuration(duration);
          console.log('获取到音频时长:', duration, '秒');
        }
      });
      
      // 自动保存音频到云端
      setIsSaving(true);
      try {
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('questionId', questionId.toString());

        const response = await fetch('/api/audio/save', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (result.success) {
          setSaved(true);
          console.log('音频自动保存成功');
        } else {
          setError('音频保存失败：' + (result.error || '未知错误'));
        }
      } catch (err) {
        console.error('自动保存失败:', err);
        setError('音频保存失败，请点击保存按钮重试');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 保存音频到云端
  const handleSaveAudio = async () => {
    if (!audioFile) {
      setError('请先上传音频文件');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('questionId', questionId.toString());

      const response = await fetch('/api/audio/save', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setSaved(true);
        console.log('音频保存成功');
      } else {
        setError(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存音频失败:', error);
      setError('保存失败，请查看控制台');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      setError('请先上传音频文件');
      return;
    }
    
    setIsTranscribing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('questionId', questionId.toString());
      
      // 传递音频时长
      if (audioDuration > 0) {
        formData.append('duration', audioDuration.toString());
        console.log('传递音频时长:', audioDuration, '秒');
      }

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setSaved(true);
        // 精准更新：重新获取该 question 的最新数据
        const qRes = await fetch(`/api/questions/${questionId}`);
        const qData = await qRes.json();
        if (qData.success && qData.data) {
          onQuestionUpdate?.(qData.data);
        }
      } else {
        setError(result.error || '转写失败');
      }
    } catch (error) {
      console.error('转写失败:', error);
      setError('转写失败，请查看控制台');
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    setTtsSegments(buildTTSSegments(ttsInput));
    if (!ttsInput.trim()) {
      setEditingTTSSegmentId(null);
      setEditingTTSSegmentText('');
    }
  }, [ttsInput]);

  const handleSelectTTSSegment = (segment: TTSSegment) => {
    setEditingTTSSegmentId(segment.id);
    setEditingTTSSegmentText(segment.text);
    setEditingTTSSegmentStart(segment.start.toFixed(1));
    setEditingTTSSegmentEnd(segment.end.toFixed(1));
  };

  const adjustTTSSegmentStart = (delta: number) => {
    const current = parseFloat(editingTTSSegmentStart) || 0;
    const newValue = Math.max(0, current + delta);
    setEditingTTSSegmentStart(newValue.toFixed(1));
  };

  const adjustTTSSegmentEnd = (delta: number) => {
    const current = parseFloat(editingTTSSegmentEnd) || 0;
    const newValue = Math.max(0, current + delta);
    setEditingTTSSegmentEnd(newValue.toFixed(1));
  };

  const handleSaveTTSSegment = () => {
    if (editingTTSSegmentId === null) return;

    const nextSegments = ttsSegments.map(segment =>
      segment.id === editingTTSSegmentId
        ? {
            ...segment,
            text: editingTTSSegmentText.trim() || segment.text,
            start: parseFloat(editingTTSSegmentStart) || segment.start,
            end: parseFloat(editingTTSSegmentEnd) || segment.end
          }
        : segment
    );

    setTtsSegments(nextSegments);
    setTtsInput(nextSegments.map(segment => segment.text).join(' '));
    setEditingTTSSegmentId(null);
    setEditingTTSSegmentText('');
    setEditingTTSSegmentStart('');
    setEditingTTSSegmentEnd('');
  };

  // 生成 TTS 音频
  const handleGenerateTTS = async () => {
    if (!ttsInput.trim()) {
      setError('请输入要转换的文字');
      return;
    }

    setIsGeneratingTTS(true);
    setError(null);
    try {
      // 1. 调用 TTS API 生成音频
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsInput,
          voice: selectedVoice
        })
      });

      const ttsResult = await ttsResponse.json();
      if (!ttsResult.success || !ttsResult.data?.audioUrl) {
        setError(ttsResult.error || 'TTS 生成失败');
        return;
      }

      const audioUrl = ttsResult.data.audioUrl;

      // 2. 保存音频 URL 到 question
      const saveResponse = await fetch(`/api/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: audioUrl })
      });

      if (!saveResponse.ok) {
        setError('保存音频 URL 失败');
        return;
      }

      // 3. 调用 ASR 获取精确时间戳
      const transcribeResponse = await fetch('/api/transcribe/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionId,
          audioUrl: audioUrl
        })
      });

      const transcribeResult = await transcribeResponse.json();
      if (!transcribeResult.success) {
        setError(transcribeResult.error || 'ASR 转写失败');
        return;
      }

      // 4. 更新本地状态：音频 + 句子数据
      setAudioUrl(audioUrl);
      setSaved(true);
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);

      // 5. 精准更新 question 数据（包含 sentences）
      const qRes = await fetch(`/api/questions/${questionId}`);
      const qData = await qRes.json();
      if (qData.success && qData.data) {
        onQuestionUpdate?.(qData.data);
      }
    } catch (error) {
      console.error('TTS 生成失败:', error);
      setError('生成失败，请查看控制台');
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const handleTranslate = async () => {
    if (!question.english_transcript) {
      setError('请先进行音频转写');
      return;
    }
    
    setIsTranslating(true);
    setError(null);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: question.english_transcript,
          questionId: questionId
        })
      });

      const result = await response.json();
      if (result.success) {
        // 精准更新：直接使用返回的翻译数据
        const updatedQuestion = {
          ...question,
          chinese_translation: result.data.translation
        };
        onQuestionUpdate?.(updatedQuestion);
      } else {
        setError(result.error || '翻译失败');
      }
    } catch (error) {
      console.error('翻译失败:', error);
      setError('翻译失败，请查看控制台');
    } finally {
      setIsTranslating(false);
    }
  };

  // 重新转写（使用已有音频URL）
  const handleRetryTranscribe = async () => {
    if (!audioUrl) {
      setError('没有可用的音频文件');
      return;
    }
    
    setIsTranscribing(true);
    setError(null);
    try {
      // 获取当前音频时长
      const audio = audioRef.current;
      const duration = audio?.duration && !isNaN(audio.duration) ? audio.duration : 0;
      
      console.log('重新转写，音频时长:', duration);

      const response = await fetch('/api/transcribe/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionId,
          audioDuration: duration
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('重新转写成功，句子数:', result.data.sentences?.length);
        // 精准更新：合并返回的数据
        const updatedQuestion = {
          ...question,
          english_transcript: result.data.text,
          sentences: result.data.sentences
        };
        onQuestionUpdate?.(updatedQuestion);
      } else {
        setError(result.error || '转写失败');
      }
    } catch (error) {
      console.error('重新转写失败:', error);
      setError('重新转写失败，请查看控制台');
    } finally {
      setIsTranscribing(false);
    }
  };

  // 音频元素初始化和事件监听
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };

    const handleTimeUpdate = () => {
      // 根据当前时间更新高亮句子
      if (question.sentences && question.sentences.length > 0) {
        const currentTime = audio.currentTime;
        const activeIndex = question.sentences.findIndex(
          (s, i) => {
            const nextStart = question.sentences![i + 1]?.start ?? Infinity;
            return currentTime >= s.start && currentTime < nextStart;
          }
        );
        setCurrentSentenceIndex(prev => prev !== activeIndex ? activeIndex : prev);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [question.sentences]);

  // 播放指定句子
  const playSentence = (sentence: TimestampedSentence, sentenceIndex: number) => {
    console.log('点击句子:', sentence.text.substring(0, 30), '开始时间:', sentence.start, '结束时间:', sentence.end);
    
    const audio = audioRef.current;
    if (!audio) {
      console.error('audioRef 未绑定！');
      return;
    }

    console.log('当前音频状态 - paused:', audio.paused, 'currentTime:', audio.currentTime);

    // 清除之前的句子结束检测定时器
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    // 优化：提前0.1秒开始，确保开头完整
    const startOffset = Math.max(0, sentence.start - 0.1);
    // 优化：延后0.05秒结束，避免截断
    const endOffset = sentence.end + 0.05;
    
    // 跳转到句子开始时间并播放
    audio.currentTime = startOffset;
    audio.playbackRate = playbackRate;
    
    console.log('设置 currentTime 为:', startOffset, '(原:', sentence.start, ')');
    
    audio.play().then(() => {
      if (isMountedRef.current) {
        console.log('开始播放');
      }
    }).catch((err) => {
      // 忽略 AbortError（组件卸载或音频被替换时发生）
      if (err.name !== 'AbortError') {
        console.error('播放失败:', err);
      }
    });
    
    setCurrentSentenceIndex(sentenceIndex);

    // 使用更高频率检测（每20ms），更精准地捕捉结束时间
    playbackIntervalRef.current = setInterval(() => {
      if (audio.currentTime >= endOffset) {
        audio.pause();
        clearInterval(playbackIntervalRef.current!);
        playbackIntervalRef.current = null;
        console.log('句子播放结束，暂停于:', audio.currentTime.toFixed(2));
      }
    }, 20); // 从50ms改为20ms，更精准
  };

  // 全局播放控制
  const toggleGlobalPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.playbackRate = playbackRate;
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('播放失败:', err);
        }
      });
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1.0, 1.25, 1.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // 开始编辑句子
  const startEditSentence = (index: number) => {
    if (question.sentences && question.sentences[index]) {
      const s = question.sentences[index];
      setEditingSentenceIndex(index);
      setEditStartTime(s.start.toFixed(1));
      setEditEndTime(s.end.toFixed(1));
      setEditSentenceText(s.text);
    }
  };

  const adjustSentenceSplitPoint = (delta: number) => {
    if (editingSentenceIndex === null || !question.sentences) return;

    const currentSentence = question.sentences[editingSentenceIndex];
    if (!currentSentence) return;

    const nextSentence = question.sentences[editingSentenceIndex + 1];
    const nextBoundary = nextSentence?.end ?? Infinity;
    const nextValue = (parseFloat(editEndTime) || currentSentence.end) + delta;
    const clampedValue = Math.min(Math.max(nextValue, currentSentence.start), nextBoundary);

    setEditEndTime(clampedValue.toFixed(1));
  };

  // 保存句子时间戳
  const saveSentenceTimestamp = async () => {
    if (editingSentenceIndex === null || !question.sentences) return;

    const currentSentence = question.sentences[editingSentenceIndex];
    if (!currentSentence) return;

    const parsedSplitPoint = parseFloat(editEndTime);
    const nextSentence = question.sentences[editingSentenceIndex + 1];
    const nextBoundary = nextSentence?.end ?? Infinity;
    const splitPoint = Number.isFinite(parsedSplitPoint)
      ? Math.min(Math.max(parsedSplitPoint, currentSentence.start), nextBoundary)
      : currentSentence.end;

    const newSentences = [...question.sentences];
    newSentences[editingSentenceIndex] = {
      ...newSentences[editingSentenceIndex],
      start: currentSentence.start,
      end: splitPoint,
      text: editSentenceText || currentSentence.text
    };

    if (nextSentence) {
      newSentences[editingSentenceIndex + 1] = {
        ...nextSentence,
        start: splitPoint
      };
    }

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: newSentences })
      });
      const result = await response.json();
      if (result.success && result.data) {
        onQuestionUpdate?.(result.data);
        setEditingSentenceIndex(null);
        setEditStartTime('');
        setEditEndTime('');
        setEditSentenceText('');
      } else {
        setError('保存失败');
      }
    } catch (err) {
      console.error('保存时间戳失败:', err);
      setError('保存失败');
    }
  };

  // 拆分句子为两个
  const splitSentence = () => {
    if (editingSentenceIndex === null || !question.sentences) return;

    const currentSentence = question.sentences[editingSentenceIndex];
    if (!currentSentence) return;

    // 在文本中使用 / 作为拆分标记
    const parts = editSentenceText.split('/');
    if (parts.length < 2) {
      // 如果没有 / 标记，提示用户
      setError('请在要拆分的位置输入 / 标记');
      return;
    }

    const firstPart = parts[0].trim();
    const secondPart = parts.slice(1).join('/').trim(); // 防止多次split

    if (!firstPart || !secondPart) {
      setError('拆分后的两部分都不能为空');
      return;
    }

    // 计算时间分配（按文本长度比例）
    const totalLen = editSentenceText.length;
    const firstLen = firstPart.length;
    const secondLen = secondPart.length;
    const duration = currentSentence.end - currentSentence.start;
    const firstDuration = (firstLen / totalLen) * duration;
    const secondDuration = duration - firstDuration;

    const firstEnd = currentSentence.start + firstDuration;
    const secondStart = firstEnd;

    const newSentences = [...question.sentences];
    newSentences[editingSentenceIndex] = {
      ...currentSentence,
      text: firstPart,
      end: Number(firstEnd.toFixed(2))
    };

    // 在当前位置后插入新的句子
    const newSentence = {
      text: secondPart,
      start: Number(secondStart.toFixed(2)),
      end: currentSentence.end
    };

    newSentences.splice(editingSentenceIndex + 1, 0, newSentence);

    // 保存到数据库
    fetch(`/api/questions/${questionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentences: newSentences })
    }).then(res => res.json()).then(result => {
      if (result.success && result.data) {
        onQuestionUpdate?.(result.data);
        setEditingSentenceIndex(null);
        setEditStartTime('');
        setEditEndTime('');
        setEditSentenceText('');
      } else {
        setError('拆分失败');
      }
    }).catch(err => {
      console.error('拆分句子失败:', err);
      setError('拆分失败');
    });
  };

  // 保存笔记
  const saveNote = async () => {
    setIsSavingNote(true);
    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      const result = await response.json();
      if (result.success && result.data) {
        onQuestionUpdate?.(result.data);
      }
    } catch (err) {
      console.error('保存笔记失败:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // 清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 清理定时器
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      // 清理音频元素
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // 更新问题内容
  const handleUpdateContent = async () => {
    if (!editContent.trim()) {
      setError('问题内容不能为空');
      return;
    }

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() })
      });

      const result = await response.json();
      if (result.success) {
        setIsEditing(false);
        if (result.data) {
          onQuestionUpdate?.(result.data);
        }
      } else {
        setError(result.error || '更新失败');
      }
    } catch (error) {
      console.error('更新问题失败:', error);
      setError('更新失败');
    }
  };

  // 删除问题
  const handleDeleteQuestion = async () => {
    try {
      const response = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        // 精准删除：直接从本地 state 移除
        onQuestionDelete?.(questionId);
      } else {
        setError(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除问题失败:', error);
      setError('删除失败');
    }
  };

  return (
    <Card className={`border border-border bg-muted/30 rounded-xl transition-all duration-300 ${
      isExpanded ? 'shadow-lg ring-2 ring-primary/20' : 'shadow-sm hover:shadow-md'
    }`}>
      <CardContent className="pt-4 pb-2">
        {/* 问题标题栏 - 点击可展开/折叠 */}
        <div 
          className="mb-2 flex items-center gap-2 cursor-pointer"
          onClick={(e) => {
            // 如果点击的是按钮或输入框，不触发展开/折叠
            if ((e.target as HTMLElement).closest('button, input')) return;
            onToggleExpand();
          }}
        >
          {/* 拖拽手柄 */}
          {dragHandleProps && (
            <div
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          
          {/* 展开/折叠箭头 */}
          <ChevronRight 
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`} 
          />
          
          {/* 问题编号 */}
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
            Q{index + 1}
          </span>
          
          {/* 问题内容 - 可编辑 */}
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateContent();
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(question.content || '');
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUpdateContent}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(question.content || '');
                }}
                className="text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <span className="font-medium text-foreground flex-1 truncate">{question.content}</span>
              {/* 状态指示器 - 折叠时显示 */}
              {!isExpanded && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {question.audio_url && (
                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">已录音</span>
                  )}
                  {question.english_transcript && (
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">已转写</span>
                  )}
                </div>
              )}
              {/* 操作按钮 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="text-muted-foreground hover:text-foreground rounded-lg"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteQuestion();
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNote(!showNote);
                }}
                className={`rounded-lg ${showNote ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                title="笔记"
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* 展开内容 */}
        {isExpanded && (
          <div className="space-y-3 mt-2">
            {/* 错误提示 */}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* 模式切换图标 */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setMode('stt'); setTtsInput(''); }}
                  className={`rounded-lg ${mode === 'stt' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                >
                  <Mic className="h-5 w-5" />
                </Button>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  语音转文字
                </span>
              </div>
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMode('tts')}
                  className={`rounded-lg ${mode === 'tts' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                >
                  <FileText className="h-5 w-5" />
                </Button>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  文字转语音
                </span>
              </div>
            </div>

            {/* TTS 模式输入区域（无音频时显示） */}
            {mode === 'tts' && !audioUrl && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    value={ttsInput}
                    onChange={(e) => { setTtsInput(e.target.value); setMode('tts'); }}
                    placeholder="输入英文文字，系统会按 . ! ? 实时切分句子预览"
                    rows={5}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  />
                  <span className="absolute right-3 top-3 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {selectedVoice === 'en_uk_male' ? '男' : '女'}
                  </span>
                </div>
                {/* 音色选择 */}
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`voice-${questionId}`}
                      checked={selectedVoice === 'en_uk_male'}
                      onChange={() => setSelectedVoice('en_uk_male')}
                      className="accent-primary"
                    />
                    男
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`voice-${questionId}`}
                      checked={selectedVoice === 'en_uk_female'}
                      onChange={() => setSelectedVoice('en_uk_female')}
                      className="accent-primary"
                    />
                    女
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">句子预览</h4>
                    {ttsSegments.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        共 {ttsSegments.length} 句
                      </span>
                    )}
                  </div>
                  {ttsSegments.length > 0 ? (
                    <div className="space-y-2">
                      {ttsSegments.map((segment) => {
                        const isEditingSegment = editingTTSSegmentId === segment.id;

                        return (
                          <div
                            key={segment.id}
                            className={`rounded-xl border px-3 py-3 transition-colors ${
                              isEditingSegment
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-background hover:border-primary/40 hover:bg-muted/50'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-3">
                              {/* 时间戳 - 可点击调整 */}
                              <button
                                type="button"
                                onClick={() => handleSelectTTSSegment(segment)}
                                className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                              >
                                {isEditingSegment ? (
                                  <div className="flex items-center gap-1">
                                    {/* 开始时间调整 */}
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); adjustTTSSegmentStart(-0.1); }}
                                      className="px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground"
                                    >
                                      -
                                    </button>
                                    <span className="min-w-10 text-center">{editingTTSSegmentStart}s</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); adjustTTSSegmentStart(0.1); }}
                                      className="px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground"
                                    >
                                      +
                                    </button>
                                    <span className="mx-1">-</span>
                                    {/* 结束时间调整 */}
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); adjustTTSSegmentEnd(-0.1); }}
                                      className="px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground"
                                    >
                                      -
                                    </button>
                                    <span className="min-w-10 text-center">{editingTTSSegmentEnd}s</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); adjustTTSSegmentEnd(0.1); }}
                                      className="px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-primary">点击调整时间</span>
                                )}
                              </button>
                              <span className="text-[11px] text-muted-foreground">句子 {segment.id}</span>
                            </div>
                            <p className="text-sm text-foreground">{segment.text}</p>

                            {isEditingSegment && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={editingTTSSegmentText}
                                  onChange={(e) => setEditingTTSSegmentText(e.target.value)}
                                  rows={3}
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                                  placeholder="编辑句子文本..."
                                />
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSaveTTSSegment}
                                    className="rounded-lg"
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTTSSegmentId(null);
                                      setEditingTTSSegmentText('');
                                      setEditingTTSSegmentStart('');
                                      setEditingTTSSegmentEnd('');
                                    }}
                                    className="rounded-lg"
                                  >
                                    取消
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                      输入内容后，这里会实时显示切分后的句子预览。
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleGenerateTTS}
                  disabled={!ttsInput.trim() || isGeneratingTTS}
                  className="rounded-xl"
                >
                  {isGeneratingTTS ? '生成中...' : '🎵 生成语音'}
                </Button>
              </div>
            )}

            {/* STT 模式上传区域 */}
            {mode === 'stt' && !audioUrl && (
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => document.getElementById(`audio-upload-${questionId}`)?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('audio/')) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    const input = document.getElementById(`audio-upload-${questionId}`) as HTMLInputElement;
                    if (input) {
                      input.files = dt.files;
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }
                }}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">点击上传音频文件</p>
                <input
                  id={`audio-upload-${questionId}`}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    handleFileChange(e);
                    setMode('stt');
                  }}
                />
              </div>
            )}

            {/* 音频播放 */}
            {audioUrl && (
              <div className="space-y-3">
                {/* 重新生成按钮（TTS 模式） */}
                {mode === 'tts' && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAudioUrl(null);
                        setSaved(false);
                        setTtsInput('');
                        setTtsSegments([]);
                      }}
                      className="rounded-lg text-muted-foreground"
                    >
                      重新生成
                    </Button>
                  </div>
                )}
                {/* 音频播放器 */}
                <div className="flex items-center gap-2 bg-background rounded-lg p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleGlobalPlay}
                    className="rounded-lg"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cyclePlaybackRate}
                    className="text-xs font-medium rounded-lg"
                  >
                    {playbackRate}x
                  </Button>
                  <audio
                    ref={audioRef}
                    src={audioUrl || undefined}
                    className="flex-1 h-8"
                    controls
                  />
                  {/* 保存状态 */}
                  {audioFile && !saved && !isSaving && (
                    <div className="flex items-center text-orange-500 text-xs px-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500 mr-1" />
                      未保存
                    </div>
                  )}
                  {isSaving && (
                    <div className="flex items-center text-muted-foreground text-xs px-2">
                      <div className="h-3 w-3 animate-spin border-2 border-primary border-t-transparent rounded-full mr-1" />
                      保存中...
                    </div>
                  )}
                  {/* 已保存标记 */}
                  {saved && (
                    <div className="flex items-center text-green-600 text-xs px-2">
                      <Check className="h-4 w-4 mr-1" />
                      已保存
                    </div>
                  )}
                  {/* 手动保存按钮（仅在自动保存失败时显示） */}
                  {audioFile && !saved && !isSaving && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveAudio}
                      className="rounded-lg text-orange-500 hover:bg-orange-50 text-xs"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                  )}
                </div>

                {/* 功能按钮 */}
                <div className="flex gap-2 flex-wrap">
                  {/* 新上传音频的转写按钮 */}
                  {audioFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                      className="rounded-lg"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      {isTranscribing ? '转写中...' : '转文字'}
                    </Button>
                  )}

                  {/* 已有音频的重新转写按钮 */}
                  {question.audio_url && !audioFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryTranscribe}
                      disabled={isTranscribing}
                      className="rounded-lg text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      {isTranscribing ? '重新转写中...' : '重新转写'}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTranslate}
                    disabled={!question.english_transcript || isTranslating}
                    className="rounded-lg"
                  >
                    <Languages className="h-4 w-4 mr-1" />
                    {isTranslating ? '翻译中...' : '翻译'}
                  </Button>
                </div>

                {/* 英文原文 + 笔记（横向并排时） */}
                {question.english_transcript && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {showNote ? '英文原文（点击句子跳转播放）' : '英文原文（点击句子跳转播放，点击可编辑文本或调整时间，用 / 拆分句子）'}
                    </h4>
                    <div className={`flex gap-3 ${showNote ? '' : ''}`}>
                      {/* 左侧：英文转录句子 */}
                      <div className={`${showNote ? 'w-1/2' : 'w-full'} space-y-1`}>
                        {question.sentences && question.sentences.length > 0 ? (
                          question.sentences.map((sentence, sentenceIndex) => (
                            <div
                              key={sentenceIndex}
                              className={`flex flex-col gap-2 px-3 py-2 rounded-lg transition-all ${
                                currentSentenceIndex === sentenceIndex
                                  ? 'bg-gradient-to-r from-macaron-pink/20 via-macaron-mint/20 to-macaron-lavender/20 border-l-4 border-macaron-pink shadow-sm'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              {/* 时间戳 - 可编辑（笔记关闭时显示） */}
                              {!showNote && (
                                editingSentenceIndex === sentenceIndex ? (
                                  <div className="space-y-2">
                                    {/* 时间调整行 */}
                                    <div className="flex items-center gap-1 text-xs">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); adjustSentenceSplitPoint(-0.1); }}
                                        className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground"
                                        title="减少0.1秒"
                                      >
                                        -
                                      </button>
                                      <span className="min-w-12 rounded border border-border bg-background px-2 py-0.5 text-center font-mono">
                                        {editStartTime}
                                      </span>
                                      <span>-</span>
                                      <span className="min-w-12 rounded border border-border bg-background px-2 py-0.5 text-center font-mono">
                                        {editEndTime}
                                      </span>
                                      <span>s</span>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); adjustSentenceSplitPoint(0.1); }}
                                        className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground"
                                        title="增加0.1秒"
                                      >
                                        +
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); saveSentenceTimestamp(); }}
                                        className="ml-1 p-1 rounded text-green-600 hover:bg-green-50"
                                        title="保存"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSentenceIndex(null);
                                          setEditStartTime('');
                                          setEditEndTime('');
                                          setEditSentenceText('');
                                        }}
                                        className="p-1 rounded text-muted-foreground hover:bg-muted"
                                        title="取消"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                    {/* 文本编辑 + 拆分 */}
                                    <textarea
                                      value={editSentenceText}
                                      onChange={(e) => setEditSentenceText(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      rows={2}
                                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                                      placeholder="编辑句子文本... 用 / 标记拆分位置"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); splitSentence(); }}
                                      className="self-start px-3 py-1 rounded-lg border border-primary/30 text-primary text-xs hover:bg-primary/10"
                                    >
                                      拆分为两句
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span
                                      onClick={(e) => { e.stopPropagation(); startEditSentence(sentenceIndex); }}
                                      className="text-[10px] text-muted-foreground/60 hover:text-primary cursor-pointer shrink-0 font-mono px-1"
                                      title="点击编辑文本和调整时间"
                                    >
                                      {sentence.start.toFixed(1)}-{sentence.end.toFixed(1)}s
                                    </span>
                                    {/* 句子文本 - 点击播放 */}
                                    <button
                                      onClick={() => playSentence(sentence, sentenceIndex)}
                                      className="flex-1 text-left text-foreground"
                                    >
                                      {sentence.text}
                                    </button>
                                  </div>
                                )
                              )}
                              {/* 笔记模式：只显示句子 */}
                              {showNote && (
                                <button
                                  onClick={() => playSentence(sentence, sentenceIndex)}
                                  className="text-left text-foreground"
                                >
                                  {sentence.text}
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-foreground">{question.english_transcript}</p>
                        )}
                      </div>

                      {/* 右侧：笔记（仅笔记展开时显示） */}
                      {showNote && (
                        <div className="w-1/2">
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            onBlur={saveNote}
                            placeholder="添加笔记..."
                            className="w-full h-full min-h-32 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 中文翻译 */}
                {question.chinese_translation && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">中文翻译</h4>
                    <p className="text-foreground">{question.chinese_translation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
