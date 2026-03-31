// 数据库表类型定义

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
  name: string;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface Card {
  id: number;
  topic_id: number;
  title: string;
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
}
