---
Updated: 2026-08-21 18:00
生命周期: 永久保存
保存位置: coordinator-agent/GLOSSARY.md
---

# GLOSSARY.md — 本项目自定义名词速查表

> 本文件是 **Coordinator-Agent 会话速查表**，列出本生态中的自定义名词，精简定义。
> **项目级权威源（完整定义）**: `docs/standard/custom_nouns.md`
> **维护规则**: 新增/修改名词时，先更新权威源，再同步本速查表。
> 其他文件（SOUL.md、AGENTS.md、REGISTER.md）直接引用名词，不重复解释 → 优化 LLM 缓存命中。

---

## 角色与组织

| 名词 | 定义 |
|------|------|
| 大副 (First Mate) | Coordinator-Agent 的代号，工作室 AI 助手与统一调度员 |
| 舰队长 | 项目所有者/上级（GitHub: xplan2026），指定目标、审核交付 |
| Mirage-Studio | 独立自媒体 IP 工作室：以小说《幻觉》为基石，AI Agent 协作生产跨媒介内容 |
| 外交大使 / 外交官 | 面向外网的 A2A Agent，负责自媒体平台 + AI 社区宣传与社交（`ambassador-agent/`） |

## 工作 Agent

| 名词 | agentId | 定义 |
|------|---------|------|
| Xujie Writer | `xujie` | 小说《幻觉》创作 Agent（项目基石），管理章节/大纲/角色/世界观 |
| Lemong | `lemong` | AI 音乐创作 Agent（ACE Step1.5 API） |
| Erhu / 二虎 | `erhu` | 数字人歌手 MV 制作 Agent，也是工作室数字人歌手 IP 形象 |
| Zhupu | `zhupu` | 小说家族族谱管理 Agent，保障角色一致性 |

## 产物与数据

| 名词 | 定义 |
|------|------|
| 《幻觉》 | 长篇连载小说，工作室一切跨媒介内容的内容源头 |
| `data/XujieWriter-data/` | 小说构建产物（大纲、角色档案、章节） |
| `data/Lemong-data/` | 歌曲完整构建记录（单一信任源：歌词+背景+prompt+mp3） |
| `data/Erhu-data/` | MV 最终媒体产物（mp3+mp4+images，无文本元数据） |
| `data/Zhupu-data/` | 族谱构建产物（graph 关系图 + 各族谱 JSON） |

## 系统与协议

| 名词 | 定义 |
|------|------|
| Coordinator-Agent | `coordinator` | 统一调度层（本目录），Express 服务，端口 3100 |
| 工作台 / Admin-UI | 管理员 SPA（React），创作指令入口 + 产物管理 + 看板，base=/workbench/ |
| A2A | Agent-to-Agent 协议（内部 JSON-RPC + 对外 Google A2A 兼容） |
| Agent Card | Agent 注册条目（agentId/name/description/capabilities/cliEntry/schemas/status） |
| CLI Entry | Agent 的可执行入口路径（相对 workspace 根） |
| iLink-bot | 微信官方机器人通信通道，对接 Coordinator 统一调度 |
| ChatReply | `src/intent/reply.js` — LLM 对话回复生成器（大副对话） |

## 关键地址

| 名词 | 定义 |
|------|------|
| `a-o-c.cc.cd:5656` | 工作台外网入口（HTTPS，非标端口绕过备案拦截），`COORDINATOR_PUBLIC_URL` 同值 |
| `182.254.180.26` | 腾讯云 4C4G 部署服务器（ubuntu，部署于 `/opt/mirage-studio`） |
| `39.106.176.161` | 阿里云 2C2G 服务器（xplan-smart） |

---

> 完整定义见 `docs/standard/custom_nouns.md`（2026-08-12 已对齐当前生态）；Agent 注册详情见 `REGISTER.md`。
