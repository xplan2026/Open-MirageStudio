---
Updated: 2026-08-21 15:00
生命周期: 永久保存
保存位置: docs/standard/coordinator-agent-design.md
---

# Coordinator-Agent (大副) — 统一调度层设计文档

> **创建日期**: 2026-08-21
> **版本**: v1.0
> **状态**: 已部署上线
> **部署目标**: 腾讯云 PK109 4C4G 服务器 (`182.254.180.26`)，`/opt/mirage-studio/coordinator-agent/`
> **端口**: 3100

---

## 一、定位与职责

### 1.1 核心定位

Coordinator-Agent（代号：大副）是 Mirage-Studio 的**统一调度层**，负责所有 Agent 的任务编排、状态管理和访问控制。

**与各 Agent 的关系**：

```
用户指令 (微信 / Admin-UI / CLI / 外部 A2A)
    ↓
Coordinator-Agent (统一调度层)
    ↓
    ├─► Xujie Writer Agent (小说创作)
    ├─► Lemong Agent (歌曲创作)
    ├─► Erhu Agent (MV 制作)
    └─► Zhupu Manager Agent (族谱管理)
```

**与外交大使的区别**：
- **Coordinator（大副）**: 对内调度，负责内部 Agent 的任务编排和状态管理
- **Ambassador (外交大使)**: 对外宣传与社交，负责自媒体平台与 AI 社区的对外推广和关系维护

### 1.2 核心职责

| 职责 | 说明 |
|------|------|
| **意图解析** | 解析用户指令，识别目标 Agent 和参数 |
| **任务编排** | 根据任务类型路由到对应的 Agent，支持编排链（小说→族谱同步） |
| **状态管理** | 维护各 Agent 的注册信息和运行状态 |
| **访问控制** | 管理内部 API (JWT)、外部 API (Rate Limit)、内部 A2A (localhost only) |
| **通信路由** | 提供 iLink-bot 微信通道、Admin-UI 工作台、对外 A2A 接口 |

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Coordinator-Agent (大副)                  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              HTTP 服务层 (Express)                      │ │
│  │  Port 3100                                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ 认证路由 │ 内部 A2A │ Admin API│对外 A2A  │健康检查  │   │
│  │ /auth    │ /internal│ /admin   │ /a2a     │ /health  │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              通信通道层 (Channels)                      │ │
│  │  • iLink-bot 微信通道 (channels/wechat-ilink.js)        │ │
│  │  • CLI 调用 (直连 /api/workbench/)                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              意图解析与调度层 (Intent + Scheduler)      │ │
│  │  • intent/parse.js — 解析用户指令                      │ │
│  │  • scheduler/dispatcher.js — 任务分发                  │ │
│  │  • scheduler/workflows.js — 编排链定义                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Agent 注册表 (Agents Registry)             │ │
│  │  • agents/registry.js — Agent 注册与管理               │ │
│  │  • agents/xujie.js — Xujie Writer 适配器               │ │
│  │  • agents/zhupu.js — Zhupu Manager 适配器               │ │
│  │  • agents/lemong.js — Lemong 适配器                    │ │
│  │  • agents/erhu.js — Erhu 适配器                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              状态管理 (State Store)                     │ │
│  │  • state/tasks.js — 任务状态存储 (文件系统)             │ │
│  │  • state/agents.js — Agent 状态缓存 (内存)              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
coordinator-agent/
├── AGENTS.md                   # Agent 核心定义
├── TODO.md                     # 开发计划 (33 项，6 个 Phase)
├── package.json
├── src/
│   ├── index.js                # HTTP 服务入口
│   ├── coordinator.js          # Coordinator 核心逻辑
│   ├── config.js               # 配置加载
│   ├── env.mjs                 # 环境变量加载
│   ├── agents/                 # Agent 注册与适配器
│   │   ├── registry.js         # Agent 注册表
│   │   ├── xujie.js            # Xujie Writer 适配器
│   │   ├── zhupu.js            # Zhupu Manager 适配器
│   │   ├── lemong.js           # Lemong 适配器
│   │   └── erhu.js             # Erhu 适配器
│   ├── channels/               # 通信通道
│   │   └── wechat-ilink.js     # iLink-bot 微信通道
│   ├── intent/                 # 意图解析
│   │   └── parse.js            # 指令解析逻辑
│   ├── scheduler/              # 任务调度
│   │   ├── dispatcher.js       # 任务分发器
│   │   └── workflows.js        # 编排链定义
│   ├── state/                  # 状态管理
│   │   ├── tasks.js            # 任务状态存储
│   │   └── agents.js           # Agent 状态缓存
│   ├── api/                    # API 路由
│   │   ├── internal.js         # 内部 A2A 路由
│   │   ├── external.js         # 对外 A2A 路由
│   │   ├── admin.js            # Admin API 路由
│   │   ├── workbench.js        # Workbench API 路由
│   │   ├── xujie-skills.js     # Xujie 专用 API 路由
│   │   ├── auth.js             # 认证 API 路由
│   │   └── wechat.js           # 微信 API 路由
│   ├── middleware/             # 中间件
│   │   ├── auth.js             # JWT 认证中间件
│   │   └── rate-limit.js       # 速率限制中间件
│   └── adapters/               # 外部服务适配器
└── admin-ui/                   # React SPA 工作台
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── api.js
    │   └── App.jsx
    ├── package.json
    └── vite.config.js
