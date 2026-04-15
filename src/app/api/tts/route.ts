import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

// ElevenLabs 音色映射（Custom Voice ID，免费可用）
const VOICE_MAP: Record<string, string> = {
  en_uk_male: 'ErXwobaYiN019PkySvjV',    // 男声
  en_uk_female: 'OYTbf65OHHFELVut7v2H',  // 女声（用户自定义）
};

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text || !voice) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    const voiceId = VOICE_MAP[voice];
    if (!voiceId) {
      return NextResponse.json({ success: false, error: '无效的音色' }, { status: 400 });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { success: false, error: '服务端未读取到 ELEVENLABS_API_KEY' },
        { status: 500 }
      );
    }

    // 调用 ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);

      return NextResponse.json(
        {
          success: false,
          error: `ElevenLabs API error: ${response.status} - ${errorText}`,
        },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // 上传到 R2
    const key = `ielts-tts/${Date.now()}.webm`;
    const audioUrl = await uploadToR2(audioBuffer, key, 'audio/webm');

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