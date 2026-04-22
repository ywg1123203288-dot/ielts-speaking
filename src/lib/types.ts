// 数据库表类型定义

// 用户类型
export interface User {
  id: string;
  email: string;
  subscriptionStatus: 'free' | 'active' | 'expired' | 'banned';
  expiresAt: string | null;
}

export interface Part {
  id: number;
  name: string;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface Topic {
  id: number;
  part_id: number;
  user_id: string; // 用户ID，用于数据隔离
  name: string;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface Card {
  id: number;
  topic_id: number;
  title: string;
  description?: string; // Part 2 题目完整描述
  hints?: string[]; // Part 2 的四个提示点
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface TimestampedSentence {
  text: string;
  start: number;
  end: number;
}

export interface Question {
  id: number;
  card_id: number;
  content: string;
  audio_url?: string;
  english_transcript?: string;
  chinese_translation?: string;
  sentences?: TimestampedSentence[];
  note?: string;
  order: number;
  created_at: string;
  updated_at?: string;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 带关联数据的类型
export interface TopicWithCards extends Topic {
  cards?: Card[];
  card_count?: number;
}

export interface CardWithQuestions extends Card {
  questions?: Question[];
  question_count?: number;
  topic_name?: string; // 用于显示卡片所属的话题名称
  part_id?: number; // Part 2/3 标识
}

// 新增：直接从 API 获取的卡片类型（带 part 信息）
export interface CardWithPart extends Card {
  part_id: number;
}
