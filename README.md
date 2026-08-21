# Mirage Studio — 独立自媒体 IP 工作室

> **GitHub**: [xplan2026/mirage-studio](https://github.com/xplan2026/mirage-studio)

Mirage-Studio 是一个**独立自媒体 IP 工作室**，以长篇连载小说《幻觉》为基石，通过多个 AI Agent 协作，持续生产跨媒介内容（小说、歌曲、MV、族谱可视化），并通过官方网站对外展示。

## 愿景

以《幻觉》小说为骨架，以 AI 原生音乐/MV 为血肉，以家族族谱为经脉 — 持续打造一个跨媒介的独立自媒体 IP。

> 《幻觉》小说是整个项目的基石——它不一定要"完成"，而是在持续创作中变得越来越生动。补充信息越多，可供其他 Agent 创作的知识越丰富，工作室才有可持续生产的能力。

## 架构总览

```
                      用户指令（微信 / Admin-UI / CLI）
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │    Coordinator-Agent       │
                    │   统一调度 · 意图解析 · 编排  │
                    └──┬───┬───┬───┬────────────┘
                       │   │   │   │
          ┌────────────┘   │   │   └──────────────┐
          ▼                ▼   ▼                   ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ xujie-writer     │ │  lemong      │ │  zhupu-manager   │
│ 《幻觉》小说创作  │ │  AI 歌曲创作  │ │  角色族谱管理     │
└────────┬─────────┘ └──────┬───────┘ └──────────────────┘
         │                  │
         │ 角色设定同步      │ 歌曲 → MV
         ▼                  ▼
┌──────────────────┐ ┌──────────────┐
│ zhupu-manager    │ │  erhu        │
│  一致性保障       │ │  数字人 MV    │
└──────────────────┘ └──────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │   产物索引 (data/)         │
              └──────────┬───────────────┘
                         │
              ┌──────────┴───────────┐
              ▼                      ▼
    ┌──────────────────┐  ┌──────────────────┐
    │  website          │  │  短视频平台       │
    │  官网展示          │  │  二虎 MV 发布     │
    └──────────────────┘  └──────────────────┘
```

## 核心 Agent

| Agent | 定位 | 触发方式 | 目录 |
|-------|------|----------|------|
| **Coordinator-Agent** | 统一调度层，意图解析 → 任务编排 → Agent 路由 | 接收用户指令（微信/CLI/Admin-UI） | `coordinator-agent/` |
| **Xujie Writer Agent** | 小说《幻觉》创作，**项目基石** | 用户指令触发 | `xujie-writer-agent/` |
| **Zhupu Manager Agent** | 辅助小说创作，管理角色家族关系与一致性 | 跟随小说更新 / 用户独立操作 | `zhupu-manager-agent/` |
| **Lemong Agent** | AI 原创歌曲创作，可从小说提取灵感 | 用户指令触发 | `lemong-agent/` |
| **Erhu Agent (二虎)** | 数字人歌手，制作歌曲 MV | 用户指令触发 | `erhu-agent/` |
| **Ambassador Agent (宣传大使)** | 对外形象大使，自媒体 / AI 社区宣传 | 外部 A2A 访问触发 | `ambassador-agent/` |

> 各 Agent 的详细描述、使用说明和开发计划见各自的 `AGENTS.md` / `README.md` / `TODO.md`。

## 配套设施

| 设施 | 定位 | 状态 |
|------|------|------|
| **Website** (`website/`) | 「幻觉」IP 官方网站，展示小说/音乐/MV/族谱 | ✅ 已部署（mirage.cc.cd） |
| **Admin-UI** (`coordinator-agent/admin-ui/`) | **工作台** — 创作指令入口 + 看板 + 产物管理 + AI 推广 | ✅ 已部署 v0.1（待升级） |
| **iLink-bot** | 微信集成通信通道，接收用户指令路由到 Coordinator | 🔴 待对接 |

## 关键工作流

### 小说创作链
```
用户指令 → Coordinator → Xujie Writer: 续写章节
                        → 新角色 → Zhupu Manager: 更新族谱
```

### 从小说到歌曲
```
用户指令 → Coordinator → Lemong: 基于《幻觉》第X章主题创作歌曲
                        → 产物回写
```

### 歌曲到 MV
```
用户指令 → Coordinator → Erhu: 将歌曲《XXX》升级为 MV
                        → 产物回写
```

> **重要约束**：以上流程**不是自动联动的**。小说更新不会自动触发歌曲/MV 创作，所有下游创作需要用户明确指令。

## 官方网站

| 项目 | 详情 |
|------|------|
| 目录 | `website/` |
| 技术栈 | Astro 5 SSG |
| 托管 | Cloudflare Pages（项目 `mirage-studio-website`） |
| 域名 | `mirage.cc.cd`（橙云 proxied） |
| 板块 | 小说 / 音乐 / MV / 族谱 |

> 媒体由 Pages 原生静态资产托管（原生 Range 206），文本走 D1；详细部署见 `docs/部署记录/website部署方案.md`（权威方案）。

> 网站开发计划见 `website/TODO.md`。

## 构建数据

各 Agent 的构建产物保存在 `data/` 目录中：

```
data/
├── LLMs.txt                    # 全局索引
├── XujieWriter-data/           # 小说创作产物
│   └── {书名}/
│       ├── 大纲.md
│       ├── 角色档案.md
│       ├── 世界观设定.md
│       └── 章节/
├── Zhupu-data/                 # 族谱数据
│   ├── graph/                  # 关系子图（长期记忆）
│   └── {家族名}/
│       ├── 族谱.json
│       └── 家训.md
├── Lemong-data/                # 歌曲创作产物（单一信任源）
│   └── {歌名}/
│       ├── {歌名}.mp3
│       ├── 歌词.md
│       ├── 创作背景.md
│       └── prompt.json
└── Erhu-data/                  # MV 制作产物
    ├── INDEX.md
    ├── plans/
    └── {作品名}/
        ├── {作品名}.mp4
        └── images/
```

## 目录结构

```
/
├── README.md
├── .env                         # 敏感配置（不提交 Git）
├── coordinator-agent/           # 统一调度层 ✅ 已部署
├── xujie-writer-agent/          # 小说创作 Agent
├── zhupu-manager-agent/         # 族谱管理 Agent
├── lemong-agent/                # AI 音乐创作 Agent
├── erhu-agent/                  # 数字人 MV Agent
├── ambassador-agent/            # 对外宣传大使 Agent
├── website/                     # 「幻觉」IP 官方网站（Cloudflare Pages）
├── data/                        # Agent 构建产物
└── docs/
    ├── standard/                # 单一信任源 (SSOT)
    │   ├── mirage-studio-positioning.md  # 工作室定位
    │   ├── 文档元数据规范.md     # 文档元数据必须项规则
    │   └── token-optimization-glossary.md # 术语表规范
    ├── 部署记录/                # 部署方案与记录（权威）
    └── logs/                    # 工作日志
```

## 安全说明

- `.env` 文件包含敏感凭据，**严禁提交到版本控制**
- `.codebuddy/.env.codebuddy` 包含 SSH 密钥和 GitHub Token，同样不得提交
- 使用 `.env.example` 作为环境变量模板
