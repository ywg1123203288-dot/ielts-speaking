import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST() {
  try {
    const client = getSupabaseClient();

    // 检查表是否已存在（通过查询 parts 表）
    const { data: existingParts, error: partsError } = await client
      .from('parts')
      .select('id')
      .limit(1);
    
    // 如果查询成功，说明表已存在
    if (!partsError && existingParts !== null) {
      // 检查是否需要插入初始数据
      const { data: parts } = await client.from('parts').select('*');
      
      if (!parts || parts.length === 0) {
        // 插入默认 Part 数据
        await client.from('parts').insert([
          { name: 'Part 1', order: 1 },
          { name: 'Part 2', order: 2 },
          { name: 'Part 3', order: 3 }
        ]);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: '数据库已存在，已检查初始数据' 
      });
    }

    // 表不存在，返回建表 SQL
    return NextResponse.json({ 
      success: false, 
      error: '数据库表不存在，请先在 Supabase 控制台执行建表 SQL',
      sql: getCreateTableSQL()
    });

  } catch (error) {
    console.error('初始化数据库失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    sql: getCreateTableSQL(),
    instructions: [
      '1. 打开 Supabase 控制台',
      '2. 进入 SQL Editor',
      '3. 复制下方 SQL 并执行',
      '4. 刷新此页面点击初始化按钮'
    ]
  });
}

function getCreateTableSQL(): string {
  return `
-- IELTS 口语素材库 建表 SQL
-- 在 Supabase SQL Editor 中执行以下语句：

-- 创建 parts 表
CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 topics 表
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  part_id INTEGER REFERENCES parts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 创建 cards 表
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT, -- Part 2 题目完整描述（如 "You should say..."）
  hints JSONB, -- Part 2 的四个提示点数组
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 创建 questions 表
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  audio_url TEXT,
  english_transcript TEXT,
  chinese_translation TEXT,
  sentences JSONB,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 插入默认 Part 数据
INSERT INTO parts (name, "order") VALUES
  ('Part 1', 1),
  ('Part 2', 2),
  ('Part 3', 3)
ON CONFLICT DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_topics_part_id ON topics(part_id);
CREATE INDEX IF NOT EXISTS idx_cards_topic_id ON cards(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_card_id ON questions(card_id);
`;
}
