# IELTS TTS 功能实施计划

## 任务列表

### Task 1: 创建 TTS API 路由
- 文件：`/api/tts/route.ts`
- 功能：调用 ElevenLabs API 生成音频
- 返回：音频 URL
- 状态：pending

### Task 2: 修改 QuestionItem 组件
- 文件：`/topics/[id]/page.tsx` 中的 `QuestionItem` 组件
- 功能：
  - 添加模式切换图标（🎤 语音转文字 / 📝 文字转语音）
  - 悬浮显示模式标签
  - TTS 模式：输入框 + 音色选择
  - STT 模式：上传区域
  - 整合现有音频播放功能
- 音色选项：英音男、英音女、美音男、美音女
- 状态：pending

### Task 3: 测试验证
- 运行 `pnpm dev` 测试功能
- 验证 TTS 生成和播放
- 验证模式切换
- 状态：pending
