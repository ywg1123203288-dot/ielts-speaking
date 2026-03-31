import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    
    const { error } = await client
      .from('questions')
      .delete()
      .eq('id', parseInt(id));
    
    if (error) throw new Error(`删除失败: ${error.message}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除Question失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    
    if (body.content !== undefined) updateData.content = body.content;
    if (body.audio_url !== undefined) updateData.audio_url = body.audio_url;
    if (body.english_transcript !== undefined) updateData.english_transcript = body.english_transcript;
    if (body.chinese_translation !== undefined) updateData.chinese_translation = body.chinese_translation;
    if (body.sentences !== undefined) updateData.sentences = body.sentences;
    
    const { data, error } = await client
      .from('questions')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();
    
    if (error) throw new Error(`更新失败: ${error.message}`);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('更新Question失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
