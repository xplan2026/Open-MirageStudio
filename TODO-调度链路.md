# TODO — 调度链路打通（光杆司令专项）

> **创建日期**: 2026-08-15
> **来源**: 《2026-08-15-项目设计意图与执行逻辑分析报告》P0-1（光杆司令）
> **目标**: 打通 Coordinator → 4 个生产 Agent 的真实调度链路，使工作台/微信指令能真正驱动生产
> **关联**: `TODO.md` #52（误标完成）、#55-#56、#56a、#56b | `coordinator-agent/TODO.md` Phase 3
> **进度**: S1 ✅ 完成 (2026-08-15) | S2 ✅ 完成 (2026-08-15) | S3 ✅ 完成 (2026-08-15) | S4 ✅ 完成 (2026-08-15) | S4a ✅ 自动部署 CI/CD (2026-08-15) | S5-S6 待办

---

## 一、问题背景（三层断裂）

| 层 | 问题 | 证据 |
|----|------|------|
| ① Agent 未部署 | 服务器 `/opt/mirage-studio/` 仅 coordinator-agent + ambassador-agent，4 个生产 Agent 代码全部缺失（`data/` 数据在、程序不在） | `docs/部署记录/sever_tree_20260815.md` |
| ② 适配器路径错误 | 3 个适配器用相对路径 `node lemong-agent/lemong-agent`，PM2 `cwd` 为 `/opt/mirage-studio/coordinator-agent` → 即使部署也 ENOENT | `src/adapters/*.js` + `ecosystem.config.cjs` |
| ③ executeTask 模拟执行 | 真实适配器调用被注释（`TODO: Phase 3`），任务直接标记"模拟成功" | `src/coordinator.js` L73-85 |

**附带缺失**：`xujie-adapter.js` 从未创建；Xujie 为对话式 Agent（无 CLI 入口），调度模式未定义。

---

## 二、任务分解

### S1 ✅ 打通 executeTask 真实分发（本地）— 2026-08-15 完成

- [x] 实现 `getAdapter(agentId)` 分发：新增 `src/adapters/index.js`（注册表）+ `paths.js`，`coordinator.js` 按 agentId 路由
- [x] 移除模拟执行分支，接入 `adapter.execute(task)`（`src/coordinator.js` `executeTask` 重写）
- [x] 失败路径接入现有错误处理：无适配器 → 优雅 FAILED；适配器返回失败/抛异常 → FAILED + error/stdout/stderr（重试骨架仍沿用 API 层 `retryTask`）
- [x] 验证：`scripts/verify-scheduler.mjs` **10/10 通过** — zhupu 端到端真实执行成功（米家 27 位族谱成员查询）

> **S1 额外修复**：三个适配器原用 `node ${CLI}` 执行，但 CLI 是 bash 脚本（`#!/usr/bin/env bash`）→ 改为 `bash ${CLI}`（`execFile` 数组参数，防注入）；`promisify(execFile)` 失败时丢失 stdout → 改用原生回调包装，保留失败输出。

### S2 ✅ 修复 3 个适配器相对路径 — 2026-08-15 完成

- [x] 新增 `src/adapters/paths.js`：`AGENT_ROOT` 由 `fileURLToPath` 运行时上溯 3 级计算（本地 `/workspace`，服务器 `/opt/mirage-studio`），本地/服务器通用无需维护
- [x] 三个适配器路径收口为 `cliPath(agentId)`，移除三处硬编码；并修正 CLI 参数对齐真实命令（lemong `generate --style/--lyrics/--title`、erhu `produce <作品名>`、zhupu `query <家族名>` 位置参数）
- [x] 本地验证：`verify-scheduler.mjs` 确认 AGENT_ROOT=/workspace、三 CLI 均存在、lemong 参数构造正确（失败原因指向 ACE_API_KEY 而非 ENOENT）

### S3 ✅ xujie-adapter.js 定义 + 调度模式决策 — 2026-08-15 完成

- [x] **决策点**：Xujie 是"人控 AI 辅助写作"对话式 Agent，无 CLI 入口、依赖 IDE 工作流
  - **选定选项 A**：任务队列 + 人工在 WebIDE 确认执行（符合设计理念；选项 B 完全无头化违背人控理念，弃用）
- [x] 按决策实现 `xujie-adapter.js`（选项 A）：
  - `execute(task)` → 任务落盘 `data/XujieWriter-data/tasks/pending/{taskId}.json`（含 intent/input），状态 `waiting`
  - `acknowledge(taskId, {success, result, error})` → 人工完成后回写，落盘文件 `pending/` → `done/`
- [x] 状态机扩展：新增 `TASK_STATES.WAITING`（`running → waiting → success/failed`），Dashboard 统计含 waiting
- [x] 回写通道：Admin API `POST /tasks/:taskId/acknowledge` + 内部 A2A `POST /internal/task.acknowledge`
- [x] AGENTS.md / REGISTER.md 同步 Xujie 调度接口说明（无 CLI，人控对话式；新增 Agent 流程含人控分支）
- [x] 验证：`verify-scheduler.mjs` 新增场景 e（落盘 → WAITING → 回写 SUCCESS），**15/15 通过**

