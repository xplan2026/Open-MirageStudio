# AGENTS.md — Coordinator-Agent 长期记忆与编排/调度

> 本文件是 Coordinator-Agent 的**长期记忆与核心功能定义**：架构、编排链、调度逻辑、状态管理。
> 配套文件：
> - `SOUL.md` — 身份/价值观/性格/边界（灵魂定义，会话启动第一个读取）
> - `GLOSSARY.md` — 本项目自定义名词速查表（会话启动第二个读取）
> - `REGISTER.md` — 工作 Agent 与 Skill 注册信息（会话启动第三个读取）
> - `TODO.md` — 开发计划

---

## 定位

Coordinator-Agent（代号**大副**）是 Mirage Studio 所有 Agent 的**统一调度入口**。

```
用户 (微信 iLink-bot / Admin UI 工作台 / CLI)
        │
        ▼
┌─ Coordinator-Agent ───────────────────────────────┐
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐     │
│  │ 意图解析  │→│ 任务编排  │→│  状态机驱动   │     │
│  │ (LLM)   │  │  (DAG)   │  │ (pending→ok) │     │
│  └──────────┘  └──────────┘  └──────────────┘     │
│         │              │              │            │
│         ▼              ▼              ▼            │
│  ┌──────────────────────────────────────────┐     │
│  │         Agent 适配器层 (内部 A2A)         │     │
│  │  Xujie │ Lemong │ Erhu │ Zhupu │ ...    │     │
│  └──────────────────────────────────────────┘     │
│                                                    │
│  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Admin API       │  │  内部 A2A         │       │
│  │  (工作台专属)     │  │  (JSON-RPC)      │       │
│  └──────────────────┘  └──────────────────┘       │
└────────────────────────────────────────────────────┘
```

## 架构决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 运行时 | Node.js HTTP 服务 (Express) | 轻量、与现有 Agent (CLI Node.js) 一致 |
| A2A 内部协议 | 轻量 JSON-RPC | 务实、低延迟、内部可控 |
| 对外 A2A | **已取消**（2026-08-12 起） | 对外宣传与社交由「外交大使」承接，Coordinator 专注对内调度 |
| Admin UI | React SPA (Vite) | 独立部署、**工作台**定位（创作指令入口 + 产物管理 + 看板） |
| 部署目标 | 4C4G 服务器 (`/opt/mirage-studio`) | 资源充足、已有 Nginx + PM2 |
| 进程管理 | PM2 | 统一管理 coordinator + 其他服务 |

## 访问边界

```
┌─────────────────────────────────────────────────────┐
│  Public (互联网可访问)                                │
│  ├─ Website (Astro SSG) — 官网内容展示               │
│  └─ 宣传大使 Agent (ambassador) — Google A2A 对外    │
│     （独立服务，非 Coordinator 进程）                  │
├─────────────────────────────────────────────────────┤
│  Admin Only (管理员专属)                              │
│  ├─ Admin UI (SPA) — 工作台（创作指令 + 看板 + 产物管理） │
│  └─ Admin API — 编排/监控/日志（JWT/Basic Auth）     │
├─────────────────────────────────────────────────────┤
│  Internal (仅 localhost / Agent 间)                  │
│  ├─ 内部 A2A (JSON-RPC) — Agent 间编排调用         │
│  ├─ Agent 适配器 — 直接调用 Agent CLI               │
│  └─ 状态机/调度器 — 内部逻辑，不暴露               │
└─────────────────────────────────────────────────────┘
```

> **对外 A2A 变更**（2026-08-12）: Coordinator 不再对外暴露 A2A（`A2A_EXTERNAL_ENABLED` 默认 `false`，Nginx 已移除 `/a2a/` 代理）。对外 A2A 由独立 Agent「宣传大使」提供（见 `REGISTER.md`）。

## A2A 协议（对内）

### Agent Card 结构

```json
{
  "agentId": "lemong",
  "name": "Lemong Agent",
  "description": "AI 音乐创作 Agent",
  "capabilities": ["music_generation"],
  "endpoint": "internal://lemong",
  "inputSchema": { "lyrics": "string", "style": "string" },
  "outputSchema": { "taskId": "string", "audioUrl": "string" }
}
```

> 完整 Agent Card 与注册表见 `REGISTER.md`（与 `src/agents/agent-card.js` 保持一致）。

### 任务状态机

```
pending → running → success
                  → failed → (retry) → running
```

### 内部 JSON-RPC 方法

