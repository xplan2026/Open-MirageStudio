---
Updated: 2026-08-20 10:30
生命周期: 永久保存
保存位置: ambassador-agent/GLOSSARY.md
---

# GLOSSARY — 自定义名词速查

> 本文件在 Ambassador Agent 会话启动时加载。集中定义自定义名词，避免在各文件中重复解释。
>
> **信任层级**: `docs/standard/custom_nouns.md`（项目级权威源，完整定义） > 本文件（会话速查表）
>
> **设计原则**: 见 `docs/standard/token-optimization-glossary.md`

---

## 身份与角色

| 名词 | 定义 |
|------|------|
| **Ambassador**（外交大使） | Mirage-Studio 对外形象大使/外交官，自媒体平台 + AI 社区宣传与社交 |
| **定位分工** | 大副（Coordinator）**对内调度**；外交大使**对外宣传与社交**，互补关系 |
| **大副** (First Mate) | Coordinator-Agent 代号，统一调度员（对内） |
| **舰队长** (Mifon / 米丰) | 项目所有者 / 上级，GitHub: xplan2026 |
| **Mirage-Studio** | 独立自媒体 IP 工作室，以小说《幻觉》为基石 |

## 架构与协议

| 名词 | 定义 |
|------|------|
| **A2A** | Agent-to-Agent 协议 — Google A2A 兼容（JSON-RPC 2.0 over HTTP） |
| **端口 3200** | Ambassador 独立进程端口（`AMBASSADOR_PORT` 可覆盖） |
| **Agent Card** | `/.well-known/agent.json` — A2A 发现机制 |
| **OUTREACH.md** | ★ 对外交涉与宣传内容单一信任源（启动时加载，frontmatter 被忽略，待定稿 #72） |
| **对外入口** | `https://a-o-c.cc.cd:5656/ambassador/a2a/`（Nginx 反代，规划中） |

## A2A 端点与方法

| 端点 / 方法 | 说明 |
|------|------|
| `GET /.well-known/agent.json` | A2A Agent Card（发现） |
| `POST /a2a` | JSON-RPC 批处理入口 |
| `GET /health` | 健康检查 |
| `agent/list` | 返回 Agent Card |
| `agent/skills` | 技能列表（intro / promotion） |
| `message/send` | 处理访客消息，基于 OUTREACH.md 回复 |

## 数据与目录

| 路径 | 说明 |
|------|------|
| `ambassador-agent/AGENTS.md` | Agent 定义 |
| `ambassador-agent/SOUL.md` | 灵魂定义（身份/使命/边界） |
| `ambassador-agent/OUTREACH.md` | 对外交涉与宣传内容单一信任源 |
| `ambassador-agent/src/index.js` | A2A 服务入口 |
| 部署位置 | 4C4G 服务器 (`182.254.180.26`) + PM2（`/opt/mirage-studio/ambassador-agent`） |

## 技术债务

| 编号 | 事项 |
|------|------|
| #72 | 定稿 OUTREACH.md 宣传内容（自媒体平台 + AI 社区口径）— 待讨论 |
| #73 | 工作台 admin-UI 宣传大使专属页面（工作内容 + 宣传成效）— 依赖 #72 |

## 调度

| 名词 | 定义 |
|------|------|
| 注册状态 | 已登记于 `coordinator-agent/REGISTER.md`（**对外 Agent，不参与内部调度**，不在 agent-card.js） |
| 触发方式 | 外部 A2A 访问触发（外部 AI / AI 社区 / 外网访客） |

---

> **维护规则**: 新增/修改自定义名词时，先更新 `docs/standard/custom_nouns.md`（权威源），再同步更新本表。
