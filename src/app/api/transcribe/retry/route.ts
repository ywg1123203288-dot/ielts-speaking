import { NextRequest, NextResponse } from 'next/server';
import { ASRClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 智能拆分句子并估算时间戳
function splitIntoSentences(text: string, duration: number): Array<{ text: string; start: number; end: number }> {
  console.log('拆分文本:', text.substring(0, 100) + '...', '时长:', duration);
  
  // 如果时长为0，使用默认60秒
  const safeDuration = duration > 0 ? duration : 60;
  
  // 按句子结束符拆分（保留分隔符）
  const sentenceEndings = /([.!?]+)\s*/g;
  const parts = text.split(sentenceEndings);
  
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  let currentText = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    
    // 如果是句子结束符，追加到当前文本
    if (part.match(/^[.!?]+$/)) {
      currentText += part;
      // 添加句子（去除首尾空格）
      const trimmedText = currentText.trim();
      if (trimmedText) {
        sentences.push({ text: trimmedText, start: 0, end: 0 });
      }
      currentText = '';
    } else {
      // 普通文本
      currentText += part;
    }
  }
  
  // 处理最后剩余的文本
  const lastText = currentText.trim();
  if (lastText) {
    sentences.push({ text: lastText, start: 0, end: 0 });
  }
  
  console.log('拆分出句子数:', sentences.length);
  
  // 如果没有拆分出句子，返回整段文本
  if (sentences.length === 0) {
    return [{ text: text, start: 0, end: safeDuration }];
  }
  
  // 计算总字符数（用于按比例分配时间）
  const totalChars = sentences.reduce((sum, s) => sum + s.text.length, 0);
  
  // 为每个句子估算时间戳
  let currentTime = 0;
  sentences.forEach((sentence, index) => {
    const sentenceDuration = (sentence.text.length / totalChars) * safeDuration;
    sentence.start = Math.round(currentTime * 100) / 100;
    sentence.end = Math.round((currentTime + sentenceDuration) * 100) / 100;
    currentTime = sentence.end;
    
    // 最后一个句子的结束时间等于总时长
    if (index === sentences.length - 1) {
      sentence.end = safeDuration;
    }
  });
  
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
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 使用ASR客户端转写音频
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new ASRClient(config, customHeaders);

    console.log('开始ASR转写...');
    const result = await client.recognize({
      uid: 'user123',
      base64Data: base64Data
    });

    console.log('ASR结果:', {
      text: result.text?.substring(0, 100),
      duration: result.duration,
      utterancesCount: result.utterances?.length
    });

    if (!result.text) {
      return NextResponse.json(
        { success: false, error: '转写失败：未识别到语音内容' },
        { status: 500 }
      );
    }

    // 获取音频时长（秒）- 优先使用前端传递的时长
    let duration = parseFloat(audioDuration) || 0;
    if (duration <= 0) {
      duration = (result.duration || 0) / 1000;
    }
    console.log('使用的音频时长:', duration, '秒');
    
    // 构造时间戳句子数组
    let sentences: Array<{ text: string; start: number; end: number }>;
    
    // 优先使用ASR返回的utterances（包含精确时间戳）
    if (result.utterances && result.utterances.length > 0) {
      sentences = result.utterances.map((u, index) => {
        const startTime = (u.start_time || 0) / 1000;
        const endTime = (u.end_time || 0) / 1000;
        
        // 如果这不是最后一个句子，给结束时间加一个小缓冲
        const adjustedEnd = index < result.utterances!.length - 1 
          ? endTime + 0.05 // 加50ms缓冲，避免句子间空白
          : endTime;
        
        console.log(`句子${index + 1}: "${u.text?.substring(0, 20)}..." [${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s]`);
        
        return {
          text: u.text || '',
          start: startTime,
          end: adjustedEnd
        };
      });
      console.log('使用ASR utterances拆分，句子数:', sentences.length);
    } else {
      // 如果ASR没有返回utterances，使用智能拆分算法
      sentences = splitIntoSentences(result.text, duration);
      console.log('使用智能算法拆分，句子数:', sentences.length);
    }

    // 更新数据库
    const { error: updateError } = await supabaseClient
      .from('questions')
      .update({
        english_transcript: result.text,
        sentences: sentences,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(questionId));

    if (updateError) throw new Error(`数据库更新失败: ${updateError.message}`);

    console.log('转写完成，句子数:', sentences.length);

    return NextResponse.json({
      success: true,
      data: {
        text: result.text,
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
