import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

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

    // 将音频文件转换为Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 上传到对象存储
    const timestamp = Date.now();
    const sanitizedFileName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const audioKey = await storage.uploadFile({
      fileContent: fileBuffer,
      fileName: `ielts-audio/${questionId}/${timestamp}_${sanitizedFileName}`,
      contentType: audioFile.type || 'audio/mpeg',
    });
    
    // 生成可访问的URL（有效期30天）
    const audioUrl = await storage.generatePresignedUrl({
      key: audioKey,
      expireTime: 2592000, // 30天
    });

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
