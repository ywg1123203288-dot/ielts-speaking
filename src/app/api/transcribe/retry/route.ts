import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 智能拆分句子并估算时间戳
function splitIntoSentences(text: string, duration: number): Array<{ text: string; start: number; end: number }> {
  console.log('拆分文本:', text.substring(0, 100) + '...', '时长:', duration);

  const safeDuration = duration > 0 ? duration : 60;

  const sentenceEndings = /([.!?]+)\s*/g;
  const parts = text.split(sentenceEndings);

  const sentences: Array<{ text: string; start: number; end: number }> = [];
  let currentText = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.match(/^[.!?]+$/)) {
      currentText += part;
      const trimmedText = currentText.trim();
      if (trimmedText) {
        sentences.push({ text: trimmedText, start: 0, end: 0 });
      }
      currentText = '';
    } else {
      currentText += part;
    }
  }

  const lastText = currentText.trim();
  if (lastText) {
    sentences.push({ text: lastText, start: 0, end: 0 });
  }

  console.log('拆分出句子数:', sentences.length);

  if (sentences.length === 0) {
    return [{ text: text, start: 0, end: safeDuration }];
  }

  const totalChars = sentences.reduce((sum, s) => sum + s.text.length, 0);

  let currentTime = 0;
  sentences.forEach((sentence, index) => {
    const sentenceDuration = (sentence.text.length / totalChars) * safeDuration;
    sentence.start = Math.round(currentTime * 100) / 100;
    sentence.end = Math.round((currentTime + sentenceDuration) * 100) / 100;
    currentTime = sentence.end;

    if (index === sentences.length - 1) {
      sentence.end = safeDuration;
    }
  });

  return sentences;
}

// 将 word-level timestamps 合并成句子
function mergeWordsToSentences(words: Array<{ word: string; start: number; end: number }>): Array<{ text: string; start: number; end: number }> {
  if (!words || words.length === 0) return [];

  const sentences: Array<{ text: string; start: number; end: number }> = [];
  let currentSentence = {
    words: [] as Array<{ word: string; start: number; end: number }>,
    start: 0,
    end: 0
  };

  const isEndPunctuation = (word: string) => /[.!?]$/.test(word.trim());

  for (const wordObj of words) {
    currentSentence.words.push(wordObj);
    currentSentence.end = wordObj.end;

    // 如果遇到句末标点，开始新句子
    if (isEndPunctuation(wordObj.word)) {
      const text = currentSentence.words.map(w => w.word).join('').trim();
      sentences.push({
        text,
        start: currentSentence.words[0].start,
        end: currentSentence.end
      });
      currentSentence = {
        words: [],
        start: 0,
        end: 0
      };
    }
  }

  // 处理最后剩余的词
  if (currentSentence.words.length > 0) {
    const text = currentSentence.words.map(w => w.word).join('').trim();
    if (text) {
      sentences.push({
        text,
        start: currentSentence.words[0].start,
        end: currentSentence.end || currentSentence.words[currentSentence.words.length - 1].end
      });
    }
  }

  return sentences;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, audioDuration } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: '缺少问题ID' },
        { status: 400 }
      );
    }

    const supabaseClient = getSupabaseClient();

    // 获取问题的音频URL
    const { data: question, error: fetchError } = await supabaseClient
      .from('questions')
      .select('audio_url')
      .eq('id', parseInt(questionId))
      .single();

    if (fetchError || !question?.audio_url) {
      return NextResponse.json(
        { success: false, error: '未找到音频文件' },
        { status: 404 }
      );
    }

    console.log('重新转写音频:', question.audio_url);

    // 下载音频文件
    const audioResponse = await fetch(question.audio_url);
    if (!audioResponse.ok) {
      return NextResponse.json(
        { success: false, error: '音频文件下载失败' },
        { status: 500 }
      );
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 使用 Deepgram 转写
    console.log('开始 Deepgram 转写...');

    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&timestamps=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: fileBuffer,
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('Deepgram API 错误:', errorText);
      throw new Error(`Deepgram API 请求失败: ${deepgramResponse.status}`);
    }

    const deepgramResult = await deepgramResponse.json();
    const result = deepgramResult.results?.channels?.[0]?.alternatives?.[0];

    if (!result) {
      return NextResponse.json(
        { success: false, error: '转写失败：未识别到语音内容' },
        { status: 500 }
      );
    }

    const resultText = result.transcript || '';
    const words = result.words || [];

    console.log('Deepgram 结果:', resultText?.substring(0, 100));

    if (!resultText) {
      return NextResponse.json(
        { success: false, error: '转写失败：未识别到语音内容' },
        { status: 500 }
      );
    }

    // 获取音频时长
    let duration = parseFloat(audioDuration) || 0;
    if (duration <= 0) {
      duration = 60;
    }
    console.log('使用的音频时长:', duration, '秒');

    // 构造时间戳句子数组
    let sentences: Array<{ text: string; start: number; end: number }>;

    // 如果 Deepgram 返回了 word-level timestamps，按句子合并
    if (words.length > 0) {
      sentences = mergeWordsToSentences(words);
      console.log('使用 Deepgram timestamps 拆分，句子数:', sentences.length);
    } else {
      sentences = splitIntoSentences(resultText, duration);
      console.log('使用智能算法拆分，句子数:', sentences.length);
    }

    // 如果合并后句子太少（少于2个），使用智能拆分
    if (sentences.length < 2) {
      sentences = splitIntoSentences(resultText, duration);
      console.log('句子太少，使用智能算法拆分，句子数:', sentences.length);
    }

    // 更新数据库
    const { error: updateError } = await supabaseClient
      .from('questions')
      .update({
        english_transcript: resultText,
        sentences: sentences,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(questionId));

    if (updateError) throw new Error(`数据库更新失败: ${updateError.message}`);

    console.log('转写完成，句子数:', sentences.length);

    return NextResponse.json({
      success: true,
      data: {
        text: resultText,
        sentences: sentences,
        duration: duration
      }
    });
  } catch (error) {
    console.error('重新转写失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
