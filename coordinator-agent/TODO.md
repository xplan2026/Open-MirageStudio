# Coordinator-Agent TODO

> 创建日期: 2026-08-09
> 依赖: TODO.md (根目录) 第七节 — 原有 7 项核心 + 9 项通信通道设计保持不变
> 部署目标: 4C4G 服务器 (`182.254.180.26`, `/opt/mirage-studio`)

---

## Phase 1: 核心骨架 (MVP) — 先跑通

| # | 项 | 优先级 | 说明 |
|---|-----|--------|------|
| 1.1 | `package.json` 初始化 | 最高 | Express + cors + dotenv |
| 1.2 | Agent 注册表 (`agents/registry.js`) | 最高 | Lemong/Erhu/Zhupu + Agent Card 定义 |
| 1.3 | 意图解析引擎 (`intent/parser.js`) | 最高 | DeepSeek-v4-flash：自然语言 → Agent ID + 参数 |
| 1.4 | 任务状态机 (`state/task-state.js`) | 最高 | pending → running → success/failed, 内存存储 |
| 1.5 | Coordinator 核心 (`coordinator.js`) | 最高 | 接收请求 → 解析 → 分配 → 跟踪 |
| 1.6 | HTTP 服务入口 (`index.js`) | 最高 | Express 服务，端口 3100，基础路由 |

**验证标准**: Coordinator 启动 → 接收 JSON 请求 → 解析意图 → 返回 Agent 匹配结果（不实际执行）

---

## Phase 2: A2A 接口层 — 协议落地

| # | 项 | 优先级 | 说明 |
|---|-----|--------|------|
| 2.1 | 内部 JSON-RPC API (`api/internal.js`) | 最高 | agent.list / card / task.create / status / cancel |
| 2.2 | 对外 A2A 兼容接口 (`api/external.js`) | 高 | Google A2A 协议适配层 |
| 2.3 | 认证中间件 (`middleware/auth.js`) | 最高 | HTTP Basic Auth for Admin，IP 白名单 |
| 2.4 | 限流中间件 (`middleware/rate-limit.js`) | 中 | 对外接口速率限制 |
| 2.5 | 访问边界实现 | 最高 | internal (localhost) / admin (auth) / external (rate-limited) |

**验证标准**: 
- `curl localhost:3100/internal/agent.list` → 返回 Agent 列表
- Admin API 需要 Basic Auth 才能访问
- External A2A 接口有速率限制

---

## Phase 3: Agent 适配器 — 实际执行

| # | 项 | 优先级 | 说明 |
|---|-----|--------|------|
| 3.1 | Lemong 适配器 (`adapters/lemong-adapter.js`) | 最高 | 调用 `lemong-agent/lemong-agent` CLI |
| 3.2 | Erhu 适配器 (`adapters/erhu-adapter.js`) | 高 | 调用 `erhu-agent/erhu-agent` CLI |
| 3.3 | Zhupu 适配器 (`adapters/zhupu-adapter.js`) | 中 | 调用 `zhupu-manager-agent/zhupu-manager-agent` CLI |
| 3.4 | DAG 任务编排 (`scheduler/dag.js`) | 最高 | 顺序编排 (Lemong→Erhu)、并行、依赖管理 |
| 3.5 | 产物索引 (`products/index.js`) | 中 | 不存产物本身，持有路径映射 → `data/` 目录 |

**验证标准**: 创建任务 "写一首关于夏天的歌" → Lemong 生成 → 返回 `data/Lemong-data/{歌名}/` 路径

---

## Phase 4: Admin UI — 数据中台

