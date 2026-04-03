# 问题记录

## 2026-03-31 / 2026-04-01: IELTS Speaking App 部署到 Vercel

### 问题 1: SSH Key 添加失败
**现象**: GitHub 拒绝 SSH Key，说格式不对
**原因**: 复制公钥时可能不完整
**解决**: 确保从 `ssh-ed25519` 开头到邮箱完整复制

### 问题 2: build.sh 脚本不存在
**现象**: `bash: ./scripts/build.sh: No such file or directory`
**原因**: 删除了 build.sh 但 package.json 的 build 命令还指向它
**解决**: 修改 package.json，`"build": "next build"`

### 问题 3: 环境变量读取失败
**现象**: API 返回 `NEXT_PUBLIC_SUPABASE_ANON_KEY is not set`
**原因**:
1. Coze 用 `COZE_SUPABASE_*`，Vercel 用 `NEXT_PUBLIC_SUPABASE_*`
2. 环境变量值没保存成功（显示感叹号）
**解决**: 删掉环境变量，重新添加，确保三个环境都勾选

### 问题 4: 环境变量感叹号
**现象**: Vercel 环境变量显示感叹号
**原因**: 值没有正确粘贴，可能有换行或空格
**解决**: 删掉重新添加

### 问题 5: 数据库重复数据
**现象**: Part 1/2/3 各显示多条
**原因**: SQL 测试时多次执行 INSERT
**解决**: 执行 DELETE 清理重复数据

### 问题 6: Supabase 项目暂停
**现象**: API 返回 500，项目显示 "INFRASTRUCTURE OVERDUE"
**原因**: 免费额度用完或欠费
**解决**: 点 Restore Project 或创建新项目

---

## 经验总结

1. **环境变量改完一定要 Redeploy**
2. **先 curl 测试 API 确认 key 可用，再配置 Vercel**
3. **迁移项目时先完整检查 package.json 的 scripts**
4. **浏览器直接访问 /api/xxx 比看日志更快定位问题**
