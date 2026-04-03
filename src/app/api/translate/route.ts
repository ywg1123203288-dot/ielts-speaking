import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, questionId } = body;

    if (!text || !questionId) {
      return NextResponse.json(
        { success: false, error: '缺少文本或问题ID' },
        { status: 400 }
      );
    }

    // 使用 DeepL API 翻译
    const deeplApiKey = process.env.DEEPL_API_KEY;

    if (!deeplApiKey) {
      return NextResponse.json(
        { success: false, error: 'DeepL API 未配置' },
        { status: 500 }
      );
    }

    console.log('调用 DeepL 翻译...');

    const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${deeplApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: 'EN',
        target_lang: 'ZH',
      }),
    });

    if (!deeplResponse.ok) {
      const errorText = await deeplResponse.text();
      console.error('DeepL API 错误:', errorText);
      throw new Error(`DeepL API 请求失败: ${deeplResponse.status}`);
    }

    const deeplResult = await deeplResponse.json();
    const translation = deeplResult.translations[0]?.text || '';

    console.log('翻译结果:', translation.substring(0, 50) + '...');

    // 更新数据库
    const supabaseClient = getSupabaseClient();
    const { error } = await supabaseClient
      .from('questions')
      .update({
        chinese_translation: translation,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(questionId));

    if (error) throw new Error(`数据库更新失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      data: { translation }
    });
  } catch (error) {
    console.error('翻译失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
