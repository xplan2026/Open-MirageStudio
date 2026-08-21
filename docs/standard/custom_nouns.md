---
Updated: 2026-07-13
生命周期: 永久保存
保存位置: docs/standard/custom_nouns.md
---

# 自定义名词表 (Custom Nouns)

> 本项目 Mirage Studio 生态中的自定义名词定义（**项目级权威源**）。
> 集中管理，避免在各文件中重复解释，减少 Token 消耗。
>
> **信任层级**: 项目级文件（本文档） > 知识库同名文件 > 各 Agent 速查表（GLOSSARY.md）
>
> **维护规则**: 新增/修改名词时，先更新本文档（权威源），再同步各 Agent 的 `GLOSSARY.md` 速查表。
> 各 Agent 速查表（`{agent}/GLOSSARY.md`）仅保存精简表格，完整定义以本文档为准。

---

## 角色与组织

### 大副 (First Mate)
- **角色**: Coordinator-Agent 的代号，Mirage-Studio 的 AI 助手与统一调度员
- **职责**: 接收用户指令（微信/CLI/工作台）→ 意图解析 → 编排 Xujie / Lemong / Erhu / Zhupu
- **边界**: **对内调度**，不对外提供 A2A（2026-08-12 起对外 A2A 已取消）
- **定义文件**: `coordinator-agent/SOUL.md`

### 舰队长 (Mifon / 米丰)
- **角色**: 项目所有者 / 上级
- **GitHub**: xplan2026
- **时区**: Asia/Shanghai (UTC+8)
- **职责**: 指定目标、审核交付、管理项目方向

### Mirage-Studio
- **类型**: 独立自媒体 IP 工作室
- **基石**: 长篇连载小说《幻觉》
- **模式**: 多个 AI Agent 协作，持续生产跨媒介内容（小说 → 歌曲 → MV → 族谱）
- **主仓库**: `github.com/xplan2026/mirage-studio`

### 外交大使 (Ambassador)
- **角色**: 对外形象大使 / 外交官
- **职责**: 自媒体平台 + AI 社区宣传与社交（外部 A2A 接入）
- **定位**: 与 Coordinator 互补——**大副对内调度，外交大使对外宣传与社交**
- **路径**: `ambassador-agent/` | **端口**: 3200
- **知识库**: `ambassador-agent/OUTREACH.md`（对外交涉与宣传内容单一信任源，待定稿）
- **技术债务**: 根 `TODO.md` #72（宣传内容）/ #73（工作台页面）

### 船长 (Captain) ⚓ — 已迁移
- **状态**: 已拆分至其他分支，本项目不再维护
- **原角色**: AI 副官 / 服务器舰队指挥官
- **遗留**: `captain/` 目录保留为历史存档

---

## 工作 Agent

| 名词 | agentId | 定位 | 定义文件 |
|------|---------|------|----------|
| Coordinator-Agent | `coordinator` | 统一调度层（不参与外部调度，是调度者本身） | `coordinator-agent/AGENTS.md` |
| Xujie Writer | `xujie` | 《幻觉》小说创作 Agent（**项目基石**） | `xujie-writer-agent/AGENTS.md` |
| Lemong | `lemong` | AI 音乐创作 Agent（ACE Step1.5 API） | `lemong-agent/AGENTS.md` |
| Erhu / 二虎 | `erhu` | 数字人歌手 MV 制作 Agent，也是工作室数字人歌手 IP 形象 | `erhu-agent/AGENTS.md` |
| Zhupu | `zhupu` | 小说家族族谱管理 Agent，保障角色一致性 | `zhupu-manager-agent/AGENTS.md` |
| Ambassador | `ambassador` | 对外宣传（不进内部调度、不在 agent-card.js） | `ambassador-agent/AGENTS.md` |

> **触发约束**: Xujie / Lemong / Erhu 均为**用户指令触发**，非自动联动。小说更新不自动触发歌曲/MV 创作。
> 注册信息权威源: `coordinator-agent/REGISTER.md`

---

## 产物与数据

