---
Updated: 2026-08-20 14:25
生命周期: 永久保存
保存位置: lemong-agent/GLOSSARY.md
---

# GLOSSARY — 自定义名词速查

> 本文件在 Lemong Agent 会话启动时加载。集中定义所有自定义名词，避免在各文件中重复解释。
>
> **信任层级**: `knowledge-base/custom_nouns.md`（权威完整定义） > 本文件（会话速查表）
>
> **设计原则**: 见 `docs/standard/token-optimization-glossary.md`

---

## 人物

| 名词 | 定义 |
|------|------|
| **Lemong** 🍋🎵 | 独立 AI 音乐创作 Agent，负责从创意到 MP3 的全流程 AI 音乐制作 |
| **船长** (Captain) ⚓ | AI 副官 / 服务器舰队指挥官，可调用 Lemong 创作音乐 |
| **舰队长** / 米丰 / Mifon | 最终用户，GitHub: xplan2026，UTC+8 |

## 技术栈

| 名词 | 定义 |
|------|------|
| **ACE Step1.5** | AI 文本到音乐生成模型，`acemusic/acestep-v1.5-turbo`，API: `api.acemusic.ai` |
| **DeepSeek** | 大语言模型 API，`deepseek-chat`，用于生成歌词 + 音乐 Prompt |
| **music_prompt** | 结构化 JSON（caption_en, bpm, key_scale, instruments, mood 等），ACE API 输入参数 |

## 内部系统

| 名词 | 定义 |
|------|------|
| **歌手系统** | 预设歌手人设（`singer/{name}/profile.json`），当前歌手: 二虎（沙哑男声，Eagles 风） |
| **模板系统** | 6 种风格交互式问卷（`templates/*.md`），13-16 题收集偏好 |
| **"现代诗创作"策略** | System Prompt 伪装为"现代诗人"绕过 DeepSeek 恋爱歌偏好，输出 JSON 结构不变 |

## 工作流阶段

| 阶段 | 名称 | 核心操作 |
|:---:|------|----------|
| 1 | 风格选择 | 从 6 种风格中选择 + 可选歌手人设 |
| 2 | 信息收集 | 交互式问卷（13-16 题） |
| 3 | Prompt 生成 | DeepSeek → 诗稿 + music_prompt |
| 4 | 歌词确认 | 审阅/修改迭代 |
| 5 | 音乐生成 | ACE API → MP3 |
| 6 | 交付 | MP3 + 元数据 JSON + Prompt 归档 |

## 6 种风格

| 风格 | 问题数 | 核心特征 |
|------|:---:|----------|
| 中文古风 | 13 | 传统乐器、诗词韵味、五声调式 |
| 流行 | 13 | 旋律抓耳、情感表达、标准编制 |
| 校园民谣 | 14 | 木吉他指弹、青春记忆、温暖真挚 |
| 爵士 | 14 | 萨克斯/钢琴、Swing、七九和弦 |
| 电子 | 14 | 合成器、子风格细分、Drop 设计 |
| 男女对唱 | 16 | 声部分配、角色设定、和声设计 |

## 目录与路径

| 路径 | 说明 |
|------|------|
| `lemong-agent/` | Agent 根目录 |
| `lemong-agent/.env` | API Key 配置（DEEPSEEK_API_KEY, ACE_API_KEY） |
| `lemong-agent/scripts/` | 核心脚本（generate-prompt/lyrics/music.js） |
| `lemong-agent/templates/` | 6 种风格模板 + 和弦参考库 |
| `lemong-agent/singer/` | 歌手人设配置 |
| `lemong-agent/knowledge-base/` | ACE API 文档 + 名词定义 |
| `data/Lemong-data/` | 成品数据根目录 |
| `data/Lemong-data/{歌名}/` | 每首歌独立子目录，含 MP3 + 歌词.md + prompt.json |

## 成品数据结构

每首定稿保存在 `data/Lemong-data/{歌名}/` 子目录：

| 文件 | 说明 |
|------|------|
| `{歌名}.mp3` | 歌曲音频 |
| `歌词.md` | 歌词文本 |
| `prompt.json` | 音乐 Prompt + 元数据 |

## 前身

| 名词 | 说明 |
|------|------|
| **lemong-music** | Subagent（已废弃），原寄生在船长 Agent 下，已升级为独立 Lemong Agent |

---

> **维护规则**: 新增自定义名词时，先更新 `knowledge-base/custom_nouns.md`（权威源），再同步更新本表。