```

### 2.3 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 运行时 | Node.js ≥18 | 服务端运行环境 |
| Web 框架 | Express | HTTP 服务 + 路由 |
| 认证 | JWT (jsonwebtoken) | Admin API 认证 |
| 前端 | React + Vite | Admin UI 工作台 |
| 状态管理 | 文件系统 (JSON) | 任务持久化存储 |
| 通信协议 | JSON-RPC 2.0 | 对外 A2A 接口 |
| 微信集成 | iLink-bot SDK | 微信通道 |
| 进程管理 | PM2 | 生产环境进程守护 |

---

## 三、访问边界与权限控制

### 3.1 API 分层

| 层级 | 端点前缀 | 认证方式 | 用途 |
|------|---------|---------|------|
| **Public** | `/auth`, `/health` | 无 | 二维码登录、健康检查 |
| **Admin** | `/admin/*` | JWT + Basic Auth | 工作台操作、任务管理 |
| **Internal** | `/internal/*` | localhost only | 内部 Agent 间调用 |
| **External** | `/a2a` | Rate Limit | 对外 A2A 接口（默认禁用） |

### 3.2 认证机制

#### JWT 认证（Admin API）

1. **登录流程**：
   ```
   POST /auth/login
   Body: { username, password }
   → 验证 Basic Auth (环境变量 ADMIN_USER / ADMIN_PASSWORD)
   → 返回 JWT token: { token, expiresIn: '24h' }
   ```

2. **使用方式**：
   ```javascript
   // Header: Authorization: Bearer <token>
   GET /admin/agents/status
   ```

#### Basic Auth（Admin UI 部署）

```nginx
# Nginx 配置（见 docs/部署记录/admin-UI部署方案.md）
location /workbench {
    auth_basic "MirageStudio Workbench";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://127.0.0.1:3100/workbench;
}
```

#### 内部 A2A（localhost only）

```javascript
app.use('/internal', (req, res, next) => {
  const remote = req.ip || req.socket.remoteAddress;
  if (remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1') {
    return next();
  }
  res.status(403).json({ error: 'Internal API accessible only from localhost' });
}, internalRouter);
```

### 3.3 速率限制

对外 A2A 接口使用速率限制中间件，默认配置：

```javascript
// middleware/rate-limit.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 100,                   // 最多 100 次请求
  message: 'Too many requests from this IP'
});
```

---

## 四、API 设计

### 4.1 核心端点列表

#### 公开端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/auth/login` | POST | 登录获取 JWT token |
| `/auth/qr` | GET | 获取二维码登录状态 |
| `/auth/verify` | POST | 验证 JWT token |

#### Admin API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/admin/agents/status` | GET | 获取所有 Agent 状态 |
| `/admin/agents/{agent}/status` | GET | 获取指定 Agent 状态 |
| `/admin/tasks/list` | GET | 获取任务列表 |
| `/admin/tasks/{id}` | GET | 获取任务详情 |
| `/admin/tasks/{id}/cancel` | POST | 取消任务 |

#### Workbench API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/workbench/creator/write` | POST | 触发小说续写 |
| `/api/workbench/creator/song` | POST | 触发歌曲创作 |
| `/api/workbench/creator/mv` | POST | 触发 MV 制作 |
| `/api/workbench/assets/chapters` | GET | 获取章节列表 |
| `/api/workbench/assets/songs` | GET | 获取歌曲列表 |
| `/api/workbench/assets/mvs` | GET | 获取 MV 列表 |
| `/api/workbench/assets/:type/:id/publish` | PATCH | 上下线制品 |
| `/api/workbench/promotion/qa` | POST | AI 问答 |
| `/api/workbench/promotion/social` | POST | 社交媒体文案生成 |

#### 内部 A2A

| 端点 | 方法 | 说明 |
|------|------|------|
| `/internal/a2a` | POST | 内部 JSON-RPC 批处理 |

#### 对外 A2A（默认禁用）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/.well-known/agent.json` | GET | A2A Agent Card |
| `/a2a` | POST | JSON-RPC 批处理 |

### 4.2 JSON-RPC 协议规范

#### 请求格式

```json
{
  "jsonrpc": "2.0",
  "method": "agent/status",
  "params": { "agent": "xujie" },
  "id": 1
}
```

#### 响应格式

```json
{
  "jsonrpc": "2.0",
  "result": { "status": "ready", "lastTask": "..." },
  "id": 1
}
```

#### 批处理请求

```json
[
  { "jsonrpc": "2.0", "method": "agent/status", "params": { "agent": "xujie" }, "id": 1 },
  { "jsonrpc": "2.0", "method": "agent/status", "params": { "agent": "zhupu" }, "id": 2 }
]
```

### 4.3 典型工作流示例

#### 小说续写 → 族谱同步（编排链）

```javascript
// POST /api/workbench/creator/write
{
  "chapter": "第11章",
  "context": {
    "family": "米家",
    "previousChapter": "第10章"
  }
}

// Coordinator 内部编排：
// 1. 调用 Xujie Writer Agent → 生成第11章
// 2. 解析新章节中出现的新角色
// 3. 调用 Zhupu Manager Agent → 更新族谱（米家/姻亲/社会关系）
```

#### 歌曲创作 → MV 制作（编排链）

```javascript
// POST /api/workbench/creator/song
{
  "source": "novel",
  "chapter": "第10章",
  "theme": "孤独与自由"
}

// Coordinator 内部编排：
// 1. 从小说章节提取创作背景
// 2. 调用 Lemong Agent → 生成歌曲（注入二虎音色）
// 3. 用户确认后，调用 Erhu Agent → 制作 MV
```

---

## 五、核心编排链

### 5.1 小说链

```
用户指令 (续写第 N 章)
    ↓
[意图解析] → 识别目标 Agent: Xujie Writer
    ↓
[调度器] → 调用 Xujie Writer Agent
    ↓
[执行] → 生成第 N 章
    ↓
[解析] → 提取新角色信息
    ↓
[自动触发] → 调用 Zhupu Manager Agent
    ↓
[更新] → 同步族谱（米家/姻亲/社会关系）
```

### 5.2 歌曲链

```
用户指令 (从小说提取灵感创作歌曲)
    ↓
[意图解析] → 识别来源: 小说
    ↓
[上下文提取] → 提取章节内容、角色、主题
    ↓
[调度器] → 调用 Lemong Agent
    ↓
[执行] → 生成歌词 + 音乐 (注入二虎音色)
    ↓
[完成] → 返回歌曲产物
```

### 5.3 MV 链

```
用户指令 (为歌曲制作 MV)
    ↓
[意图解析] → 指定歌曲名或主题
    ↓
[调度器] → 调用 Erhu Agent
    ↓
[执行] →
    ├─► 如果歌曲不存在 → 先调用 Lemong Agent 创作
    ├─► 图片生成 (DeepSeek + 百度文心一格)
    ├─► 音轨分离 (mvsep)
    ├─► 对口型生成 (wan2.2-s2v)
    └─► 视频合成 (FFmpeg)
    ↓
[完成] → 返回 MV 产物
```

---

## 六、Agent 注册表设计

### 6.1 Agent 注册信息结构

```javascript
// agents/registry.js
const AGENTS = {
  xujie: {
    name: 'xujie',
    displayName: 'Xujie Writer',
    description: 'AI 辅助长篇小说写作 Agent',
    type: 'internal',
    status: 'ready',
    path: '/xujie-writer-agent/',
    adapter: 'agents/xujie.js',
    endpoints: {
      create: '/api/workbench/creator/write',
      status: '/admin/agents/xujie/status'
    },
    skills: ['novel-writing', 'character-management', 'plot-tracking']
  },
  zhupu: {
    name: 'zhupu',
    displayName: 'Zhupu Manager',
    description: '族谱管理 Agent',
    type: 'internal',
    status: 'ready',
    path: '/zhupu-manager-agent/',
    adapter: 'agents/zhupu.js',
    endpoints: {
      sync: '/internal/zhupu/sync',
      status: '/admin/agents/zhupu/status'
    },
    skills: ['family-tree', 'relationship-visualization']
  },
  lemong: {
    name: 'lemong',
    displayName: 'Lemong',
    description: 'AI 音乐创作 Agent',
    type: 'internal',
    status: 'ready',
    path: '/lemong-agent/',
    adapter: 'agents/lemong.js',
    endpoints: {
      create: '/api/workbench/creator/song',
      status: '/admin/agents/lemong/status'
    },
    skills: ['music-generation', 'lyrics-writing']
  },
  erhu: {
    name: 'erhu',
    displayName: 'Erhu (二虎)',
    description: 'AI 数字人歌手 MV 制作 Agent',
    type: 'internal',
    status: 'ready',
    path: '/erhu-agent/',
    adapter: 'agents/erhu.js',
    endpoints: {
      create: '/api/workbench/creator/mv',
      status: '/admin/agents/erhu/status'
    },
    skills: ['mv-production', 'video-synthesis', 'lip-sync']
  }
};
```

### 6.2 Agent 适配器设计

每个 Agent 都有一个适配器文件，负责：

1. **参数转换**: 将 Coordinator 的通用任务格式转换为 Agent 专用格式
2. **结果封装**: 将 Agent 的返回结果封装为统一格式
3. **错误处理**: 统一处理 Agent 调用失败的情况

示例：`agents/xujie.js`

```javascript
export async function createChapter(task) {
  // 转换参数
  const xujieTask = {
    chapter: task.params.chapter,
    family: task.params.context.family,
    previousChapter: task.params.context.previousChapter
  };

  // 调用 Xujie Writer CLI
  const result = await exec('node', [
    '/workspace/xujie-writer-agent/xujie-writer',
    'write',
    '--chapter', xujieTask.chapter,
    '--family', xujieTask.family,
    '--previous', xujieTask.previousChapter
  ]);

  // 封装结果
  return {
    status: 'success',
    outputPath: result.outputPath,
    chapterNumber: result.chapterNumber,
    characters: result.characters  // 新出现的角色
  };
}
```

---

## 七、状态管理设计

### 7.1 任务状态存储

任务状态存储在 `state/tasks/` 目录，按时间戳命名：

```json
// state/tasks/20260821-143025-xujie-write-11.json
{
  "id": "20260821-143025-xujie-write-11",
  "agent": "xujie",
  "type": "write",
  "params": {
    "chapter": "第11章",
    "family": "米家"
  },
  "status": "running",
  "createdAt": "2026-08-21T14:30:25.000Z",
  "updatedAt": "2026-08-21T14:31:00.000Z",
  "result": null,
  "error": null
}
```

### 7.2 Agent 状态缓存

Agent 状态缓存存储在内存中，定期持久化到 `state/agents/`：

```javascript
// state/agents/agent-status.json
{
  "xujie": {
    "status": "ready",
    "lastTask": "20260821-143025-xujie-write-11",
    "lastActivity": "2026-08-21T14:30:25.000Z",
    "errorCount": 0
  },
  "zhupu": {
    "status": "ready",
    "lastTask": "20260820-120015-zhupu-sync",
    "lastActivity": "2026-08-20T12:00:15.000Z",
    "errorCount": 0
  }
}
```

---

## 八、微信集成设计

### 8.1 iLink-bot 通道

微信通道通过 iLink-bot SDK 实现，支持：

| 功能 | 说明 |
|------|------|
| **消息接收** | 接收用户发送的文本指令 |
| **消息发送** | 向用户发送任务结果和进度通知 |
| **二维码登录** | 生成二维码供用户扫码绑定微信账号 |
| **自动回复** | 基于意图解析的智能回复 |

### 8.2 微信指令格式

```
# 小说续写
续写第 11 章，米家

# 歌曲创作
为第 10 章创作一首歌，主题是孤独与自由

# MV 制作
为歌曲《归航109》制作 MV

# 族谱查询
查询米家族谱
```

---

## 九、环境变量配置

### 9.1 必填环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `COORDINATOR_PORT` | HTTP 服务端口 | 3100 |
| `ADMIN_USER` | Admin UI 用户名 | — |
| `ADMIN_PASSWORD` | Admin UI 密码 | — |
| `JWT_SECRET` | JWT 签名密钥 | — |

### 9.2 可选环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `A2A_EXTERNAL_ENABLED` | 是否启用对外 A2A | false |
| `RATE_LIMIT_WINDOW_MS` | 速率限制窗口 (ms) | 900000 (15 分钟) |
| `RATE_LIMIT_MAX` | 速率限制最大请求数 | 100 |

---

## 十、部署方案

### 10.1 部署架构

```
Nginx (反向代理)
    ↓
    ├─► /workbench → 127.0.0.1:3100/workbench (Admin UI, Basic Auth)
    ├─► /admin/api → 127.0.0.1:3100/admin (Admin API, JWT)
    └─► /health → 127.0.0.1:3100/health (健康检查)

PM2 (进程守护)
    ├─► coordinator-agent (端口 3100)
    └─► ambassador-agent (端口 3200)
```

### 10.2 部署步骤

```bash
# 1. 上传代码到服务器
rsync -av --delete /workspace/coordinator-agent/ user@182.254.180.26:/opt/mirage-studio/coordinator-agent/

# 2. 安装依赖
cd /opt/mirage-studio/coordinator-agent
npm install --omit=dev

# 3. 构建前端
cd admin-ui
npm install
npm run build

# 4. 配置 PM2
pm2 start src/index.js --name coordinator -- --port 3100
pm2 save
pm2 startup

# 5. 配置 Nginx (见 docs/部署记录/admin-UI部署方案.md)
```

---

## 十一、错误处理与监控

### 11.1 错误分类

| 类型 | 处理方式 |
|------|---------|
| **参数错误** | 返回 400 Bad Request，包含错误详情 |
| **认证错误** | 返回 401 Unauthorized，提示重新登录 |
| **权限错误** | 返回 403 Forbidden |
| **Agent 调用失败** | 记录错误日志，更新任务状态为 `failed` |
| **系统错误** | 返回 500 Internal Server Error，记录错误堆栈 |

### 11.2 日志设计

```javascript
// 日志级别
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

// 日志格式
{
  timestamp: '2026-08-21T14:30:25.000Z',
  level: 'info',
  module: 'coordinator',
  message: 'Task created',
  data: { taskId: '20260821-143025-xujie-write-11' }
}
```

### 11.3 监控指标

| 指标 | 说明 |
|------|------|
| **任务成功率** | 成功任务数 / 总任务数 |
| **平均执行时间** | 各 Agent 任务的平均耗时 |
| **API 响应时间** | 各端点的 P50/P95/P99 延迟 |
| **Agent 健康度** | 各 Agent 的在线状态和错误率 |
| **并发任务数** | 当前正在执行的任务数量 |

---

## 十二、安全设计

### 12.1 安全措施

| 措施 | 说明 |
|------|------|
| **JWT 认证** | Admin API 使用 JWT token，有效期 24 小时 |
| **Basic Auth** | Admin UI 使用 Nginx Basic Auth |
| **速率限制** | 对外 A2A 接口限制 15 分钟 100 次请求 |
| **localhost only** | 内部 A2A 接口仅允许本地访问 |
| **HTTPS** | 生产环境强制 HTTPS（Nginx SSL 证书） |
| **输入验证** | 所有 API 输入参数进行类型和格式验证 |

### 12.2 敏感信息管理

| 信息 | 存储方式 |
|------|---------|
| `ADMIN_USER` / `ADMIN_PASSWORD` | 环境变量 |
| `JWT_SECRET` | 环境变量 |
| 微信 iLink-bot 凭证 | 环境变量 |
| Agent API Keys | 各 Agent 独立的环境变量 |

---

## 十三、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-08-21 | 初版，基于实际部署状态编写架构与 API 设计 |

---

## 参考文档

| 文档 | 路径 |
|------|------|
| Agent 核心定义 | `coordinator-agent/AGENTS.md` |
| 开发计划 | `coordinator-agent/TODO.md` |
| Admin-UI 工作台设计 | `docs/standard/admin-ui-workbench-design.md` |
| Admin-UI 部署方案 | `docs/部署记录/admin-UI部署方案.md` |
| 工作室定位与架构 | `docs/standard/mirage-studio-positioning.md` |