| 名词 | 定义 |
|------|------|
| 《幻觉》 | 长篇连载小说，工作室一切跨媒介内容的**内容源头**。主线为米家百年沧桑 |
| `data/XujieWriter-data/{书名}/` | 小说构建产物（大纲、角色档案、世界观设定、章节） |
| `data/Lemong-data/{歌名}/` | 歌曲**完整构建记录**（单一信任源：歌词 + 创作背景 + prompt + mp3） |
| `data/Erhu-data/` | MV 最终媒体产物（mp3 + mp4 + images，无文本元数据） |
| `data/Zhupu-data/` | 族谱构建产物（graph 关系图 + 各族谱 JSON + 家训） |
| `data/LLMs.txt` | 全局索引 — 向 LLM 提供数据目录上下文 |

> **职责划分**: Lemong-data 是歌曲完整构建记录；Erhu-data 只保留最终媒体产物；文本元数据不重复存储。

---

## 系统与协议

### 工作台 / Admin-UI
- **类型**: 管理员 React SPA（`coordinator-agent/admin-ui/`）
- **定位**: 创作指令入口 + 产物管理 + 看板 + AI 推广交互
- **入口**: `https://a-o-c.cc.cd:5656/workbench/`（base=/workbench/）
- **认证**: 微信扫码登录（OAuth2 授权码流程 → JWT Session）
- **对话对象**: Coordinator-Agent（大副）

### A2A (Agent-to-Agent)
- **内部**: JSON-RPC over HTTP，仅 localhost（`/internal/agent.list` 等）
- **对外**: Google A2A 兼容接口
  - Coordinator 对外 A2A **已取消**（2026-08-12，`A2A_EXTERNAL_ENABLED` 默认关闭）
  - 对外 A2A 由**宣传大使**承接（端口 3200）

### Agent Card
- **定义**: Agent 注册条目（agentId/name/description/capabilities/cliEntry/schemas/status）
- **实现**: `coordinator-agent/src/agents/agent-card.js`
- **权威源**: `coordinator-agent/REGISTER.md`

### CLI Entry
- **定义**: Agent 的可执行入口路径（相对 workspace 根）
- **示例**: `lemong-agent/lemong-agent`、`zhupu-manager-agent/zhupu-manager-agent`

### iLink-bot
- **类型**: 微信官方机器人通信通道
- **定位**: 微信消息收发、长度截断、格式适配（意图解析与编排已移交 Coordinator）
- **状态**: 对接中（根 TODO.md #53）

### ChatReply
- **定义**: `coordinator-agent/src/intent/reply.js` — LLM 对话回复生成器（大副对话）
- **角色设定**: system prompt 定义"你是「大副」，Mirage-Studio 的 AI 助手与统一调度员"

### Session Startup（Coordinator 会话加载顺序）
```
SOUL.md → GLOSSARY.md → AGENTS.md → REGISTER.md → TODO.md
```
- GLOSSARY.md 在 AGENTS.md 之前加载 → 名词先"学会"，后续文件直接引用不重复解释

---

## 关键地址

| 名词 | 定义 |
|------|------|
| `a-o-c.cc.cd:5656` | 工作台外网入口（HTTPS 非标端口，绕过备案拦截），`COORDINATOR_PUBLIC_URL` 同值 |
| `182.254.180.26` | 腾讯云 PK109 4C4G 服务器（ubuntu，部署于 `/opt/mirage-studio`，Coordinator + Ambassador） |
| `39.106.176.161` | 阿里云 2C2G 服务器（root，xplan-smart 服务） |

---

## 历史 / 废弃名词

| 名词 | 状态 | 说明 |
|------|------|------|
| 船长 (Captain) | 已迁移 | 拆分至其他分支，本项目不再维护 |
| 子归 (Homing) | 已迁移 | 自媒体 IP 总指挥（旧生态，属猫儿石项目） |
| 子砚 (Jinker) | 已迁移 | 小说创作助手（旧生态，属百年沉浮项目） |
| 百年沉浮 / 猫儿石 | 历史项目 | 旧生态项目，与当前 Mirage-Studio 无直接关联 |
| Hermes-Agent | 已废弃 | 旧的独立微信机器人项目 |
| Control UI | 已废弃 | 域名未备案，外网无法访问，已被工作台取代 |