| # | 项 | 优先级 | 说明 |
|---|-----|--------|------|
| 4.1 | Vite + React 项目初始化 | 高 | `admin-ui/package.json`, Vite 配置 |
| 4.2 | Admin Layout (`components/Layout.jsx`) | 高 | 导航栏 + 侧边栏 + 内容区 |
| 4.3 | Dashboard 页面 (`pages/Dashboard.jsx`) | 高 | 任务概览、Agent 状态卡片、最近任务 |
| 4.4 | 任务编排页面 (`pages/TaskOrchestra.jsx`) | 最高 | 创建任务、选择 Agent、查看 DAG、进度条 |
| 4.5 | Agent 状态页面 (`pages/AgentStatus.jsx`) | 高 | Agent 列表、健康状态、最近执行 |
| 4.6 | 日志页面 (`pages/Logs.jsx`) | 中 | 任务执行日志、错误日志 |
| 4.7 | 状态组件 (`StatusBadge`, `TaskCard`, `AgentCard`) | 中 | 可复用 UI 组件 |
| 4.8 | 构建 & 打包 | 高 | `npm run build` → 静态文件，由 Nginx serve |

**验证标准**: 浏览器打开 Admin UI → 登录 → 看到 Dashboard → 创建任务 → 看到状态变化

---

## Phase 5: 部署上线

**部署日期**: 2026-08-09 | **Bug 修复**: ESM dotenv 加载顺序 → `env.mjs` 预加载模块

| # | 项 | 优先级 | 说明 |
|---|-----|--------|------|
| 5.1 | 4C4G 服务器部署环境准备 | ✅ 完成 | 清理旧项目（axscope/jjzz-music/xplan-smart） |
| 5.2 | Project 部署 | ✅ 完成 | SCP 部署 coordinator-agent → `/opt/mirage-studio/` |
| 5.3 | Nginx 配置 | ✅ 完成 | Admin UI + API 反代 + A2A（替换旧 jjzz-music） |
| 5.4 | PM2 配置 | ✅ 完成 | `pm2 start coordinator`，内存 56MB |
| 5.5 | SSL 证书 (Let's Encrypt) | 🟡 待办 | HTTPS for Admin UI |
| 5.6 | 端到端验证 | ✅ 完成 | Health + Agent 列表 + DeepSeek 意图解析 + A2A + Admin UI |

---

## Phase 6: 通信通道 (原 TODO 第九节)

| # | 项 | 优先级 | 来源 |
|---|-----|--------|------|
| 6.1 | iLink-bot ↔ Coordinator 对接 | 高 | #53 |
| 6.2 | 异步任务通知（微信回调） | 中 | #57 |
| 6.3 | 任务状态查询命令 | 低 | #58 |

---

## 不在此 TODOs 范围内的（根 TODO.md 覆盖）

以下来自根 TODO.md 第七节的任务已在此处体现对应项：

| 根 # | 内容 | 对应此处 |
|------|------|---------|
| 44 | Coordinator 协议设计 | Phase 2 (A2A 接口层) |
| 45 | 意图解析引擎 | 1.3 |
| 46 | 任务状态机 | 1.4 |
| 47 | 多 Agent 编排 | 3.4 |
| 48 | 产物索引 | 3.5 |
| 49 | 错误处理与重试机制 | 1.5 (核心内建) |
| 50 | Node.js HTTP 服务实现 | 1.6 |
| 51 | 4C4G 部署环境准备 | Phase 5 |
| 52 | Coordinator ↔ Lemong 对接 | 3.1 |
| 53 | iLink-bot ↔ Coordinator 对接 | 6.1 |
| 54 | 端到端验证 | 5.6 |
| 55-59 | Erhu/Zhupu/通知/查询/帮助 | Phase 3 + Phase 6 |

---

## 进度总览

| Phase | 状态 | 项数 | 完成 |
|-------|------|------|------|
| Phase 1: 核心骨架 | ✅ 完成 | 6 | 6 |
| Phase 2: A2A 接口层 | ✅ 完成 | 5 | 5 |
| Phase 3: Agent 适配器 | ✅ 完成 | 5 | 5 |
| Phase 4: Admin UI | ✅ 完成 | 8 | 8 |
| Phase 5: 部署上线 | 🟡 进行中 | 6 | 5 (5.5 SSL 待办) |
| Phase 6: 通信通道 | 🔴 未开始 | 3 | 0 |
| **总计** | | **33** | **29** |
