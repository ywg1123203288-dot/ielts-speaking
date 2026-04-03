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

## 快速部署（10-15分钟）

### 第一步：创建 Supabase 数据库（免费）

1. 访问 [supabase.com](https://supabase.com)，注册账号
2. 点击 **New Project** 创建新项目
3. 填写项目名称和数据库密码
4. 选择离你最近的区域（如 Singapore）
5. 等待项目创建完成（约 1-2 分钟）

### 第二步：获取 Supabase 环境变量

1. 进入项目后，点击左侧 **Settings** (齿轮图标)
2. 点击 **API**
3. 复制以下两个值：
   - **Project URL** → 这就是 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → 这就是 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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

### 第四步：获取第三方 API 密钥

#### OpenAI API（语音转文字）
1. 访问 [platform.openai.com](https://platform.openai.com)
2. 注册账号并充值（或使用免费额度）
3. 获取 API Key

#### DeepL API（翻译）
1. 访问 [deepl.com/pro-api](https://www.deepl.com/pro-api)
2. 注册账号（免费版每月 50 万字符）
3. 获取 API Key

#### Cloudflare R2（音频存储，免费）
1. 注册 [Cloudflare](https://dash.cloudflare.com)
2. 左侧菜单 → Workers & Pages → R2
3. 创建 bucket，记住 bucket 名称
4. 获取 R2 API Token：
   - 左侧菜单 → My Profile → API Tokens
   - 创建 Custom Token，权限选择 "Edit"
   - 记录 Account ID（右侧边栏）、Access Key、Secret Key

### 第五步：部署到 Vercel

1. 将代码推送到 GitHub
2. 访问 [vercel.com](https://vercel.com)
3. Import 你的 GitHub 仓库
4. 在 Environment Variables 中添加以下变量：

```
NEXT_PUBLIC_SUPABASE_URL = 你的 Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY = 你的 Supabase anon key
OPENAI_API_KEY = 你的 OpenAI API Key
DEEPL_API_KEY = 你的 DeepL API Key
CF_ACCOUNT_ID = 你的 Cloudflare Account ID
CF_ACCESS_KEY_ID = 你的 R2 Access Key
CF_SECRET_ACCESS_KEY = 你的 R2 Secret Key
CF_BUCKET_NAME = 你的 R2 Bucket 名称
CF_PUBLIC_BUCKET_DOMAIN = 你的 R2 公开域名（如 xxx.r2.dev）
```

5. 点击 Deploy

### 第六步：配置 R2 公开访问

1. 在 Cloudflare R2 控制台，找到你的 bucket
2. Settings → Visibility → 改为 **Public**
3. 或者创建 Custom Domain 绑定到你的 bucket

---

## 常见问题

### Q: 数据会丢失吗？
A: 数据存储在 Supabase 云端数据库，不会丢失。即使重新部署代码，数据也会保留。

### Q: 可以多人共用吗？
A: 目前是单用户模式，所有人共享数据。如果需要多用户，建议每个人都部署自己的版本。

### Q: 音频存储在哪里？
A: 音频文件存储在 Cloudflare R2 对象存储中，数据库只存储 URL。

### Q: 转写功能支持哪些格式？
A: 支持 m4a, mp3, wav, aac, ogg 等常见音频格式。

### Q: 这些服务要花多少钱？
A:
- **Supabase**: 免费
- **OpenAI Whisper**: $0.006/分钟（约 1 元人民币转写 16 分钟音频）
- **DeepL**: 免费版每月 50 万字符，够用就不花钱
- **Cloudflare R2**: 免费 10 万次请求 + 1GB 存储

---

## 技术栈

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **ASR**: OpenAI Whisper
- **Translation**: DeepL API
- **Storage**: Cloudflare R2

---

## License

MIT
