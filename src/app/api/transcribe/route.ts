import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 初始化 R2/S3 客户端
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY || '',
  },
});

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

  console.log('句子时间戳:', sentences.map(s => `${s.text.substring(0,20)}... [${s.start}-${s.end}]`));

  return sentences;
}

// 上传文件到 R2
async function uploadToR2(fileBuffer: Buffer, key: string, contentType: string): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.CF_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  // R2 公开访问 URL
  return `https://${process.env.CF_PUBLIC_BUCKET_DOMAIN}/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const questionId = formData.get('questionId') as string;
    const audioDuration = formData.get('duration') as string;

    if (!audioFile || !questionId) {
      return NextResponse.json(
        { success: false, error: '缺少音频文件或问题ID' },
        { status: 400 }
      );
    }

    // 将音频文件转换为 buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 上传音频到 R2
    console.log('上传音频文件到 R2...');
    const timestamp = Date.now();
    const sanitizedFileName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const audioKey = `ielts-audio/${questionId}/${timestamp}_${sanitizedFileName}`;
    const audioUrl = await uploadToR2(fileBuffer, audioKey, audioFile.type || 'audio/mpeg');
    console.log('音频上传成功，URL:', audioUrl.substring(0, 50) + '...');

    // 使用 Whisper 转写
    console.log('开始 Whisper 转写...');

    // 将 buffer 转回 File 对象给 OpenAI
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const whisperFile = new File([fileBuffer], fileName, { type: audioFile.type || 'audio/mpeg' });

    const transcription = await openai.audio.transcriptions.create({
      file: whisperFile,
      model: 'whisper-1',
    });

    const resultText = transcription.text;
    console.log('Whisper 结果:', resultText?.substring(0, 100));

    if (!resultText) {
      return NextResponse.json(
        { success: false, error: '转写失败：未识别到语音内容' },
        { status: 500 }
      );
    }

    // 获取音频时长
    let duration = parseFloat(audioDuration) || 0;
    if (duration <= 0) {
      // 尝试从文件获取时长（浏览器传过来的 duration）
      duration = 60; // 默认 60 秒
    }
    console.log('使用的音频时长:', duration, '秒');

    // 使用 fallback 算法拆分句子并估算时间戳
    // 注意：OpenAI Whisper 不返回 word-level timestamps
    const sentences = splitIntoSentences(resultText, duration);
    console.log('使用智能算法拆分，句子数:', sentences.length);

    // 更新数据库
    const supabaseClient = getSupabaseClient();
    const { error } = await supabaseClient
      .from('questions')
      .update({
        audio_url: audioUrl,
        english_transcript: resultText,
        sentences: sentences,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(questionId));

    if (error) throw new Error(`数据库更新失败: ${error.message}`);

    console.log('转写完成，句子数:', sentences.length);

    return NextResponse.json({
      success: true,
      data: {
        audio_url: audioUrl,
        text: resultText,
        sentences: sentences,
        duration: duration
      }
    });
  } catch (error) {
    console.error('音频转写失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
