# Lemong Agent 自定义名词表 (Custom Nouns)

> Lemong Agent 专属自定义名词定义。
> 遵循 Token 优化设计：定义一次，全局引用，不在其他文件中重复解释。
>
> **设计原则**: 见 `docs/standard/token-optimization-glossary.md`
>
> **信任层级**: 本文件（权威完整定义） > `../GLOSSARY.md`（会话速查表）

---

## 人物

### Lemong
- **角色**: 独立 AI 音乐创作 Agent
- **职责**: 从创意构思到成品 MP3 的全流程 AI 音乐制作
- **前身**: `lemong-music` Subagent（原寄生于船长 Agent）

### 船长 (Captain)
- **角色**: AI 副官 / 服务器舰队指挥官
- **与本 Agent 的关系**: 调度者/协作者，可调用 Lemong 创作音乐
- **定义源**: `docs/standard/custom_nouns.md`

### 舰队长（米丰 / Mifon）
- **角色**: 船长的上级/主人
- **与本 Agent 的关系**: 最终用户，通过船长间接交互
- **定义源**: `docs/standard/custom_nouns.md`

---

## 项目

### Lemong Agent
- **类型**: 独立 AI Agent
- **位置**: `/workspace/lemong-agent/`
- **职责**: AI 音乐创作全流程
- **知识库**: `/workspace/lemong-agent/knowledge-base/`

### lemong-music（前身）
- **类型**: Subagent（已升级为 Lemong Agent）
- **位置**: `/workspace/captain/subagents/lemong-music/`
- **状态**: 保留作为备份，待迁移完成后标记 deprecated

---

## 技术术语

### ACE Step1.5
- **全称**: ACE Step 1.5
- **类型**: AI 文本到音乐生成模型
- **研发方**: 阶跃星辰 (StepFun) + ACE Studio (北京时域科技有限公司)
- **API 地址**: `https://api.acemusic.ai/v1`
- **模型 ID**: `acemusic/acestep-v1.5-turbo`
- **用途**: 根据文本描述和歌词生成 MP3 音频
- **知识库**: `knowledge-base/ACE-Step1.5指南.md` + `knowledge-base/ACE-Step1.5参考资料.md`

### DeepSeek
- **类型**: 大语言模型 API
- **模型**: `deepseek-chat`
- **API 地址**: `https://api.deepseek.com/v1`
- **用途**: 生成歌词 + 音乐 Prompt（"现代诗创作"策略绕过爱情歌偏好）

### music_prompt
- **定义**: 结构化音乐生成参数（caption_en, bpm, key_scale, chord_progression, instruments, mood, vocal_style, duration 等）
- **用途**: 作为 ACE API 的输入，控制音乐风格、编曲和人声特征
- **格式**: JSON 对象

### 歌手系统 (Singer System)
- **定义**: 预设歌手人设配置（`singer/{name}/profile.json`）
- **用途**: 注入声音特征到 LLM 生成阶段和 ACE API 生成阶段
- **当前歌手**: 二虎（Eagles/Don Henley 风格男声）

### 模板系统 (Template System)
- **定义**: 6 种音乐风格的交互式问卷（`templates/*.md`）
- **用途**: 通过 13-16 个问题收集用户偏好，由 DeepSeek LLM 生成定制化 `music_prompt`
- **与硬编码模板的关系**: 交互式路径（精细控制）和快捷路径（CLI `--style`）互补，非冗余

### "现代诗创作"策略 (Modern Poetry Bypass)
- **定义**: 为绕过 DeepSeek-chat 对"歌词"一词的恋爱歌偏好，将 System Prompt 身份设定为"现代诗人"
- **效果**: 歌词标签从 `[主歌A]/[副歌]` 改为 `[A段]/[B段]/[C段/高潮]`，输出 JSON 结构不变

---

## 目录与路径

| 路径 | 说明 |
|------|------|
| `/workspace/lemong-agent/` | Agent 根目录 |
| `/workspace/lemong-agent/knowledge-base/` | Agent 知识库 |
| `/workspace/lemong-agent/scripts/` | 核心脚本 |
| `/workspace/lemong-agent/templates/` | 音乐风格模板 |
| `/workspace/lemong-agent/singer/` | 歌手人设配置 |
| `data/Lemong-data/` | 成品数据根目录 |
| `data/Lemong-data/{歌名}/` | 每首歌独立子目录，含 MP3 + 歌词.md + prompt.json |

---

## 工作流阶段

| 阶段 | 名称 | 说明 |
|------|------|------|
| 1 | 风格选择 | 从 6 种风格中选择，可选配歌手人设 |
| 2 | 信息收集 | 交互式问卷（13-16 题） |
| 3 | Prompt 生成 | DeepSeek LLM 生成歌词 + music_prompt |
| 4 | 歌词确认 | 用户审阅、修改迭代 |
| 5 | 音乐生成 | ACE API 生成 MP3 |
| 6 | 交付 | 输出 MP3 + 元数据 JSON + Prompt 归档 |

---

> **维护规则**: 新增自定义名词时，同步更新本文档。其他 Agent 文件直接引用名词，不重复定义。