### S4 ✅ 部署 3 个可无头 Agent 到服务器 — 2026-08-15 完成

- [x] 打包上传 `lemong-agent/`、`erhu-agent/`、`zhupu-manager-agent/`（tar 195K，排除 node_modules/.git/output）
- [x] `zhupu-manager-agent`：纯 Node 内置模块，零 npm 依赖，直传即可
- [x] `lemong-agent` / `erhu-agent`：**零 npm 依赖**（仅用 Node 内置模块，无需 `npm install`）；服务器 `.env` 补齐 `ACE_API_KEY`/`ACE_BASE_URL`/`BAIDU_AK`/`BAIDU_SK`（来自本地 `.env`，共 10 个 key）；补装 `ffmpeg 4.4.2`（erhu MV 合成依赖）
- [x] 服务器 `chmod +x` 各 CLI 入口，冒烟测试：zhupu query 米家 → **27 位成员真实返回**；lemong/erhu `help` 正常
- [x] 服务器 git 化（与《部署方式评估报告》联动）：`git init` + `.gitignore`（排除 `.env`/`output/`/`node_modules`）+ 基线提交 **450 文件 / 53M**（无 >2MB 大文件）+ 关联 GitHub remote + `fetch origin main` 连通

### S4a ✅ 服务器自动部署 CI/CD（GitHub Actions + SSH/rsync）— 2026-08-15 完成

> **背景**: S4 部署后服务器 `coordinator-agent/` 仍是旧版（git reset 因 root 权限失败 + 服务器访问 GitHub 认证问题），S5 前置同步受阻。经评估现有 CI/CD（`deploy-website.yml` → Cloudflare Pages）仅覆盖静态网站，**不适用于服务器部署** → 新增服务器自动部署 workflow。

- [x] **CI/CD 适用性评估**：现有 `.github/workflows/deploy-website.yml` 触发路径仅 `website/`+`data/`、目标 Cloudflare Pages 静态托管，无法承载 Express 服务 → 需独立服务器部署流水线
- [x] **GitHub Secrets 配置（5 个）**：`SERVER_SSH_KEY`（复用现有 `xplan_server_key` 私钥）+ `SERVER_HOST`/`SERVER_USER`/`SERVER_PORT`/`SERVER_DEPLOY_PATH`（libsodium sealedbox 加密写入）
- [x] **`.github/workflows/deploy-server.yml`** 🆕：
  - 触发：`coordinator-agent`/`lemong-agent`/`erhu-agent`/`zhupu-manager-agent`/`ambassador-agent` 变更推送 `main` + `workflow_dispatch`
  - 同步：rsync 推送 5 个 agent 目录（排除 `node_modules/`/`.env`/`admin-ui/dist/`/`tasks/`，`--delete` 清理旧版）
  - 数据：`data/` 单独同步（`--size-only` 追加，保护服务器运行产物）
  - 部署：`npm ci` → `pm2 restart coordinator --update-env` → `curl localhost:3100/health` 健康检查
- [x] **首次部署验证**：Actions run #1 **success**（6/6 步骤通过）；服务器 `/health` ok、`acknowledgeTask`/`verify-scheduler.mjs` 新代码就位、PM2 `online`（重启于部署时刻）

> **S5 前置 ✅ 已解决**：S4a 自动部署使服务器 coordinator 同步为最新代码（`paths.js`/`xujie-adapter.js`/`verify-scheduler.mjs` 均已就位），不再需要手动 git pull/scp。

### S5 🟡 端到端验证（服务器）

- [ ] 通过 Admin-UI / REST API 创建 Lemong 任务 → 观察真实执行 → 产物落盘 `data/Lemong-data/`
- [ ] 依次验证 Zhupu（轻量 CRUD，最快）、Erhu（全流程 MV）
- [ ] 失败/重试路径验证（Agent 超时、CLI 报错）
- [ ] 任务状态在 Dashboard 真实流转（pending → running → success/failed）

### S6 🟢 Xujie 调度模式落地

- [ ] 工作台（Admin-UI A4 小说创作页面）对接 Xujie 任务（读取 `tasks/pending/`、展示任务卡、完成后调用 `acknowledge` 回写）
- [ ] 微信指令 → Xujie 人控任务 → 人工确认 → 状态通知闭环

---

## 三、验收标准

1. 从 Admin-UI 创建任一创作任务 → Coordinator 真实调用对应 Agent CLI → 产物写入 `data/`
2. Dashboard 任务状态为真实执行状态（非"模拟成功"）
3. 4 个 Agent 在服务器可寻址（AGENT_ROOT 路径正确），Xujie 至少具备任务落盘/人工确认通道
4. 失败任务进入重试/失败状态，而非静默成功

