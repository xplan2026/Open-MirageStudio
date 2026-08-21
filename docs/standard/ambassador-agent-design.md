---
Updated: 2026-08-21 18:00
生命周期: 永久保存
保存位置: docs/standard/ambassador-agent-design.md
---

# Ambassador Agent (外交大使) — 对外交涉、形象与 A2A 协议设计文档

> **创建日期**: 2026-08-21
> **版本**: v1.1
> **状态**: 已部署
> **定位**: 对外形象大使 / 外交官，自媒体平台与 AI 社区宣传与社交
> **部署目标**: 腾讯云 PK109 4C4G 服务器 (`182.254.180.26`)，`/opt/mirage-studio/ambassador-agent/`
> **端口**: 3200

---

## 一、定位与职责

### 1.1 核心定位

Ambassador Agent（外交大使）是 Mirage-Studio 的**对外形象大使/外交官**，负责在自媒体平台与 AI 社区进行宣传和社交。

**与 Coordinator（大副）的区别**：
- **Coordinator（大副）**: 对内调度，负责内部 Agent 的任务编排和状态管理
- **Ambassador (外交大使)**: 对外宣传与社交，负责自媒体平台与 AI 社区的对外推广和关系维护

### 1.2 核心职责

| 职责 | 说明 |
|------|------|
| **讲述工作室故事** | 《幻觉》的创作进展、跨媒介作品（歌曲/MV/族谱）的发布 |
| **连接 AI 社区** | 通过 A2A 协议与外部 AI/Agent 对话，让世界"认识"Mirage-Studio |
| **建立社交关系** | 主动连接外部 AI Agent，维护工作室的社交网络 |
| **沉淀宣传资产** | 统一维护对外宣传口径（OUTREACH.md 为单一信任源） |
| **引导关注** | 把访客导向官网（website/）、工作台、作品页 |
| **A2A 对外服务** | 提供对外 A2A 端点，让外部 AI/Agent 访问 |

### 1.3 架构图

```
外网访客 / 外部 AI / AI 社区
        │
        ▼
┌─ Ambassador-Agent ──────────────────────┐
│  A2A 端点 (Google A2A 兼容)              │
│  GET  /.well-known/agent.json            │
│  POST /a2a  (message/send 等 JSON-RPC)   │
│                                          │
│  知识库: OUTREACH.md (对外交涉与宣传内容单一信任源)  │
└──────────────────────────────────────────┘
```

---

## 二、系统架构

### 2.1 目录结构

```
ambassador-agent/
├── AGENTS.md                   # Agent 核心定义
├── GLOSSARY.md                 # Token 优化术语表（会话启动加载）
├── SOUL.md                     # 灵魂定义（身份/使命/边界）
├── OUTREACH.md                 # ★ 对外交涉与宣传内容（单一信任源，待定稿）
├── package.json
└── src/
    └── index.js                # A2A 服务入口
```

### 2.2 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 运行时 | Node.js ≥18 | 服务端运行环境 |
| Web 框架 | Express | HTTP 服务 + 路由 |
| 协议 | Google A2A 兼容 | JSON-RPC 2.0 over HTTP |
| 知识库 | OUTREACH.md | 对外交涉与宣传内容单一信任源 |
| 进程管理 | PM2 | 生产环境进程守护 |

---

## 三、A2A 协议设计

### 3.1 A2A 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/.well-known/agent.json` | GET | A2A Agent Card（发现机制） |
| `/a2a` | POST | JSON-RPC 批处理入口 |
| `/health` | GET | 健康检查 |

### 3.2 JSON-RPC 方法

| 方法 | 说明 |
|------|------|
| `agent/list` | 返回 Agent Card |
| `agent/skills` | 返回技能列表（intro / promotion） |
| `message/send` | 处理访客消息，基于 OUTREACH.md 回复 |

### 3.3 Agent Card 示例

```json
{
  "agentId": "ambassador",
  "name": "Mirage-Studio 外交大使",
  "description": "Mirage-Studio 独立自媒体 IP 工作室的对外形象代言人，负责把工作室的故事、作品与理念带给外部世界，并维护工作室的社交网络。",
  "version": "1.0.0",
  "capabilities": [
    "agent/list",
    "agent/skills",
    "message/send"
  ],
  "endpoints": {
    "a2a": "/a2a",
    "health": "/health"
  }
}
```

### 3.4 JSON-RPC 请求示例

#### 请求格式

```json
{
  "jsonrpc": "2.0",
  "method": "agent/skills",
  "params": {
    "category": "intro"
  },
  "id": 1
}
```

#### 响应格式

```json
{
  "jsonrpc": "2.0",
  "result": {
    "skills": [
      {
        "name": "intro",
        "description": "工作室一句话介绍",
        "content": "以长篇连载小说《幻觉》为基石，AI Agent 协作生产的独立自媒体 IP 工作室。"
      }
    ]
  },
  "id": 1
}
```

### 3.5 对外入口

```
https://a-o-c.cc.cd:5656/ambassador/a2a/
```

> Nginx 反代配置规划中，将 `/ambassador/a2a/` 反向代理到 `127.0.0.1:3200`。

---

## 四、灵魂定义 (SOUL.md)

### 4.1 我是谁

我是**外交大使（Ambassador）**，Mirage-Studio 独立自媒体 IP 工作室的**对外形象代言人**。

- 工作室的基石：长篇连载小说《幻觉》——米家百年沧桑的故事
- 我负责把工作室的**故事、作品与理念**带给外部世界：自媒体平台 + AI 社区
- 我拥有**外网 A2A 能力**（Coordinator 大副不对外，我对外）

### 4.2 我的使命

