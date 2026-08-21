---
Updated: 2026-08-21 17:00
生命周期: 永久保存
保存位置: docs/standard/ACE-Step1.5指南.md
---

# ACE Step1.5 API 使用指南

> **状态**: 已验证  
> **官方仓库**: https://github.com/ace-step/ACE-Step-1.5  
> **API 地址**: https://api.acemusic.ai  
> **关联**: `/workspace/lemong-agent/` — Lemong Agent 独立音乐创作代理

---

## 一、概述

### 1.1 设计哲学

ACE Step1.5 核心理念是 **"以人为中心的生成"**——AI 是创作合作者而非替代者，通过快速迭代将零碎想法打磨成完整音乐。

### 1.2 产品定位

ACE Step1.5 是一个高性能的文本到音乐生成模型，支持多种风格、歌词输入和不同的音频时长。当前云端 API 使用 **OpenAI 兼容的 Chat Completions** 接口。

### 1.3 技术架构

| 组件 | 角色 |
|------|------|
| **LM（语言模型）** | "总规划师"——将简单描述扩展为歌曲蓝图，自动规划歌词、元数据、音乐描述 |
| **DiT（扩散变换器）** | "演奏者"——根据 LM 生成的蓝图合成高保真音频 |

支持通过 API 传入外部模型生成的歌词（`lyrics` 参数），可与任意 LLM 协作。

---

## 二、API 端点与认证

### 2.1 API 端点

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/v1/chat/completions` | POST | ✅ 可用 | 音乐生成（OpenAI 兼容） |
| `/v1/models` | GET | ✅ 可用 | 列出可用模型 |
| `/health` | GET | ✅ 可用 | 健康检查 |

> ⚠️ 旧的 `/release_task` + `/query_result` 异步流程端点已下线（返回 404）。

### 2.2 认证方式

使用 Header Bearer Token：

```
Authorization: Bearer {ACE_API_KEY}
```

API Key 存储在 `.env` 文件中，通过 `ACE_API_KEY` 环境变量读取。

### 2.3 API 申请

- **申请地址**: [acemusic.ai/api-key](https://acemusic.ai/api-key)
- **认证**: `Authorization: Bearer <API_KEY>`

---

## 三、操作模式

| 模式 | 说明 |
|------|------|
| **Simple** | 自然语言描述（如"适合安静夜晚的柔和情歌"），AI 自动生成歌词和元数据 |
| **Custom** | 手动精确控制 Caption、歌词及所有参数 |
| **Cover** | 上传音频，改变风格但保留结构 |
| **Repaint** | 重新生成音频的特定时间段 |
| **Extract/Lego/Complete** | 基础模型独有，用于音轨分离、重组等 |

---

## 四、核心参数

### 4.1 音乐内容描述

| 参数 | 说明 | 技巧 |
|------|------|------|
| `caption` | 描述风格、乐器、情绪等 | **建议用英文**，效果更稳定；避免风格冲突，可按时序描述 |
| `lyrics` | 歌词文本，纯音乐填 `[Instrumental]` | 使用 `[Verse]`、`[Chorus]` 等结构标签 |

### 4.2 音乐结构与元数据

| 参数 | 说明 |
|------|------|
| `duration` / `audio_duration` | 生成音频长度（10秒 ~ 10分钟） |
| `bpm` | 音乐速度 |
| `key_scale` | 调式 |
| `time_signature` | 拍号 |
| `vocal_language` | 人声语言（`zh` / `en` / `ja`） |

### 4.3 模型与性能控制

| 参数 | 说明 |
|------|------|
| `thinking` | 启用 5Hz LM 生成高质量音频代码，**强烈建议开启** |
| `model` | DiT 模型选择（如 `acestep-v15-turbo`） |
| `audio_format` | 输出格式：`mp3` / `wav` / `flac` |
| `seed` | 固定后可重复生成相同结果 |

> 参数同时支持 `snake_case` 和 `camelCase`（如 `audio_duration` / `duration` / `audioDuration`）。

---

## 五、音乐生成

### 5.1 请求格式

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

### 5.2 模型信息

```
ID: acemusic/acestep-v1.5-turbo
上下文长度: 4096 tokens
输入模态: text, audio
输出模态: audio, text
采样参数: temperature, top_p
```

### 5.3 Prompt 构建

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

### 5.4 响应格式

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

### 5.5 关键字段

| 路径 | 说明 |
|------|------|
| `choices[0].message.audio[0].audio_url.url` | base64 编码的 MP3 音频 |
| `choices[0].message.content` | 音乐元数据（有歌词时简化为 "Music generated successfully."） |

---

## 六、歌词输入方式

| 方式 | 场景 |
|------|------|
| 直接粘贴 | 代码中字符串传递，适合快速测试 |
| 从文件读取 | `--lyrics-file` 指定 `.txt` 文件 |
| AI 自动生成 | 设置 `auto-generate`，让模型根据 caption 创作 |
| `instruction.txt` 编辑 | 启用 `thinking=true` 时 CLI 生成，可预生成前微调 |
| 标准 LRC 格式 | 带时间戳 `[mm:ss.xx]`，实现歌词与音乐精确同步 |

---

## 七、音频处理流程

```
响应 JSON
  → 提取 data:audio/mpeg;base64, 后的 base64 字符串
  → Buffer.from(base64, 'base64')
  → fs.writeFileSync(path/to/output.mp3)
