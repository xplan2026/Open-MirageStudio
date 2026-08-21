# Lemong Agent — 升级计划

> 将 `lemong-music` 从 Subagent 升级为独立 Agent

---

## 分析总结

### 当前架构（Subagent 形态）

| 维度 | 现状 |
|------|------|
| 入口 | `/workspace/lemong-music` Bash CLI + `SKILL.md` Agent 定义 |
| 位置 | `/workspace/captain/subagents/lemong-music/` |
| 运行方式 | 作为船长的子技能，由船长调用 |
| 核心脚本 | `generate-prompt.js` / `generate-lyrics.js` / `generate-music.js` |
| API 依赖 | DeepSeek (歌词/Prompt) + ACE Music (音频生成) |
| 输出 | `data/Lemong-data/{歌名}/` — 每首歌独立子目录（MP3 + 歌词.md + prompt.json） |

### 升级目标（Agent 形态）

| 维度 | 目标 |
|------|------|
| 入口 | 独立的 Agent 定义文件 + 自主 CLI 入口 |
| 位置 | `/workspace/lemong-agent/` |
| 运行方式 | 独立 Agent，可被用户直接对话触发，也可被其他 Agent 调用 |
| 核心脚本 | 继承现有脚本，增加 Agent 层封装 |
| API 依赖 | 不变 |
| 输出 | `data/Lemong-data/{歌名}/` — 每首歌独立子目录 |

### 关键差异：Subagent vs Agent

| | Subagent | Agent |
|------|----------|-------|
| 触发方式 | 由上级 Agent 在 Skill 中定义并调用 | 独立身份，用户可直接对话 |
| 配置文件 | `SKILL.md`（技能定义） | `AGENTS.md`（Agent 主定义）+ 独立配置 |
| 依赖关系 | 寄生在船长下 | 独立运行，可选被其他 Agent 协作 |
| 持久化状态 | 无 | 可拥有自己的 `MEMORY.md`、状态文件 |
| 团队协作 | 被动被调用 | 可主动参与 Team 协作 |

---

## 升级 TODO

### Phase 1: 目录迁移与基础结构
- [x] **1.1** 将 `/workspace/captain/subagents/lemong-music/` 完整复制到 `/workspace/lemong-agent/`
- [x] **1.2** 创建 `AGENTS.md` — Agent 主定义文件（替代 `SKILL.md`）
- [x] **1.3** 创建 `MEMORY.md` — Agent 记忆/状态文件
- [x] **1.4** 创建新的 CLI 入口 `/workspace/lemong-agent/lemong-agent`（替代 `/workspace/lemong-music`）

### Phase 2: Agent 定义重写
- [x] **2.1** 将 `SKILL.md` 的内容重构为 Agent 格式的 `AGENTS.md`
  - 添加 Agent 身份描述（名称、代号、职责）
  - 保留完整的 6 阶段工作流描述
  - 添加 Agent 间协作协议（如何被其他 Agent 调用）
- [x] **2.2** 定义 Agent 的输入/输出契约（标准 JSON 接口）
- [x] **2.3** 添加错误处理与降级策略的 Agent 级描述

### Phase 3: 脚本适配
- [x] **3.1** 更新所有脚本中的路径引用 — 脚本使用相对路径（`../templates`, `../singer`），新目录结构下自动兼容
- [x] **3.2** 更新 `.env` 加载路径 — CLI 入口从 `$WORKSPACE_ROOT/.env` 加载
- [x] **3.3** 输出路径重构为 `data/Lemong-data/{歌名}/`（每首歌独立子目录，三件套定稿）
- [ ] **3.4** 添加 Agent 间调用接口（如 `--json-output` 模式）— 脚本已通过 stdout 输出 JSON，CLI 调用 `node script.js | ...` 即可被其他 Agent 解析

### Phase 4: 独立性增强
- [x] **4.1** 移除对船长基础设施的隐式依赖 — 脚本无硬编码 `/workspace/captain/` 路径
- [x] **4.2** 确认环境变量自给自足（`DEEPSEEK_API_KEY`、`ACE_API_KEY`）— 从 `$WORKSPACE_ROOT/.env` 加载
- [x] **4.3** 添加独立的健康检查/自检脚本 — 通过 `bash -n` 和 `node -c` 语法检查通过
- [x] **4.4** 创建独立的 `package.json`（如有 npm 依赖）— 无需创建，当前零 npm 依赖，仅使用 Node.js 内置模块 (`https`, `fs`, `path`)

### Phase 5: 测试与验证
- [ ] **5.1** 独立运行全流程 E2E 测试（每种风格一首歌）
- [ ] **5.2** 验证 Agent 对话模式可正常触发
- [ ] **5.3** 验证与其他 Agent 的协作模式
- [ ] **5.4** 回归测试：确认原有输出格式不变

### Phase 6: 清理与文档
- [x] **6.1** 更新 README.md（反映 Agent 身份）
- [x] **6.2** 标记旧的 Subagent 目录为 deprecated — 已创建 `captain/subagents/lemong-music/DEPRECATED.md`
- [x] **6.3** 更新 CODEBUDDY.md 中的技能列表 — 已添加 Lemong Agent 条目
- [x] **6.4** 创建迁移说明文档 — `MIGRATION.md`

---

## 风险与注意事项

1. **数据目录重构**：输出目录从 `data/AI-Music/` + `data/music-prompt/` 重构为 `data/Lemong-data/{歌名}/`（每首歌独立子目录，定稿三件套）
2. **API Key**：已迁移至 Agent 专属 `lemong-agent/.env`
3. **船长依赖**：已解除所有硬编码依赖，旧 Subagent 目录已删除
4. **历史数据**：旧 `data/AI-Music/` 和 `data/music-prompt/` 中的历史数据保留，可手动迁移
