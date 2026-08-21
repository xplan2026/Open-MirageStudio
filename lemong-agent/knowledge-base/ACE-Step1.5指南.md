# ACE-Step 1.5 指南

> **状态**: 已验证  
> **最后更新**: 2026-07-14  
> **官方仓库**: https://github.com/ace-step/ACE-Step-1.5  
> **API 地址**: https://api.acemusic.ai

---

## 概述

ACE Step1.5 是一个高性能的文本到音乐生成模型，支持多种风格、歌词输入和不同的音频时长。当前云端 API 使用 **OpenAI 兼容的 Chat Completions** 接口。

---

## API 端点

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/v1/chat/completions` | POST | ✅ 可用 | 音乐生成（OpenAI 兼容） |
| `/v1/models` | GET | ✅ 可用 | 列出可用模型 |
| `/health` | GET | ✅ 可用 | 健康检查 |

> ⚠️ 旧的 `/release_task` + `/query_result` 异步流程端点已下线（返回 404）。

---

## 认证

使用 Header Bearer Token：

```
Authorization: Bearer {ACE_API_KEY}
```

API Key 存储在 `.env` 文件中，通过 `ACE_API_KEY` 环境变量读取。

---

## 音乐生成

### 请求格式

```bash
curl -X POST https://api.acemusic.ai/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "acemusic/acestep-v1.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "Generate music: {风格描述}. Use Chinese vocal language.\n\nLyrics:\n{歌词}"
      }
    ],
    "max_tokens": 4000
  }'
```

### 模型信息

```
ID: acemusic/acestep-v1.5-turbo
上下文长度: 4096 tokens
输入模态: text, audio
输出模态: audio, text
采样参数: temperature, top_p
```

### Prompt 构建

```
Generate music: {风格描述}. Use Chinese vocal language.

Lyrics:
{歌词文本}

Tempo: {速度 BPM}
Instruments: {乐器列表}
Mood: {情绪描述}
```

- **中文歌词**：必须添加 `Use Chinese vocal language.`
- **英文歌词**：无需额外提示

### 响应格式

```json
{
  "id": "chatcmpl-xxx",
  "model": "acemusic/acestep-v1.5-turbo",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "## Metadata\n**BPM:** 120\n**Duration:** 18s\n**Key:** A♭ major",
      "audio": [{
        "type": "audio_url",
        "audio_url": {
          "url": "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0U..."
        }
      }]
    }
  }],
  "usage": { "total_tokens": 100 }
}
```

### 关键字段

| 路径 | 说明 |
|------|------|
| `choices[0].message.audio[0].audio_url.url` | base64 编码的 MP3 音频 |
| `choices[0].message.content` | 音乐元数据（有歌词时简化为 "Music generated successfully."） |

---

## 音频处理流程

```
响应 JSON
  → 提取 data:audio/mpeg;base64, 后的 base64 字符串
  → Buffer.from(base64, 'base64')
  → fs.writeFileSync(path/to/output.mp3)
```

---

## 错误码

| HTTP 状态码 | 说明 | 处理方式 |
|-------------|------|----------|
| 200 | 成功 | - |
| 400 | 请求无效 | 检查参数格式 |
| 401/403 | API Key 无效或已过期 | 检查 `.env` 中的 `ACE_API_KEY` |
| 404 | 端点不存在 | 检查 Base URL |
| 429 | 请求过于频繁 | 等待 30 秒后重试 |
| 500 | 服务器内部错误 | 稍后重试 |

---

## 已知限制

| 问题 | 影响 | 应对 |
|------|------|------|
| 有歌词时无元数据 | 无法获取 BPM/Key/Duration | 使用 style/tempo 参数作为 fallback |
| 生成时间 60-120s | 用户等待较长 | 超时设为 3 分钟 |
| 上下文长度 4096 | 长歌词可能截断 | 歌词控制在 400 字以内 |
| 无进度反馈 | 等待期间无进度指示 | 显示"作曲中…"状态 |

---

## 6 种预设风格（Lemong-Music 模板）

详见 `subagents/lemong-music/templates/` 目录，每种风格包含完整的 prompt 模板、BPM、乐器、情绪参数。

| # | 风格 | BPM 范围 | 核心乐器 |
|---|------|----------|----------|
| 1 | 中文古风 | 70-90 | 古筝、笛子、二胡、琵琶 |
| 2 | 流行 | 90-120 | 钢琴、木吉他、合成器 |
| 3 | 校园民谣 | 75-95 | 木吉他（指弹）、箱鼓、口琴 |
| 4 | 爵士 | 80-110 | 萨克斯、钢琴、低音提琴 |
| 5 | 电子 | 120-140 | 合成器、鼓机、贝斯合成器 |
| 6 | 男女对唱 | 75-95 | 钢琴、弦乐、木吉他 |
