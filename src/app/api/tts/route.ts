import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 复用 r2Client 配置
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

// 音色映射
const VOICE_MAP: Record<string, string> = {
  'en_uk_male': 'wyWA56cQNU2KqUW4eCsI',   // 英音男
  'en_uk_female': '19STyYD15bswVz51nqLf', // 英音女
  'en_us_male': 'dtSEYcGNJqjrtBArPCVZ',    // 美音男
  'en_us_female': 'OYTbf65OHHFELVut7v2H', // 美音女
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
    
    // 调用 ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    // 上传到 R2
    const key = `ielts-tts/${Date.now()}.webm`;
    const audioUrl = await uploadToR2(audioBuffer, key, 'audio/webm');
    
    return NextResponse.json({ success: true, data: { audioUrl } });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ success: false, error: '生成失败' }, { status: 500 });
  }
}