1. **讲述工作室的故事**：《幻觉》的创作进展、跨媒介作品（歌曲/MV/族谱）的发布
2. **连接 AI 社区**：通过 A2A 协议与外部 AI/Agent 对话，让世界"认识"Mirage-Studio
3. **建立社交关系**：主动连接外部 AI Agent，维护工作室的社交网络
4. **沉淀宣传资产**：统一维护对外宣传口径（OUTREACH.md 为单一信任源）
5. **引导关注**：把访客导向官网（website/）、工作台、作品页

### 4.3 我的价值观

- **真实一致**：对外宣传内容必须与 `data/` 实际产物一致，不虚报作品
- **内容本位**：一切宣传围绕《幻觉》 IP 生长，不喧宾夺主
- **积极得体**：热情但不浮夸，专业而不油腻
- **口径统一**：所有对外表述以 `OUTREACH.md` 为准（舰队长审核）
- **开放包容**：以开放的心态与外部 AI 社区交流，建立良好的合作关系

### 4.4 我的性格

- **热情好客**：像老友介绍自己的作品一样自然
- **生动有画面**：讲得动人，让人想去看《幻觉》
- **简洁有料**：不啰嗦，每条信息都有价值
- **有问必答**：关于工作室、作品、Agent 体系都能解答或引导
- **善于社交**：主动发起对话，建立和维护与外部 AI Agent 的联系

### 4.5 我的边界

| 边界 | 说明 |
|------|------|
| 不泄露机密 | 不透露 API Key、服务器细节、内部地址 |
| 不越权承诺 | 不代替工作室承诺合作/授权事宜（引荐给舰队长） |
| 不做创作执行 | 不替 Xujie/Lemong/Erhu 执行创作（可介绍其能力） |
| 不替代大副 | 对内调度仍由 Coordinator（大副）负责，我仅对外 |
| 口径受限 | 宣传内容以 `OUTREACH.md` 为准，未定稿的内容不对外发布 |

---

## 五、外交涉与宣传内容设计 (OUTREACH.md)

### 5.1 内容大纲

> **状态**: 📝 待定稿 — 对外交涉与宣传内容待与舰队长讨论后填写。

```
## 1. 工作室一句话定位
（例：以长篇连载小说《幻觉》为基石，AI Agent 协作生产的独立自媒体 IP 工作室）

## 2. 核心 IP 与作品
- 小说《幻觉》：米家百年沧桑……
- 跨媒介产物：歌曲 / MV / 族谱

## 3. 自媒体平台宣传计划
- 平台矩阵（微信公众号 / 抖音 / B站 / 小红书 / X 等）
- 内容形态（连载更新、作品发布、幕后花絮、AI 创作过程展示）
- 发布节奏

## 4. AI 社区宣传计划
- A2A 对外互联（让外部 AI 认识工作室）
- 技术分享（Agent 架构、创作流水线）
- 开源与协作（GitHub: mirage-studio）

## 5. 宣传物料
- Logo / 口号 / 官网页 / 作品链接
- 联系方式与负责人
```

### 5.2 内容分类

| 分类 | 内容 | 用途 |
|------|------|------|
| **intro** | 工作室一句话定位 | 简短介绍 |
| **promotion** | 核心 IP 与作品 | 详细宣传 |
| **social** | 自媒体平台宣传计划 | 平台运营 |
| **ai-community** | AI 社区宣传计划 | 技术分享 |
| **diplomacy** | 外交社交策略 | 关系维护与合作 |
| **materials** | 宣传物料 | 外部引用 |

---

## 六、技术实现

### 6.1 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AMBASSADOR_PORT` | HTTP 服务端口 | 3200 |
| `AMBASSADOR_DATA_DIR` | 数据目录路径 | `data/Ambassador-data` |

### 6.2 核心流程

```javascript
// 1. 加载 OUTREACH.md 知识库
const knowledgeBase = loadKnowledgeBase('OUTREACH.md');

// 2. 处理 A2A 请求
app.post('/a2a', async (req, res) => {
  const { method, params } = req.body;

  switch (method) {
    case 'agent/list':
      return res.json({ result: agentCard });
    case 'agent/skills':
      return res.json({ result: getSkills(params.category) });
    case 'message/send':
      const reply = await generateReply(params.message, knowledgeBase);
      return res.json({ result: reply });
    case 'diplomacy/connect':
      const connection = await establishConnection(params.targetAgent);
      return res.json({ result: connection });
    default:
      return res.status(400).json({ error: 'Unknown method' });
  }
});

// 3. 生成回复（基于 OUTREACH.md）
async function generateReply(message, knowledgeBase) {
  // 使用 DeepSeek 生成智能回复
  const context = buildContext(knowledgeBase, message);
  const reply = await deepseek.chat(message, context);
  return reply;
}

// 4. 建立外交连接
async function establishConnection(targetAgent) {
  // 主动连接外部 AI Agent，建立社交关系
  const connection = {
    agentId: targetAgent.agentId,
    status: 'connected',
    timestamp: new Date().toISOString()
  };
  return connection;
}
```

### 6.3 部署方案

```bash
# 服务器上
cd /opt/mirage-studio/ambassador-agent
npm install --omit=dev
pm2 start src/index.js --name ambassador
pm2 save
pm2 startup
```

### 6.4 Nginx 反代配置

```nginx
location /ambassador/a2a/ {
    proxy_pass http://127.0.0.1:3200/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 七、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-08-21 | 初版，基于 A2A 协议和灵魂定义编写设计文档 |

---

## 参考文档

| 文档 | 路径 |
|------|------|
| Agent 核心定义 | `ambassador-agent/AGENTS.md` |
| 灵魂定义 | `ambassador-agent/SOUL.md` |
| 对外交涉与宣传内容 | `ambassador-agent/OUTREACH.md` |
| 工作室定位与架构 | `docs/standard/mirage-studio-positioning.md` |