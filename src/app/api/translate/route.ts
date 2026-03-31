import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
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

    // 使用LLM客户端翻译
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const messages = [
      {
        role: 'system' as const,
        content: '你是一个专业的翻译助手。请将用户提供的英文文本翻译成中文，要求翻译准确、流畅、符合中文表达习惯。只返回翻译结果，不要添加任何解释或说明。'
      },
      {
        role: 'user' as const,
        content: text
      }
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-lite-251015',
      temperature: 0.3
    });

    const translation = response.content;

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
