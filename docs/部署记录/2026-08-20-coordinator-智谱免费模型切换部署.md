---
Updated: 2026-08-20 19:10
生命周期: 永久保存
保存位置: docs/部署记录/2026-08-20-coordinator-智谱免费模型切换部署.md
---

# 2026-08-20 · Coordinator 智谱免费模型切换部署

## 背景

Xujie-Writer 全环节 LLM 切换智谱免费模型（见修改记录 2026-08-20 条目）。Coordinator 意图解析（parser.js）与对话生成（reply.js）降级链由「DeepSeek 主」重排为「智谱免费主」。

## 变更文件

| 文件 | 变更 |
|------|------|
| `src/intent/parser.js` | 降级链重排：智谱 GLM-4.7-Flash（主,免费）→ GLM-4-Flash（备用,免费）→ DeepSeek（兜底,计费）→ 关键词匹配 |
| `src/intent/reply.js` | 同上：智谱免费主 → DeepSeek 计费兜底 → 硬编码文案 |
| `src/config.js` | 启动日志文案同步（智谱主 / DeepSeek 兜底） |

部署前服务器端旧文件均已备份：`parser.js.bak.20260820` / `reply.js.bak.20260820`（`/opt/mirage-studio/coordinator-agent/src/intent/`）。

## 服务器 .env 配置

`/opt/mirage-studio/coordinator-agent/.env`：

- `ZHIPU_API_KEY` — **已存在且实测有效**（与本地一致，智谱 API 实测 HTTP 200），本次无需新增
- `ZHIPU_MODEL=glm-4-flashx` — 本次新增显式配置

> **主模型选择说明**：代码默认 `glm-4.7-flash`，但部署当日实测该模型返回智谱 1305「访问量过大」（模型级限流，非 key 问题）。经实测，`glm-4-flashx`（可用、能力强于 glm-4-flash）、`glm-4-flash`（可用、稳定）为当前可用免费模型；`glm-4.6-flash` 该 key 无权（1220）；`glm-4.5-flash` 带推理模式（短 max_tokens 下 content 易空）。故生产主模型临时设为 `glm-4-flashx`，限流缓解后可改回 `glm-4.7-flash`（修改 `.env` 一行后 `pm2 restart coordinator --update-env` 即可）。

## 部署步骤（已执行）

```bash
# 1. 上传文件
scp src/intent/parser.js src/intent/reply.js src/config.js ubuntu@<host>:/tmp/
# 2. 服务器端备份旧版 + 替换
cd /opt/mirage-studio/coordinator-agent/src/intent
cp parser.js parser.js.bak.20260820 && cp reply.js reply.js.bak.20260820
sudo cp /tmp/parser.js parser.js && sudo cp /tmp/reply.js reply.js
# 3. .env 追加主模型
echo "ZHIPU_MODEL=glm-4-flashx" | sudo tee -a .env
# 4. 重启
pm2 restart coordinator --update-env
```

## 验证结果（实测通过）

- 启动日志：`[Config] AI 引擎: 智谱 GLM-4.7-Flash (主,免费)` → 实际按 `.env` 显式配置 `glm-4-flashx`；`[Config] AI 引擎: DeepSeek (兜底,计费)`
- 意图解析：`[IntentParser] 智谱 glm-4-flashx 解析成功`（"帮我写一首关于夏天的民谣歌曲" → lemong 意图，confidence 0.9）
- 对话生成：glm-4-flashx 真实生成「大副」自我介绍（非硬编码兜底）
- 降级链验证：glm-4.7-flash 限流时自动降级 glm-4-flash 成功

## 遗留

- `glm-4.7-flash` 限流为临时状态，缓解后可切回（能力更强）
- 本地 `.env` 已同步 `ZHIPU_MODEL=glm-4-flashx`（llm-gateway.js 与 coordinator 共用）
