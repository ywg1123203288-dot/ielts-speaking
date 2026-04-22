'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
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
  ChevronRight,
  Pencil,
  Check,
  X,
  Save,
  StickyNote,
  Mic
} from 'lucide-react';
import { CardWithQuestions, Question, TimestampedSentence } from '@/lib/types';

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

export default function CardPage() {
  const params = useParams();
  const cardId = params.id as string;

  const [card, setCard] = useState<CardWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [isPart2, setIsPart2] = useState(false);

  const updateQuestionInState = (updatedQuestion: Question) => {
    if (!card?.questions) return;
    const questionIndex = card.questions.findIndex(q => q.id === updatedQuestion.id);
    if (questionIndex === -1) return;
    const newQuestions = [...card.questions];
    newQuestions[questionIndex] = updatedQuestion;
    setCard({ ...card, questions: newQuestions });
  };

  const deleteQuestionInState = (questionId: number) => {
    if (!card?.questions) return;
    setCard({ ...card, questions: card.questions.filter(q => q.id !== questionId) });
  };

  const fetchCardData = () => {
    if (cardId) {
      setLoading(true);
      fetch(`/api/cards/${cardId}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            setCard(result.data);
            setIsPart2(result.data.part_id === 2);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchCardData();
  }, [cardId]);

  const handleAddQuestion = async () => {
    if (!newQuestionContent.trim()) {
      alert('请输入问题内容');
      return;
    }

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: parseInt(cardId),
          content: newQuestionContent.trim(),
          order: (card?.questions?.length || 0) + 1
        })
      });

      const result = await response.json();
      if (result.success && result.data) {
        setNewQuestionContent('');
        setShowNewQuestion(false);
        fetchCardData();
      } else {
        alert('添加问题失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('创建问题失败:', error);
      alert('创建问题失败，请查看控制台');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      const response = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        deleteQuestionInState(questionId);
      } else {
        alert('删除失败：' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('删除问题失败:', error);
      alert('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">卡片不存在</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
            <span className="text-foreground font-medium">{card.title}</span>
          </div>

          {/* 标题栏 */}
          <div className="mb-8 flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold text-foreground">{card.title}</h2>
              <p className="text-muted-foreground mt-1">
                {isPart2 ? 'Part 2 回答' : `${card.questions?.length || 0} 个问题`}
              </p>
            </div>
          </div>

          {/* Part 2 题目描述和提示 */}
          {isPart2 && card.description && (
            <Card className="mb-6 border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-foreground mb-3 whitespace-pre-line">{card.description}</p>
                {card.hints && card.hints.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {card.hints.map((hint, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium">{idx + 1}.</span>
                        <span className="text-muted-foreground">{hint}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 新增问题（Part 1）或添加回答（Part 2） */}
          {!isPart2 && (
            <>
              {showNewQuestion ? (
                <Card className="mb-6 border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <textarea
                        placeholder="输入问题内容，如：Why is this song meaningful to you?"
                        value={newQuestionContent}
                        onChange={(e) => setNewQuestionContent(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleAddQuestion} className="rounded-xl">
                          添加
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowNewQuestion(false);
                            setNewQuestionContent('');
                          }}
                          className="rounded-xl"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowNewQuestion(true)}
                  className="mb-6 rounded-xl w-full border-dashed border-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加问题
                </Button>
              )}
            </>
          )}

          {/* Part 2: 添加回答按钮 */}
          {isPart2 && (!card.questions || card.questions.length === 0) && (
            <Card className="mb-6 border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">点击下方按钮添加 Part 2 回答内容</p>
                <Button
                  onClick={() => {
                    // 为 Part 2 创建一个默认问题
                    fetch('/api/questions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        card_id: parseInt(cardId),
                        content: 'Part 2 回答',
                        order: 1
                      })
                    }).then(res => res.json())
                    .then(result => {
                      if (result.success && result.data) {
                        fetchCardData();
                      } else {
                        alert('添加失败：' + (result.error || '未知错误'));
                      }
                    });
                  }}
                  className="rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加回答
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 问题列表 */}
          {card.questions && card.questions.length > 0 ? (
            <div className="space-y-4">
              {card.questions.map((question, index) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  index={index}
                  onQuestionUpdate={updateQuestionInState}
                  onQuestionDelete={handleDeleteQuestion}
                  isExpanded={expandedQuestionId === question.id}
                  onToggleExpand={() => {
                    setExpandedQuestionId(
                      expandedQuestionId === question.id ? null : question.id
                    );
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {isPart2 ? '还没有回答内容' : '还没有问题'}
              </h3>
              <p className="text-sm text-muted-foreground/80">
                {isPart2 ? '点击上方添加回答' : '点击上方按钮添加问题'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 问题组件
function QuestionItem({
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

  useEffect(() => {
    setTtsSegments(buildTTSSegments(ttsInput));
    if (!ttsInput.trim()) {
      setEditingTTSSegmentId(null);
      setEditingTTSSegmentText('');
    }
  }, [ttsInput]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      setSaved(false);

      const tempAudio = new Audio(url);
      tempAudio.addEventListener('loadedmetadata', async () => {
        const duration = tempAudio.duration;
        if (duration && !isNaN(duration)) {
          setAudioDuration(duration);
        }
      });

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

      if (audioDuration > 0) {
        formData.append('duration', audioDuration.toString());
      }

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setSaved(true);
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

  const handleGenerateTTS = async () => {
    if (!ttsInput.trim()) {
      setError('请输入要转换的文字');
      return;
    }

    setIsGeneratingTTS(true);
    setError(null);
    try {
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

      const audioUrlResult = ttsResult.data.audioUrl;

      const saveResponse = await fetch(`/api/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: audioUrlResult })
      });

      if (!saveResponse.ok) {
        setError('保存音频 URL 失败');
        return;
      }

      const transcribeResponse = await fetch('/api/transcribe/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionId,
          audioUrl: audioUrlResult
        })
      });

      const transcribeResult = await transcribeResponse.json();
      if (!transcribeResult.success) {
        setError(transcribeResult.error || 'ASR 转写失败');
        return;
      }

      setAudioUrl(audioUrlResult);
      setSaved(true);
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);

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

  const handleRetryTranscribe = async () => {
    if (!audioUrl) {
      setError('没有可用的音频文件');
      return;
    }

    setIsTranscribing(true);
    setError(null);
    try {
      const audio = audioRef.current;
      const duration = audio?.duration && !isNaN(audio.duration) ? audio.duration : 0;

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

  const playSentence = (sentence: TimestampedSentence, sentenceIndex: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    const startOffset = Math.max(0, sentence.start - 0.1);
    const endOffset = sentence.end + 0.05;

    audio.currentTime = startOffset;
    audio.playbackRate = playbackRate;

    setCurrentSentenceIndex(sentenceIndex);

    playbackIntervalRef.current = setInterval(() => {
      if (audio.currentTime >= endOffset) {
        audio.pause();
        clearInterval(playbackIntervalRef.current!);
        playbackIntervalRef.current = null;
      }
    }, 20);
  };

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

  const splitSentence = () => {
    if (editingSentenceIndex === null || !question.sentences) return;

    const currentSentence = question.sentences[editingSentenceIndex];
    if (!currentSentence) return;

    const parts = editSentenceText.split('/');
    if (parts.length < 2) {
      setError('请在要拆分的位置输入 / 标记');
      return;
    }

    const firstPart = parts[0].trim();
    const secondPart = parts.slice(1).join('/').trim();

    if (!firstPart || !secondPart) {
      setError('拆分后的两部分都不能为空');
      return;
    }

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

    const newSentence = {
      text: secondPart,
      start: Number(secondStart.toFixed(2)),
      end: currentSentence.end
    };

    newSentences.splice(editingSentenceIndex + 1, 0, newSentence);

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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

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

  const handleDeleteQuestion = async () => {
    try {
      const response = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
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
        <div
          className="mb-2 flex items-center gap-2 cursor-pointer"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button, input')) return;
            onToggleExpand();
          }}
        >
          <ChevronRight
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />

          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
            Q{index + 1}
          </span>

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

        {isExpanded && (
          <div className="space-y-3 mt-2">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setMode('stt'); setTtsInput(''); }}
                className={`rounded-lg ${mode === 'stt' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMode('tts')}
                className={`rounded-lg ${mode === 'tts' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
              >
                <FileText className="h-5 w-5" />
              </Button>
            </div>

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
                {ttsSegments.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">句子预览</h4>
                      {ttsSegments.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          共 {ttsSegments.length} 句
                        </span>
                      )}
                    </div>
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
                            <button
                              type="button"
                              onClick={() => handleSelectTTSSegment(segment)}
                              className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                            >
                              {isEditingSegment ? (
                                <div className="flex items-center gap-1">
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
                                <Button type="button" size="sm" onClick={handleSaveTTSSegment} className="rounded-lg">
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
                <Button
                  onClick={handleGenerateTTS}
                  disabled={!ttsInput.trim() || isGeneratingTTS}
                  className="rounded-xl"
                >
                  {isGeneratingTTS ? '生成中...' : '🎵 生成语音'}
                </Button>
              </div>
            )}

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

            {audioUrl && (
              <div className="space-y-3">
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
                <div className="flex items-center gap-2 bg-background rounded-lg p-2">
                  <Button variant="ghost" size="icon" onClick={toggleGlobalPlay} className="rounded-lg">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cyclePlaybackRate} className="text-xs font-medium rounded-lg">
                    {playbackRate}x
                  </Button>
                  <audio ref={audioRef} src={audioUrl || undefined} className="flex-1 h-8" controls />
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
                  {saved && (
                    <div className="flex items-center text-green-600 text-xs px-2">
                      <Check className="h-4 w-4 mr-1" />
                      已保存
                    </div>
                  )}
                  {audioFile && !saved && !isSaving && (
                    <Button variant="ghost" size="sm" onClick={handleSaveAudio} className="rounded-lg text-orange-500 hover:bg-orange-50 text-xs">
                      <Save className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {audioFile && (
                    <Button variant="outline" size="sm" onClick={handleTranscribe} disabled={isTranscribing} className="rounded-lg">
                      <FileText className="h-4 w-4 mr-1" />
                      {isTranscribing ? '转写中...' : '转文字'}
                    </Button>
                  )}
                  {question.audio_url && !audioFile && (
                    <Button variant="outline" size="sm" onClick={handleRetryTranscribe} disabled={isTranscribing} className="rounded-lg text-primary border-primary/30 hover:bg-primary/10">
                      <FileText className="h-4 w-4 mr-1" />
                      {isTranscribing ? '重新转写中...' : '重新转写'}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleTranslate} disabled={!question.english_transcript || isTranslating} className="rounded-lg">
                    <Languages className="h-4 w-4 mr-1" />
                    {isTranslating ? '翻译中...' : '翻译'}
                  </Button>
                </div>

                {question.english_transcript && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {showNote ? '英文原文（点击句子跳转播放）' : '英文原文（点击句子跳转播放，点击可编辑文本或调整时间，用 / 拆分句子）'}
                    </h4>
                    <div className={`flex gap-3 ${showNote ? '' : ''}`}>
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
                              {!showNote && (
                                editingSentenceIndex === sentenceIndex ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1 text-xs">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); adjustSentenceSplitPoint(-0.1); }}
                                        className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-muted-foreground"
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
                                      >
                                        +
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); saveSentenceTimestamp(); }}
                                        className="ml-1 p-1 rounded text-green-600 hover:bg-green-50"
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
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
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
                                    <button
                                      onClick={() => playSentence(sentence, sentenceIndex)}
                                      className="flex-1 text-left text-foreground"
                                    >
                                      {sentence.text}
                                    </button>
                                  </div>
                                )
                              )}
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