| 方法 | 方向 | 说明 |
|------|------|------|
| `agent.list` | → Coordinator | 获取注册 Agent 列表 |
| `agent.card` | → Coordinator | 获取 Agent Card |
| `task.create` | → Coordinator | 创建编排任务 |
| `task.status` | ← Coordinator | 查询任务状态 |
| `task.cancel` | → Coordinator | 取消任务 |
| `task.result` | ← Coordinator | 获取任务结果 |

## 目录结构

```
coordinator-agent/
├── SOUL.md                      # ★ 灵魂定义 — 身份/价值观/性格/边界（LLM 角色基石）
├── AGENTS.md                    # 本文件 — 长期记忆 + 编排/调度功能
├── REGISTER.md                  # ★ 注册信息 — 工作 Agent + Skill + A2A 协议
├── GLOSSARY.md                  # ★ 自定义名词速查表（优化 LLM 缓存命中）
├── TODO.md                      # 开发计划
├── package.json                 # Node.js 项目配置
├── src/
│   ├── index.js                 # 主入口 — HTTP 服务启动（对外 A2A 默认关闭）
│   ├── coordinator.js           # 协调器核心
│   ├── env.mjs                  # 环境变量加载（加载项目根目录 .env）
│   ├── intent/
│   │   ├── parser.js            # DeepSeek 意图解析引擎
│   │   └── reply.js             # ChatReply — LLM 对话回复生成器（大副）
│   ├── scheduler/
│   │   └── dag.js               # DAG 任务编排器
│   ├── state/
│   │   └── task-state.js        # 任务状态机
│   ├── agents/
│   │   ├── registry.js          # Agent 注册表
│   │   └── agent-card.js        # A2A Agent Card 定义
│   ├── api/
│   │   ├── internal.js          # 内部 A2A 接口 (JSON-RPC, localhost)
│   │   ├── external.js          # 对外 A2A 兼容接口 (Google A2A, 默认禁用)
│   │   ├── workbench.js         # 工作台 API（含 /admin/chat/stream 对话）
│   │   ├── admin.js             # Admin UI API
│   │   └── wechat.js            # 微信通道管理 API（/admin/wechat/status、/admin/wechat/qrcode）
│   ├── channels/
│   │   └── wechat-ilink.js      # ★ 微信 iLink-bot 通道（扫码登录/白名单/收发消息循环）
│   ├── adapters/
│   │   ├── index.js             # 适配器分发中心 getAdapter(agentId)（S1）
│   │   ├── paths.js             # AGENT_ROOT / cliPath 路径收口（S2）
│   │   ├── lemong-adapter.js    # Lemong Agent 适配器（bash CLI）
│   │   ├── erhu-adapter.js      # Erhu Agent 适配器（bash CLI）
│   │   ├── zhupu-adapter.js     # Zhupu Agent 适配器（bash CLI）
│   │   └── xujie-adapter.js     # Xujie 人控适配器（S3：任务落盘 + 人工回写）
│   └── middleware/
│       ├── auth.js              # 认证中间件 (JWT/Basic Auth)
│       └── rate-limit.js        # 限流中间件
├── admin-ui/                    # Admin SPA (React + Vite)
├── nginx/
│   └── coordinator.conf         # Nginx 配置模板（已移除对外 /a2a/）
└── scripts/
    └── deploy.sh                # 部署脚本（.env 写入项目根目录）
```

## 环境变量

| 变量 | 用途 | 默认 |
|------|------|------|
| `COORDINATOR_PORT` | HTTP 服务端口 | 3100 |
| `COORDINATOR_ADMIN_USER` | Admin 用户名 | — |
| `COORDINATOR_ADMIN_PASS` | Admin 密码 | — |
| `ADMIN_SECRET` | JWT 签名密钥 | — |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` | 意图解析 + 对话 LLM（主引擎） | — |
| `ZHIPU_API_KEY` / `ZHIPU_BASE_URL` | LLM 备用引擎（glm-4-flash） | — |
| `COORDINATOR_PUBLIC_URL` | 对外可达地址（微信扫码回调等），**必须含 `https://`** | — |
| `A2A_EXTERNAL_ENABLED` | 是否启用对外 A2A（**默认关闭**） | `false` |
| `WECHAT_ADMIN_ID` | 微信单账号白名单（iLink 管理员微信 ID）。空=未绑定可扫码；有值=已绑定**禁止再次扫码** | — |

> **`.env` 加载位置**: `src/env.mjs` 加载**项目根目录** `/opt/mirage-studio/.env`（非 `coordinator-agent/.env`）。部署脚本已适配（见 `scripts/deploy.sh`）。

## 微信 iLink-bot 通道

Coordinator 内置微信通道（`src/channels/wechat-ilink.js`），随 PM2 进程启动，零外部 SDK（原生 fetch）。

