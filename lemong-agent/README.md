# Lemong Agent

> 独立 AI 音乐创作 Agent — 从创意到成品的全流程 AI 音乐制作

## 身份

- **代号**: Lemong
- **类型**: 独立 Agent
- **前身**: `lemong-music` Subagent（原寄生于船长 Agent 下）

## 功能

Lemong Agent 是一个完整的 AI 音乐创作助手，实现从**创意构思 → 歌词生成 → 音乐 Prompt → MP3 成品**的全自动化流程。

### 工作流程（6 阶段）

1. **风格选择** — 从 6 种音乐风格中选择，可选配预设歌手人设
2. **信息收集** — 交互式问卷（每种风格 13-16 个问题）
3. **Prompt 生成** — 通过 DeepSeek V4 生成歌词 + 音乐 Prompt
4. **歌词确认** — 用户审核、修改，迭代至满意
5. **音乐生成** — 通过 ACE Step1.5 API 生成 MP3
6. **交付** — 输出 MP3 + 结构化元数据

### 支持的音乐风格

| 风格 | 模板 | 特点 |
|------|------|------|
| 中文古风 | `templates/中文古风.md` | 传统乐器、诗意意象、五声音阶 |
| 流行 | `templates/流行.md` | 抓耳旋律、情感表达 |
| 校园民谣 | `templates/校园民谣.md` | 指弹吉他、青春怀旧 |
| 爵士 | `templates/爵士.md` | 萨克斯/钢琴、七九和弦 |
| 电子 | `templates/电子.md` | 合成器、Drop 设计 |
| 男女对唱 | `templates/男女对唱.md` | 声部分配、角色对唱 |

## 目录结构

```
lemong-agent/
├── AGENTS.md                  # Agent 主定义文件
├── MEMORY.md                  # Agent 记忆/状态
├── README.md                  # 本文件
├── TODO.md                    # 升级计划
├── lemong-agent               # CLI 统一入口（Bash）
├── knowledge-base/            # 知识库（ACE API 文档等）
├── E2E-TEST-REPORT.md         # 端到端测试报告
├── scripts/
│   ├── generate-prompt.js     # 歌词 + 音乐 Prompt 生成
│   ├── generate-lyrics.js     # 独立歌词生成/修改
│   └── generate-music.js      # ACE API 音乐生成
├── singer/
│   ├── README.md              # 歌手系统说明
│   └── 二虎/
│       └── profile.json       # 歌手人设配置
└── templates/
    ├── README.md              # 模板设计文档
    ├── chord-progressions.md  # 和弦进行参考库
    └── *.md                   # 6 种风格模板
```

## API 依赖

| API | 用途 | 环境变量 |
|-----|------|----------|
| DeepSeek | 歌词 + 音乐 Prompt 生成 | `DEEPSEEK_API_KEY` |
| ACE Music | MP3 音频生成 | `ACE_API_KEY` |

## 输出

- `data/AI-Music/` — 生成的 MP3 + 版本元数据 JSON
- `data/music-prompt/` — 音乐 Prompt 归档

## 快速开始

```bash
# CLI 入口
./lemong-agent/lemong-agent help

# 列出可用风格
./lemong-agent/lemong-agent list-styles

# 生成音乐（完整流程）
./lemong-agent/lemong-agent prompt "中文古风" /tmp/answers.json > output.json
./lemong-agent/lemong-agent generate --prompt-json output.json --lyrics "..." --title "歌名"

# 查看状态
./lemong-agent/lemong-agent status
```

或直接对话触发：

> "Lemong，帮我创作一首校园民谣"

## 状态

✅ **已升级** — 已从 Subagent 形态升级为独立 Agent。详见 [TODO.md](./TODO.md)。
