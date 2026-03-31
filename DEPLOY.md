# IELTS 口语素材库 - 部署指南

## 项目简介

这是一个帮助你收集和管理雅思口语语料库的工具，支持：
- 📝 音频上传与自动转文字
- 🌐 中英文对照显示
- 🎯 句子时间戳跳转播放
- ⏩ 倍速播放控制
- 🎨 句子高亮播放
- 📦 拖拽排序

---

## 快速部署（5-10分钟）

### 第一步：创建 Supabase 数据库（免费）

1. 访问 [supabase.com](https://supabase.com)，注册账号
2. 点击 **New Project** 创建新项目
3. 填写项目名称和数据库密码
4. 选择离你最近的区域（如 Singapore）
5. 等待项目创建完成（约 1-2 分钟）

### 第二步：获取环境变量

1. 进入项目后，点击左侧 **Settings** (齿轮图标)
2. 点击 **API**
3. 复制以下两个值：
   - **Project URL** → 这就是 `COZE_SUPABASE_URL`
   - **anon public** key → 这就是 `COZE_SUPABASE_ANON_KEY`

### 第三步：创建数据库表

1. 在 Supabase 左侧点击 **SQL Editor**
2. 点击 **New query**
3. 复制以下 SQL 并执行：

```sql
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
  ('Part 3', 3);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_topics_part_id ON topics(part_id);
CREATE INDEX IF NOT EXISTS idx_cards_topic_id ON cards(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_card_id ON questions(card_id);
```

### 第四步：部署到 Coze

1. 在 Coze 平台创建新项目
2. 选择 **Next.js** 模板
3. 复制本项目的所有代码到项目中
4. 配置环境变量：
   - `COZE_SUPABASE_URL` = 你的 Supabase URL
   - `COZE_SUPABASE_ANON_KEY` = 你的 Supabase anon key
5. 点击部署

### 第五步：开始使用

部署成功后，打开网站即可开始使用！

---

## 常见问题

### Q: 数据会丢失吗？
A: 数据存储在 Supabase 云端数据库，不会丢失。即使重新部署代码，数据也会保留。

### Q: 可以多人共用吗？
A: 目前是单用户模式，所有人共享数据。如果需要多用户，建议每个人都部署自己的版本。

### Q: 音频存储在哪里？
A: 音频文件存储在 Coze 对象存储中，数据库只存储 URL。

### Q: 转写功能支持哪些格式？
A: 支持 m4a, mp3, wav, aac, ogg 等常见音频格式。

---

## 技术栈

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **ASR/TTS**: coze-coding-dev-sdk

---

## License

MIT