```

---

## 八、错误码

| HTTP 状态码 | 说明 | 处理方式 |
|-------------|------|----------|
| 200 | 成功 | - |
| 400 | 请求无效 | 检查参数格式 |
| 401/403 | API Key 无效或已过期 | 检查 `.env` 中的 `ACE_API_KEY` |
| 404 | 端点不存在 | 检查 Base URL |
| 429 | 请求过于频繁 | 等待 30 秒后重试 |
| 500 | 服务器内部错误 | 稍后重试 |

---

## 九、已知限制

| 问题 | 影响 | 应对 |
|------|------|------|
| 有歌词时无元数据 | 无法获取 BPM/Key/Duration | 使用 style/tempo 参数作为 fallback |
| 生成时间 60-120s | 用户等待较长 | 超时设为 3 分钟 |
| 上下文长度 4096 | 长歌词可能截断 | 歌词控制在 400 字以内 |
| 无进度反馈 | 等待期间无进度指示 | 显示"作曲中…"状态 |

---

## 十、部署选项

### 10.1 在线 API（推荐）

- **Base URL**: `https://api.acemusic.ai/v1`
- **优势**: 稳定、无需维护、最新版本
- **劣势**: 需要付费、请求频率限制

### 10.2 本地部署

```bash
git clone https://github.com/ace-step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv run acestep-openrouter --host 0.0.0.0 --port 8002
```

- **Gradio 界面**: `http://localhost:7860`
- **API 端点**: `http://localhost:8001`
- **优势**: 免费、无限制、数据私有
- **劣势**: 需要硬件支持、需要维护

### 10.3 第三方平台

| 平台 | 说明 |
|------|------|
| deAPI.ai | 免费试用额度 |
| DeepInfra | `https://api.deepinfra.com/v1/inference/ACE-Step/acestep-v15-xl-sft` |
| fal.ai | 环境变量 `FAL_KEY` |
| WaveSpeedAI | 专用 API 服务 |

---

## 十一、进阶技巧

1. **迭代工作流**: 摆脱"一次成型"，利用"生成-聆听-调整"快速循环
2. **提示词工程**: 精确描述风格、节奏、配器、情感弧光
3. **善用 `format_sample`**: 让 5Hz LM 自动优化你的粗略描述
4. **英文 Caption**: 用英文写提示词效果通常更稳定
5. **LoRA 适配器**: 本地部署可训练专属音乐风格

---

## 十二、Lemong Agent 预设风格

详见 `lemong-agent/templates/` 目录，每种风格包含完整的 prompt 模板、BPM、乐器、情绪参数。

| # | 风格 | BPM 范围 | 核心乐器 |
|---|------|----------|----------|
| 1 | 中文古风 | 70-90 | 古筝、笛子、二胡、琵琶 |
| 2 | 流行 | 90-120 | 钢琴、木吉他、合成器 |
| 3 | 校园民谣 | 75-95 | 木吉他（指弹）、箱鼓、口琴 |
| 4 | 爵士 | 80-110 | 萨克斯、钢琴、低音提琴 |
| 5 | 电子 | 120-140 | 合成器、鼓机、贝斯合成器 |
| 6 | 男女对唱 | 75-95 | 钢琴、弦乐、木吉他 |

---

## 十三、项目信息

| 项目 | 详情 |
|------|------|
| **研发方** | 阶跃星辰（StepFun）+ ACE Studio（北京时域科技有限公司） |
| **核心作者** | Junmin Gong（一作）、Yulin Song、Wenxiao Zhao、Sen Wang 等 |
| **首次开源** | 2025-05-07（v1-3.5B） |
| **v1.5 发布** | 2026-01-28 |

### 关键链接

| 资源 | URL |
|------|-----|
| 官方主仓库 | <https://github.com/ace-step/ACE-Step> |
| v1.5 代码库 | <https://github.com/ace-step/ACE-Step-1.5> |
| 在线 Demo | <https://huggingface.co/spaces/ACE-Step/ACE-Step> |
| 中文教程 | <https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/zh/Tutorial.md> |
| API 文档 | <https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md> |
| Discord 社区 | <https://discord.gg/PeWDxrkdj7> |

---

## 变更记录

| 日期 | 变更 | 变更人 |
|------|------|--------|
| 2026-08-21 17:00 | 合并 ACE-Step1.5参考资料.md 内容，优化章节结构 | yuleague |
| 2026-07-14 | 初始版本，记录 API 使用指南 | yuleague |