## 四、依赖与风险

- ~~S3 决策阻塞 S6~~ → S3 已完成（选项 A），S6 仅剩工作台对接
- 服务器 `.env` 需补 Agent 专属 API key，凭据来源：本地 `.env`（不入库）→ **S4 已补齐 ACE/BAIDU，共 10 个 key**
- S4 与"服务器 git 化"联动，避免再次出现无版本管理的部署 → **已 git init + 基线提交 + GitHub remote**
- **S5 阻塞项 ✅ 已解决**：S4a 自动部署 CI/CD 上线后，服务器 coordinator 已自动同步为最新代码（Actions run #1 success），S5 可直接开始端到端验证
- 预估总工期：S1-S4（1 天）→ S5（0.5-1 天，含 coordinator 同步）→ S6（0.5-1 天，工作台对接）

---

## 五、验证结果记录（S1-S4，2026-08-15）

**验证脚本**: `coordinator-agent/scripts/verify-scheduler.mjs`（可复用，S4 服务器部署后同样跑它做冒烟）

| # | 验证项 | 结果 |
|---|--------|------|
| a | AGENT_ROOT 路径解析 = `/workspace`（服务器应为 `/opt/mirage-studio`） | ✅ |
| b | lemong/erhu/zhupu 三个 CLI 入口存在 | ✅ |
| c | **zhupu 端到端真实执行**：createTask → executeTask → bash CLI query 米家 → 返回 27 位族谱成员 → SUCCESS | ✅ |
| d | lemong 参数构造正确：无 ACE_API_KEY 时失败信息指向该变量（证明找到 CLI 且参数对，而非 ENOENT） | ✅ |
| e | **xujie 人控链路**（S3）：落盘 → WAITING → 人工回写 SUCCESS；pending 文件含任务输入、状态流转合法、pending→done 迁移 | ✅ |

> 汇总：**15/15 通过，0 失败**。调度链路本地已真实打通（模拟执行移除；Xujie 人控任务闭环完成）。

**S4 服务器部署验证（2026-08-15，`182.254.180.26`）**:

| # | 验证项 | 结果 |
|---|--------|------|
| a | SSH 连接 + sudo 正常，node v20 / git 2.34 就绪 | ✅ |
| b | 三个 Agent 打包上传解压至 `/opt/mirage-studio/`，chmod +x CLI 入口 | ✅ |
| c | **zhupu 服务器真实执行**：CLI query 米家 → 27 位族谱成员返回（数据目录与本地一致） | ✅ |
| d | lemong / erhu CLI `help` 可执行（冒烟） | ✅ |
| e | `.env` 补齐 4 个 key（ACE_* + BAIDU_*，来自本地，不入库）共 10 个 | ✅ |
| f | `ffmpeg 4.4.2` 安装（erhu MV 合成依赖） | ✅ |
| g | 服务器 git 化：`.gitignore` 排除敏感/产物 → 基线提交 450 文件 / 53M（无大文件）→ GitHub remote + fetch 连通 | ✅ |

**S4 修改清单**（均为服务器操作，本地仓库仅更新本 TODO）:
| 项 | 说明 |
|----|------|
| `/opt/mirage-studio/{lemong,erhu,zhupu-manager}-agent/` | 🆕 三个 Agent 部署（tar 上传，零 npm 依赖） |
| `/opt/mirage-studio/.env` | 追加 `ACE_API_KEY`/`ACE_BASE_URL`/`BAIDU_AK`/`BAIDU_SK` |
| `/opt/mirage-studio/.gitignore` + git 仓库 | 🆕 git 化：基线提交 + GitHub remote |
| `ffmpeg` | 服务器补装 4.4.2（apt） |

**S1-S3 修改清单**:
| 文件 | 改动 |
|------|------|
| `src/adapters/paths.js` | 🆕 AGENT_ROOT + cliPath 收口（S2 核心） |
| `src/adapters/index.js` | 🆕 getAdapter 分发中心（S1 核心）→ 注册 xujie（S3） |
| `src/coordinator.js` | executeTask 移除模拟 → 真实分发（S1）；新增 `acknowledgeTask` 人工回写（S3） |
| `src/adapters/{lemong,erhu,zhupu}-adapter.js` | bash 执行 + AGENT_ROOT 路径 + CLI 参数对齐（S2） |
| `src/adapters/xujie-adapter.js` | 🆕 人控适配器：任务落盘 + acknowledge 回写（S3 核心） |
| `src/state/task-state.js` | 🆕 状态机新增 `WAITING`（running → waiting → success/failed）（S3） |
| `src/api/admin.js` + `src/api/internal.js` | 🆕 `POST /tasks/:taskId/acknowledge` + `POST /internal/task.acknowledge`；Dashboard 统计含 waiting（S3） |
| `scripts/verify-scheduler.mjs` | 🆕 本地验证脚本（S1-S3 场景 15 项断言） |
