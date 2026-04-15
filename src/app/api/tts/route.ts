import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Readable } from 'stream';

// R2 配置
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY || '',
  },
});

async function uploadToR2(fileBuffer: Buffer, key: string, contentType: string): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.CF_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );
  return `https://${process.env.CF_PUBLIC_BUCKET_DOMAIN}/${key}`;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Edge TTS 音色映射
const VOICE_MAP: Record<string, string> = {
  en_uk_male: 'en-GB-RyanNeural',
  en_uk_female: 'en-GB-SoniaNeural',
};

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text || !voice) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    const voiceName = VOICE_MAP[voice];
    if (!voiceName) {
      return NextResponse.json({ success: false, error: '无效的音色' }, { status: 400 });
    }

    // 使用 Edge TTS 生成音频
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    // 将流转换为 Buffer
    const audioBuffer = await streamToBuffer(audioStream);

    // 上传到 R2
    const key = `ielts-tts/${Date.now()}.mp3`;
    const audioUrl = await uploadToR2(audioBuffer, key, 'audio/mpeg');

    return NextResponse.json({
      success: true,
      data: { audioUrl },
    });
  } catch (error) {
    console.error('TTS error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成失败',
      },
      { status: 500 }
    );
  }
}