**协议**（微信官方 ClawBot，2026-03 推出）：
- 扫码登录：`GET {base}/ilink/bot/get_bot_qrcode?bot_type=3` → 返回 `qrcode`（token）+ `qrcode_img_content`（授权链接，前端渲染二维码）
- 状态轮询：`GET {base}/ilink/bot/get_qrcode_status?qrcode=xxx` → `status: wait|scaned|confirmed|expired`
- 确认绑定：`confirmed` 响应**顶层**字段 `bot_token` / `ilink_bot_id` / `ilink_user_id`（管理员微信 ID）/ `baseurl`
- 收消息：`POST {base}/ilink/bot/getupdates`（长轮询，body 含 `get_updates_buf` + `base_info`）
- 发消息：`POST {base}/ilink/bot/sendmessage`（body 含 `client_id` 去重 + `base_info`）
- 消息枚举：`message_type` `1`=用户 / `2`=BOT；`item_list[].type` `1`=文本；`message_state` `2`=FINISH
- 认证头：`AuthorizationType: ilink_bot_token` + `X-WECHAT-UIN`（随机）+ `Bearer bot_token`

**单账号白名单**：
- 只允许管理员本人一个微信账号认证（ID 存 `.env` 的 `WECHAT_ADMIN_ID`）
- 首次扫码登录时自动将 `ilink_user_id` 写入 `.env`，并持久化 `bot_token` 等凭据到 `coordinator-agent/data/`（已 gitignore）
- 已绑定后 `POST /admin/wechat/qrcode` 返回 403，**禁止再次扫码**；换绑需手动清 `.env` 的 `WECHAT_ADMIN_ID` 后重启
- 非管理员微信消息**直接忽略**（白名单过滤在消息循环入口）

**消息链路**：收到文本 → 白名单校验 → `handleRequest`（coordinator.js 统一入口，意图→执行→回复）→ `sendmessage` 回发。

### AI 引擎降级链

```
DeepSeek (deepseek-chat)     ← 主引擎，语义理解 + 对话
    ↓ 失败
智谱 (glm-4-flash)           ← 备用引擎，优先降级
    ↓ 失败
关键词正则匹配 + 兜底文案    ← 完全离线可用（意图解析）/ 硬编码回复（对话）
```

## 核心编排链

Coordinator 支持以下跨 Agent 编排路径（**全部用户指令触发**，非自动联动）：

### 小说创作链
```
用户指令 → 意图解析 → Xujie Writer: 续写章节
                    → 完成后: 新角色检测 → Zhupu Manager: 同步族谱
```

### 从小说到歌曲链
```
用户指令 → 意图解析 → 提取小说上下文 (Xujie)
                    → Lemong: 基于章节主题创作歌曲
                    → 产物路径回写
```

### 歌曲到 MV 链
```
用户指令 → 意图解析 → Erhu: 基于已有歌曲制作 MV
                    → 产物路径回写
```

### 独立创作（各 Agent 独立使用）
```
用户指令 → 意图解析 → 直接路由到目标 Agent
```

## 与现有 Agent 的关系

- **不替代** Lemong/Erhu/Zhupu/Xujie — 作为上层编排层
- **不修改** 现有 Agent 的 CLI 接口 — 通过适配器调用
- **Website** (Astro SSG) 不受影响 — 继续从 `data/` 目录静态读取
- **Admin UI** 是新独立组件 — 不走 Website 耦合
- **宣传大使**（ambassador）— 独立对外服务，不参与内部调度（见 `REGISTER.md`）

---

## Session Startup（会话启动加载顺序）

每次会话开始时，按以下顺序读取（**顺序不可颠倒**，前面的定义被后面的引用）：

1. **`SOUL.md`** — 身份、价值观、性格、边界（我是谁，我做什么，我不做什么）
2. **`GLOSSARY.md`** — 自定义名词速查（大副/幻觉/二虎/工作台/...，不重复解释）
3. **本文件 `AGENTS.md`** — 长期记忆、架构、编排链、调度规则
4. **`REGISTER.md`** — 当前注册的 Agent/Skill 清单（谁在编、有什么能力）
5. **`TODO.md`** — 待办与进行中事项（必要时读取）

## 长期记忆维护规则

- **`AGENTS.md` 是长期记忆载体**：沉淀的决策、经验、约束写入本文件（如架构决策、访问边界变更、部署经验）
- **注册类信息**（谁、在哪、什么能力）→ `REGISTER.md`
- **名词定义** → `GLOSSARY.md` + 权威源 `docs/standard/custom_nouns.md`
- **身份类** → `SOUL.md`
- 变更时同步更新对应文件，保持单一信任源不冲突

---

> 工作 Agent 与 Skill 注册信息：见 `REGISTER.md`。
