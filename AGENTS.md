# IELTS 口语素材库 - 项目文档

## 项目概述

**项目名称：** IELTS 口语素材库  
**项目类型：** 雅思口语学习工具 + 网页应用  
**核心功能：** 
- 音频上传与自动转文字
- 中英文对照显示
- 句子时间戳跳转播放
- 倍速播放控制
- 句子高亮播放（马卡龙色系）
- 问题拖拽排序

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Audio Processing**: OpenAI Whisper
- **Translation**: DeepL API
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable

## 数据库结构

### 表关系

```
parts (Part 1/2/3 分类)
 └── topics (话题)
      └── cards (卡片)
           └── questions (问题)
                ├── audio_url (音频URL)
                ├── english_transcript (英文原文)
                ├── chinese_translation (中文翻译)
                └── sentences (时间戳句子JSON)
```

### 表字段说明

#### parts
- `id`: 主键
- `name`: Part名称 (Part 1, Part 2, Part 3)
- `order`: 排序

#### topics
- `id`: 主键
- `part_id`: 关联Part
- `name`: 话题名称
- `order`: 排序

#### cards
- `id`: 主键
- `topic_id`: 关联Topic
- `title`: 卡片标题
- `order`: 排序

#### questions
- `id`: 主键
- `card_id`: 关联Card
- `content`: 问题内容
- `audio_url`: 音频文件URL
- `english_transcript`: 英文转写文本
- `chinese_translation`: 中文翻译
- `sentences`: 时间戳句子数组 `[{text, start, end}]`

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/               
│   │   ├── api/           # API路由
│   │   │   ├── parts/     # Part CRUD
│   │   │   ├── topics/    # Topic CRUD
│   │   │   ├── cards/     # Card CRUD
│   │   │   ├── questions/ # Question CRUD
│   │   │   ├── transcribe/# 音频转写
│   │   │   └── translate/ # 文本翻译
│   │   ├── topics/[id]/   # 话题详情页
│   │   ├── layout.tsx     # 根布局
│   │   ├── page.tsx       # 主页
│   │   └── globals.css    # 全局样式
│   ├── components/ui/     # Shadcn UI 组件库
│   ├── lib/              
│   │   ├── types.ts       # 类型定义
│   │   └── utils.ts       # 工具函数
│   └── storage/database/  
│       ├── shared/schema.ts      # Drizzle Schema
│       └── supabase-client.ts    # Supabase客户端
```

## API 端点

### Parts API
- `GET /api/parts` - 获取所有Part

### Topics API
- `GET /api/topics?partId={id}` - 获取某Part下的所有话题
- `POST /api/topics` - 创建新话题
- `GET /api/topics/[id]` - 获取话题详情（含卡片）
- `DELETE /api/topics/[id]` - 删除话题

### Cards API
- `POST /api/cards` - 创建新卡片
- `GET /api/cards?topicId={id}` - 获取某话题下的所有卡片
- `PUT /api/cards/[id]` - 更新卡片
- `DELETE /api/cards/[id]` - 删除卡片

### Questions API
- `POST /api/questions` - 创建新问题
- `GET /api/questions?cardId={id}` - 获取某卡片下的所有问题
- `PUT /api/questions/[id]` - 更新问题（含音频、转写、翻译）
- `DELETE /api/questions/[id]` - 删除问题
- `POST /api/questions/reorder` - 批量更新问题排序

### 音频处理 API
- `POST /api/transcribe` - 音频转写（FormData: audio, questionId）
- `POST /api/translate` - 文本翻译（JSON: text, questionId）

## 开发规范

### 包管理
**仅允许使用 pnpm**，严禁使用 npm 或 yarn。

```bash
pnpm add <package>          # 安装依赖
pnpm add -D <package>       # 安装开发依赖
pnpm install                # 安装所有依赖
```

### 数据库操作
- 使用 Supabase SDK 进行CRUD操作
- 字段名使用 snake_case
- 每次操作必须检查 `{ data, error }` 并处理错误
- 删除/更新操作必须带 filter

### 前端开发
- 使用 'use client' 标记客户端组件
- 避免在 JSX 中直接使用动态数据
- 使用 shadcn/ui 组件
- 遵循 Tailwind CSS 规范

### 样式规范
- 主色调：马卡龙色系
  - Pink: `#fb80c0`
  - Mint: `#99ded6`
  - Lavender: `#b084c0`
  - Purple: `#4a4492`
- 设计风格：简约 + 水彩质感
- 卡片使用圆角设计（rounded-2xl）
- 添加装饰性模糊背景元素

## 构建与运行

### 开发环境
```bash
pnpm dev    # 启动开发服务器（端口5000）
```

### 生产环境
```bash
pnpm build  # 构建
pnpm start  # 启动生产服务器
```

### 类型检查
```bash
npx tsc --noEmit  # TypeScript类型检查
```

## 使用流程

1. **创建话题**：在主页选择Part，点击"新增话题"
2. **创建卡片**：进入话题详情页，点击"新增卡片"
3. **添加问题**：展开卡片，点击"添加问题"，在输入框中输入或粘贴问题内容
4. **上传音频**：点击上传区域，选择音频文件
5. **转写文字**：点击"转文字"按钮，自动转写英文
6. **翻译**：点击"翻译"按钮，获取中文翻译
7. **练习**：点击句子跳转播放，使用倍速功能跟读
8. **句子高亮**：播放时当前句子自动高亮显示（马卡龙色系）
9. **拖拽排序**：拖动问题左侧的拖拽手柄调整顺序，自动更新Q1/Q2/Q3编号
10. **手动微调时间戳**：点击句子右侧的时间戳，可手动编辑开始/结束时间，支持+/-0.1秒快速调整

## 注意事项

1. **隐私安全**：所有数据存储在云端数据库
2. **音频格式**：支持 m4a, mp3, wav, aac, ogg
3. **翻译限制**：有请求频率限制，大量翻译建议分批进行
4. **浏览器兼容**：推荐使用 Chrome 或 Safari
5. **拖拽排序**：问题拖拽时会自动保存新顺序，刷新页面后保持
6. **句子高亮**：高亮色系采用马卡龙风格（柔粉、薄荷绿、淡紫、深紫蓝）
