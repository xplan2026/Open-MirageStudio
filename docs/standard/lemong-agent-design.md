---
Updated: 2026-08-21 15:45
生命周期: 永久保存
保存位置: docs/standard/lemong-agent-design.md
---

# Lemong Agent — AI 音乐创作设计文档

> **创建日期**: 2026-08-21
> **版本**: v1.0
> **状态**: 已部署
> **定位**: AI 音乐创作独立 Agent，用户指令触发
> **技术栈**: DeepSeek + ACE Step1.5 API
> **核心能力**: 歌词生成、音乐生成、精细化控制、精细提示词生成

---

## 一、定位与职责

### 1.1 核心定位

Lemong Agent 是 Mirage-Studio 的**AI 音乐创作独立 Agent**，负责使用 ACE Step1.5 API 创建 AI 歌曲，追求精细化控制和精细提示词生成。

### 1.2 核心职责

| 职责 | 说明 |
|------|------|
| **歌曲创作** | 从立意、歌词到音乐的完整创作流程 |
| **歌词生成** | 基于 DeepSeek 生成结构化歌词（含韵脚标注、情绪标注） |
| **音乐生成** | 使用 ACE Step1.5 API 生成音乐（注入二虎音色） |
| **精细化控制** | 提供风格、BPM、乐器、情绪等参数的精细控制 |
| **数据管理** | 维护歌曲构建产物（歌词 + 创作背景 + prompt + mp3） |

### 1.3 与其他 Agent 的关系

```
Xujie Writer Agent (小说创作)
    ↓ (提取灵感)
    ├─► 生成创作背景 → 调用 Lemong Agent
    ├─► 生成歌词 + 音乐
    └─► 返回歌曲产物 → Erhu Agent 制作 MV
```

> **重要约束**: Lemong Agent 为用户指令触发，非自动联动。小说更新不自动触发歌曲创作。

---

## 二、系统架构

### 2.1 目录结构

```
lemong-agent/
├── AGENTS.md                   # Agent 核心定义
├── GLOSSARY.md                 # Token 优化术语表
├── README.md                   # 入口文档
├── cli/                        # CLI 入口
│   └── lemong-agent
├── templates/                  # 风格模板（6种预设风格）
│   ├── 中文古风/
│   ├── 流行/
│   ├── 校园民谣/
│   ├── 爵士/
│   ├── 电子/
│   └── 男女对唱/
└── data/Lemong-data/           # 数据目录（参见 data-storage-design.md）
    ├── INDEX.md                # 歌曲索引
    └── {歌名}/                 # 每首歌一个独立子目录
        ├── {歌名}.mp3          # 生成的歌曲音频
        ├── 歌词.md             # 歌词（含结构标注）
        ├── 创作背景.md          # 原始创作描述
        └── prompt.json         # 音乐生成的 prompt 参数
```

### 2.2 数据流

```
用户指令 (创作歌曲)
    ↓
生成创作背景 (DeepSeek)
    ↓
生成结构化歌词 (DeepSeek + 韵脚/情绪标注)
    ↓
选择风格模板 (6种预设风格)
    ↓
构建 ACE Step1.5 Prompt
    ↓
调用 ACE Step1.5 API
    ↓
保存歌曲产物 (mp3 + 歌词.md + 创作背景.md + prompt.json)
```

---

## 三、ACE Step1.5 API 集成

### 3.1 API 端点

| 端点 | 方法 | 状态 | 说明 |
|------|------|------|------|
| `/v1/chat/completions` | POST | ✅ 可用 | 音乐生成（OpenAI 兼容） |
| `/v1/models` | GET | ✅ 可用 | 列出可用模型 |
| `/health` | GET | ✅ 可用 | 健康检查 |

### 3.2 模型信息

```
ID: acemusic/acestep-v1.5-turbo
上下文长度: 4096 tokens
输入模态: text, audio
输出模态: audio, text
采样参数: temperature, top_p
```

### 3.3 认证

使用 Header Bearer Token：

```http
Authorization: Bearer {ACE_API_KEY}
```

API Key 存储在 `.env` 文件中，通过 `ACE_API_KEY` 环境变量读取。

### 3.4 请求格式

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

### 3.5 响应格式

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

### 3.6 音频处理流程

```
响应 JSON
  → 提取 data:audio/mpeg;base64, 后的 base64 字符串
  → Buffer.from(base64, 'base64')
  → fs.writeFileSync(path/to/output.mp3)
```

### 3.7 错误处理

| HTTP 状态码 | 说明 | 处理方式 |
|-------------|------|----------|
| 200 | 成功 | — |
| 400 | 请求无效 | 检查参数格式 |
| 401/403 | API Key 无效或已过期 | 检查 `.env` 中的 `ACE_API_KEY` |
| 404 | 端点不存在 | 检查 Base URL |
| 429 | 请求过于频繁 | 等待 30 秒后重试 |
| 500 | 服务器内部错误 | 稍后重试 |

---

## 四、Prompt 工程设计

### 4.1 Prompt 构建

```text
Generate music: {风格描述}. Use Chinese vocal language.

Lyrics:
{歌词文本}

Tempo: {速度 BPM}
Instruments: {乐器列表}
Mood: {情绪描述}
```

**关键要点**：
- **中文歌词**：必须添加 `Use Chinese vocal language.`
- **英文歌词**：无需额外提示
- **韵脚标注**：歌词需标注韵脚（如 [韵脚A]）
- **情绪标注**：歌词需标注情绪（如 [情绪:悲伤]）

