# REGISTER.md — 工作 Agent 与 Skill 注册信息

> 本文件是 Coordinator-Agent 的**注册信息权威源**（Single Source of Truth）：
> 所有可调度的工作 Agent、以及项目可用的 Skill，均在此登记。
> 代码侧的运行时注册表是 `src/agents/agent-card.js`（`AGENT_CARDS` 数组）——**本文档与代码必须保持一致**。
> 修改任何注册信息时，务必同步更新：本文档 + `agent-card.js`（如需代码生效）。

---

## 一、工作 Agent 注册表

### Agent Card 统一结构

```js
{
  agentId: 'string',            // 唯一标识（意图解析匹配目标）
  name: 'string',               // 显示名称
  description: 'string',        // 功能描述（喂给 LLM 意图解析器）
  capabilities: ['string'],     // 能力列表
  cliEntry: 'string',           // CLI 入口（相对 workspace 根）
  inputSchema: {...},           // 输入 JSON Schema
  outputSchema: {...},          // 输出 JSON Schema
  status: 'online' | 'offline' | 'design',   // 状态
}
```

### 注册表

| agentId | 名称 | 能力 | CLI 入口 | 触发方式 | 状态 |
|---------|------|------|----------|----------|------|
| `xujie` | Xujie Writer | 小说写作 / 大纲 / 角色 / 世界观 | 无 CLI（人控对话式） | 用户指令触发 | online |
| `lemong` | Lemong Agent | 音乐创作（歌词/谱曲） | `lemong-agent/lemong-agent` | 用户指令触发 | online |
| `erhu` | Erhu（二虎） | 数字人 MV 制作 | `erhu-agent/erhu-agent` | 用户指令触发 | online |
| `zhupu` | Zhupu Agent | 族谱管理 / 角色一致性 | `zhupu-manager-agent/zhupu-manager-agent` | 随小说更新 / 用户指令 | online |

> **触发方式说明**: Xujie / Lemong / Erhu 均为**用户指令触发**，非自动联动。小说更新不会自动触发歌曲/MV 创作。Zhupu 跟随小说更新触发角色同步。
>
> **对外 Agent（不参与内部调度）**:

| agentId | 名称 | 能力 | 对外 A2A 端点 | 说明 |
|---------|------|------|---------------|------|
| `ambassador` | 外交大使 | 自媒体宣传 / AI 社区宣传 / 项目介绍 / 社交关系 | `https://a-o-c.cc.cd:5656/ambassador/a2a/`（规划中） | 面向外网的 Google A2A 兼容接口，独立服务，不进 `agent-card.js` |

### 新增工作 Agent 的标准流程

1. 在 `src/agents/agent-card.js` 的 `AGENT_CARDS` 数组中新增对象（8 个字段完整）
2. 在 `src/adapters/` 下新增 `{agentId}-adapter.js`：
   - **无头 CLI Agent**：导出 `export async function execute(task)`（内部 `bash cliPath(agentId) ...` 调用）
   - **人控对话式 Agent**（如 Xujie）：导出 `execute(task)`（任务落盘）+ `acknowledge(taskId, outcome)`（人工回写）
3. 在 `src/adapters/index.js` 的 `ADAPTERS` 注册表中登记
4. 在 `src/intent/parser.js` 的 `fallbackParse()` 增加关键词兜底
5. 同步更新**本文档**注册表 + `AGENTS.md` 编排链 + `SOUL.md` 可调度清单
6. 运行 `scripts/deploy.sh` 部署

> **人控任务状态机**（S3 起支持）：`running → waiting`（任务落盘，等待人工确认）→ 人工在 WebIDE 完成后，通过
> `POST /admin/tasks/:taskId/acknowledge`（Admin API）或 `POST /internal/task.acknowledge`（内部 A2A）回写
> `success/failed`。落盘文件位于 `data/XujieWriter-data/tasks/`（`pending/` → `done/`）。

---

## 二、Skill 注册表

> Skill = 为本项目提供领域能力/操作流程的扩展包，位于 `.codebuddy/skills/`。
> 本表登记与 Mirage-Studio 运维/开发直接相关的 Skill。

### 服务器运维

| Skill | 路径 | 目标服务器 | 用途 |
|-------|------|-----------|------|
| MirageStudio-ops | `.codebuddy/skills/MirageStudio-ops/` | 腾讯云 4C4G (`182.254.180.26`) | Coordinator + mirage-studio 部署运维（SSH/PM2/Nginx） |
| xplan-smart-ops | `.codebuddy/skills/xplan-smart-ops/` | 阿里云 2C2G (`39.106.176.161`) | xplan-smart 服务运维 |

### Git / 平台

| Skill | 路径 | 用途 |
|-------|------|------|
| git-dual-push | `.codebuddy/skills/git-dual-push/` | 提交并双推（cnb.cool origin + GitHub github） |
| cnb-api / cnb-code-commit / cnb-code-review 等 | `.codebuddy/skills/cnb-*/` | CNB 平台（仓库/Issue/PR/CI） |
| cloudflare 技能族 | `.codebuddy/skills/cloudflare*/` | Cloudflare 平台（Workers/Pages/AI/邮件） |

> 完整 Skill 列表见仓库根 `.codebuddy/CODEBUDDY.md` → 技能 (Skills) 章节。

### Skill 注册约定

- 新增 Skill：放入 `.codebuddy/skills/`，并在 `CODEBUDDY.md` + 本表登记
- Skill 内脚本若需服务器访问，读取 `.codebuddy/.env.codebuddy` 中的连接参数（前缀 `SERVER_*` / `XPLAN_*`）

---

## 三、A2A 协议注册

| 方法 | 方向 | 说明 | 端点 |
|------|------|------|------|
| `agent.list` | → Coordinator | 获取注册 Agent 列表 | `POST /internal/agent.list`（仅 localhost） |
| `agent.card` | → Coordinator | 获取 Agent Card | `POST /internal/agent.card`（仅 localhost） |
| `task.create` | → Coordinator | 创建编排任务 | `POST /internal/task.create`（仅 localhost） |
| `task.status` | ← Coordinator | 查询任务状态 | `POST /internal/task.status`（仅 localhost） |
| `task.execute` | → Coordinator | 执行任务（调度到适配器） | `POST /internal/task.execute`（仅 localhost） |
| `task.acknowledge` | → Coordinator | 人工确认回写（Xujie 人控任务） | `POST /internal/task.acknowledge`（仅 localhost） |
| 对外 A2A | ←→ 外网 | **已取消**（2026-08-12 起 Coordinator 不对外暴露 A2A，由宣传大使承接） | — |

---

## 四、注册信息变更日志

| 日期 | 变更 |
|------|------|
| 2026-08-12 | 取消 Coordinator 对外 A2A（`A2A_EXTERNAL_ENABLED` 默认关闭）；登记外交大使 Agent（对外）；拆分本文件 |
| 2026-08-15 | S3：Xujie 调度接入（选项 A 任务队列 + 人工确认）；注册 `task.execute`/`task.acknowledge`；新增人控状态 `waiting` |
| 2026-08-21 18:00 | 外交大使（Ambassador）定位升级：从"宣传大使"改为"外交大使"，增加社交功能 |
