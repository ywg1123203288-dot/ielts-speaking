import { NextRequest, NextResponse } from 'next/server';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 初始化 R2/S3 客户端
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY || '',
  },
});

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

    if (!audioFile || !questionId) {
      return NextResponse.json(
        { success: false, error: '缺少音频文件或问题ID' },
        { status: 400 }
      );
    }

    console.log('保存音频文件...', { questionId, fileName: audioFile.name, size: audioFile.size });

    // 将音频文件转换为 Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 上传到 R2
    const timestamp = Date.now();
    const sanitizedFileName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const audioKey = `ielts-audio/${questionId}/${timestamp}_${sanitizedFileName}`;
    const audioUrl = await uploadToR2(fileBuffer, audioKey, audioFile.type || 'audio/mpeg');

    console.log('音频上传成功，保存到数据库...');

    // 更新数据库
    const supabaseClient = getSupabaseClient();
    const { error } = await supabaseClient
      .from('questions')
      .update({
        audio_url: audioUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(questionId));

    if (error) throw new Error(`数据库更新失败: ${error.message}`);

    console.log('音频保存完成');

    return NextResponse.json({
      success: true,
      data: {
        audio_url: audioUrl
      }
    });
  } catch (error) {
    console.error('保存音频失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
