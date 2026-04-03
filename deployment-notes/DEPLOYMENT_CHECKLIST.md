# 部署检查清单

## Vercel 部署必查项

### 1. 环境变量配置
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://{ref}.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key（以 eyJ... 开头）
- [ ] **三个环境都要勾选**：Production, Preview, Development
- [ ] 保存后检查是否有感叹号（有问题要删掉重填）
- [ ] **必须 Redeploy 才能生效**

### 2. 代码检查（迁移项目时）
- [ ] 搜索 `coze_workload_identity` 等平台专用库
- [ ] 检查 `package.json` 的 `build` 命令指向的文件是否存在
- [ ] 检查环境变量命名（Coze 用 `COZE_*`，Vercel 用 `NEXT_PUBLIC_*`）
- [ ] 确认 export 语句与实际函数一致

### 3. 数据库检查
- [ ] 先用 curl 测试 API 是否通：
  ```bash
  curl "https://{ref}.supabase.co/rest/v1/parts" \
    -H "apikey: {anon_key}" \
    -H "Authorization: Bearer {anon_key}"
  ```
- [ ] SQL 测试时小心别重复 INSERT

### 4. Git 操作
- [ ] push 完成后确认 GitHub 上 commit 是最新的
- [ ] 再触发 Redeploy

---

## 快速排查方法

**问题：网站卡在"加载中..."**
1. 浏览器访问 `/api/parts` 看返回什么错误
2. 错误信息 "XXX is not set" → 环境变量没配置好
3. 401 Unauthorized → 环境变量值有问题
4. 500 → 服务端错误，看 Vercel 日志

**问题：Build 失败**
1. 看 Vercel 日志里的 commit 是否是最新的
2. `bash: ./scripts/build.sh: No such file` → build.sh 被删了但 package.json 还指向它
3. `Cannot find module 'typescript'` → build 脚本删了 devDependencies

---

## 常用命令

### 测试 Supabase API
```bash
curl "https://lxppsqxjhnvjupnichaf.supabase.co/rest/v1/parts" \
  -H "apikey: {anon_key}" \
  -H "Authorization: Bearer {anon_key}"
```

### 清理重复数据
```sql
DELETE FROM parts
WHERE id NOT IN (
  SELECT MIN(id)
  FROM parts
  GROUP BY name
);
```

### 常用 Git 命令
```bash
git add -A
git commit -m "描述"
git push
```