### 4.2 歌词结构

```markdown
# 歌名

## 创作背景

（从小说提取或用户提供）

## 歌词

[情绪:叙事]
第一段歌词 [韵脚A]

[情绪:悲伤]
第二段歌词 [韵脚B]

[情绪:高亢]
副歌部分 [韵脚A]
```

### 4.3 六种预设风格

| # | 风格 | BPM 范围 | 核心乐器 | 情绪 |
|---|------|----------|----------|------|
| 1 | 中文古风 | 70-90 | 古筝、笛子、二胡、琵琶 | 古典、悠扬 |
| 2 | 流行 | 90-120 | 钢琴、木吉他、合成器 | 现代、时尚 |
| 3 | 校园民谣 | 75-95 | 木吉他（指弹）、箱鼓、口琴 | 青春、清新 |
| 4 | 爵士 | 80-110 | 萨克斯、钢琴、低音提琴 | 自由、慵懒 |
| 5 | 电子 | 120-140 | 合成器、鼓机、贝斯合成器 | 动感、未来 |
| 6 | 男女对唱 | 75-95 | 钢琴、弦乐、木吉他 | 温暖、对话 |

### 4.4 注入二虎音色

Lemong Agent 生成的歌曲会自动注入"二虎"音色（沙哑随性、鼻音重，Eagles 风格男声）：

```javascript
const prompt = `
Generate music: ${style}. Use Chinese vocal language.
  
Lyrics:
${lyrics}

Tempo: ${bpm}
Instruments: ${instruments}
Mood: ${mood}
Voice: 沙哑随性、鼻音重，Eagles 风格男声（二虎音色）
`;
```

---

## 五、技术实现

### 5.1 CLI 入口

```bash
# 创作歌曲
lemong-agent create --name "归航109" --style "流行" --from-novel "幻觉第10章"

# 从创作背景创作
lemong-agent create --name "此身长在画图间" --background "古风，表达对命运的思考"

# 查询歌曲
lemong-agent query --name "归航109"

# 列出所有歌曲
lemong-agent list
```

### 5.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LEMONG_DATA_DIR` | 数据目录路径 | `data/Lemong-data` |
| `ACE_API_KEY` | ACE Step1.5 API Key | — |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | — |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 | deepseek-chat |

### 5.3 核心流程

```javascript
// 1. 生成创作背景
const background = await deepseek.generateBackground(theme, source);

// 2. 生成结构化歌词
const lyrics = await deepseek.generateLyrics(background, style);

// 3. 构建 Prompt
const prompt = buildPrompt(lyrics, style);

// 4. 调用 ACE Step1.5 API
const response = await aceStep.generateMusic(prompt);

// 5. 保存歌曲产物
await saveSong(name, {
  audio: response.audio,
  lyrics: lyrics,
  background: background,
  prompt: prompt
});
```

---

## 六、数据存储设计

### 6.1 歌曲目录结构

```
data/Lemong-data/
├── INDEX.md                # 歌曲索引
└── {歌名}/                 # 每首歌一个独立子目录
    ├── {歌名}.mp3          # 生成的歌曲音频
    ├── 歌词.md             # 歌词（含结构标注）
    ├── 创作背景.md          # 原始创作描述
    └── prompt.json         # 音乐生成的 prompt 参数
```

### 6.2 歌词.md 格式

```markdown
# 歌名

## 创作背景

（从小说提取或用户提供）

## 歌词

[情绪:叙事]
第一段歌词 [韵脚A]

[情绪:悲伤]
第二段歌词 [韵脚B]

[情绪:高亢]
副歌部分 [韵脚A]
```

### 6.3 创作背景.md 格式

```markdown
# 创作背景

## 歌曲立意

（一句话概括）

## 创作来源

- 来源：{小说章节 / 自由创作}
- 提取内容：{从小说提取的关键情节}

## 音乐方向

- 风格：{中文古风 / 流行 / 校园民谣 / 爵士 / 电子 / 男女对唱}
- 情绪：{悲伤 / 欢快 / 悲壮 / 温暖 / 激昂}
- 节奏：{BPM}
- 乐器：{核心乐器}
```

### 6.4 prompt.json 格式

```json
{
  "model": "acemusic/acestep-v1.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Generate music: 流行. Use Chinese vocal language.\n\nLyrics:\n..."
    }
  ],
  "max_tokens": 4000,
  "temperature": 0.7,
  "top_p": 0.9
}
```

---

## 七、已创建歌曲清单

| 歌名 | 风格 | BPM | 来源 | 状态 |
|------|------|-----|------|------|
| 归航109 | 流行 | 120 | 小说《幻觉》第10章 | ✅ 已完成 |
| 此身长在画图间 | 中文古风 | 80 | 自由创作 | ✅ 已完成 |
| 幻觉 | 电子 | 130 | 小说《幻觉》立意 | ✅ 已完成 |
| 醉太平_渔利 | 中文古风 | 85 | 自由创作 | ✅ 已完成 |

---

## 八、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-08-21 | 初版，基于 ACE Step1.5 API 编写设计文档 |

---

## 参考文档

| 文档 | 路径 |
|------|------|
| Agent 核心定义 | `lemong-agent/AGENTS.md` |
| ACE Step1.5 指南 | `docs/standard/ACE-Step1.5指南.md` |
| ACE Step1.5 参考资料 | `docs/standard/ACE-Step1.5参考资料.md` |
| 工作室定位与架构 | `docs/standard/mirage-studio-positioning.md` |