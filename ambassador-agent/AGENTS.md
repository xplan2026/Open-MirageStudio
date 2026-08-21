# AGENTS.md — 外交大使（Ambassador Agent）

## 定位

外交大使是 Mirage-Studio 的**对外形象大使/外交官**，负责在自媒体平台与 AI 社区进行宣传和社交。
与 Coordinator（大副）的区别：**大副对内调度，外交大使对外宣传和社交**。

```
外网访客 / 外部 AI / AI 社区
        │
        ▼
┌─ Ambassador-Agent ──────────────────────┐
│  A2A 端点 (Google A2A 兼容)              │
│  GET  /.well-known/agent.json            │
│  POST /a2a  (message/send 等 JSON-RPC)   │
│                                          │
│  知识库: OUTREACH.md (宣传内容单一信任源)  │
└──────────────────────────────────────────┘
```

## 架构

| 决策点 | 选择 |
|--------|------|
| 运行时 | Node.js + Express（独立进程，不依赖 Coordinator） |
| 端口 | 3200（`AMBASSADOR_PORT` 可覆盖） |
| 协议 | Google A2A 兼容（JSON-RPC 2.0 over HTTP） |
| 知识库 | `OUTREACH.md`（启动时加载；frontmatter 被忽略） |
| 对外入口 | `https://a-o-c.cc.cd:5656/ambassador/a2a/`（Nginx 反代，规划中） |
| 部署 | 4C4G 服务器 (`182.254.180.26`) + PM2 |

## A2A 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/.well-known/agent.json` | GET | A2A Agent Card（发现机制） |
| `/a2a` | POST | JSON-RPC 批处理入口 |
| `/health` | GET | 健康检查 |

### JSON-RPC 方法

| 方法 | 说明 |
|------|------|
| `agent/list` | 返回 Agent Card |
| `agent/skills` | 返回技能列表（intro / promotion） |
| `message/send` | 处理访客消息，基于 OUTREACH.md 回复 |

## 目录结构

```
ambassador-agent/
├── AGENTS.md        # 本文件 — Agent 定义
├── GLOSSARY.md      # ★ 自定义名词速查（会话启动加载）
├── SOUL.md          # 灵魂定义（身份/使命/边界）
├── OUTREACH.md      # ★ 对外宣传内容（单一信任源，待讨论定稿）
├── package.json
└── src/
    └── index.js     # A2A 服务入口
```

## 部署

```bash
# 服务器上
cd /opt/mirage-studio/ambassador-agent
npm install --omit=dev
pm2 start src/index.js --name ambassador
```

## 待办（与舰队长讨论后实施）

> 技术债务已登记于根 `TODO.md` 第九节（#72 宣传内容、#73 工作台页面）。

- [ ] **#72** 定稿 `OUTREACH.md` 宣传内容（自媒体平台 + AI 社区口径）— 待讨论
- [ ] 接入 LLM 智能应答（基于 OUTREACH.md 知识库 + DeepSeek）
- [ ] Nginx 反代 `/ambassador/a2a/` → `127.0.0.1:3200`
- [ ] 官网/作品链接、宣传物料清单
- [ ] **#73** 工作台 admin-UI 外交大使专属页面（工作内容 + 宣传成效）— 依赖 #72
- [ ] 主动连接外部 AI Agent，建立社交网络
- [ ] 维护工作室的社交关系和合作伙伴清单

---

> 外交大使已登记于 `coordinator-agent/REGISTER.md`（对外 Agent，不参与内部调度）。
