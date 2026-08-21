# Lemong Agent 迁移说明

> **迁移日期**: 2026-07-15  
> **状态**: ✅ 已完成

## 概述

`lemong-music` Subagent 已成功升级为独立的 **Lemong Agent**。

## 变更摘要

### 目录变更

| 变更类型 | 旧路径 | 新路径 |
|----------|--------|--------|
| Agent 定义 | `captain/subagents/lemong-music/SKILL.md` | `lemong-agent/AGENTS.md` |
| 记忆/状态 | (无) | `lemong-agent/MEMORY.md` |
| CLI 入口 | `/workspace/lemong-music` | `lemong-agent/lemong-agent` |
| 核心脚本 | `captain/subagents/lemong-music/scripts/` | `lemong-agent/scripts/` |
| 风格模板 | `captain/subagents/lemong-music/templates/` | `lemong-agent/templates/` |
| 歌手配置 | `captain/subagents/lemong-music/singer/` | `lemong-agent/singer/` |
| 知识库 | (无) | `lemong-agent/knowledge-base/` |

### 新增内容

| 文件 | 说明 |
|------|------|
| `AGENTS.md` | Agent 主定义文件，含身份描述、6 阶段工作流、Agent 间协作协议、输入/输出契约 |
| `MEMORY.md` | Agent 持久化记忆，含创作历史、配置状态、关键决策记录 |
| `lemong-agent/lemong-agent` | 新的 CLI 统一入口（Bash），替代旧的 `/workspace/lemong-music` |

### 保留不变

| 项目 | 说明 |
|------|------|
| 输出目录 | `data/Lemong-data/{歌名}/` — 每首歌独立子目录，含三件套 |
| API 配置 | `DEEPSEEK_API_KEY`、`ACE_API_KEY` 从 Agent 专属 `lemong-agent/.env` 加载 |
| 脚本逻辑 | 三个核心脚本（generate-prompt.js / generate-lyrics.js / generate-music.js）核心逻辑不变 |

### 脚本适配细节

- 脚本使用相对路径（`../templates`、`../singer`），在新目录结构下自动兼容
- `generate-music.js` 的 `WORKSPACE_ROOT` 通过 `path.resolve(__dirname, '../../../..')` 计算，新位置下仍正确指向 `/workspace`
- CLI 入口路径变量已从 `$SCRIPT_DIR/captain/subagents/lemong-music` 改为 `$SCRIPT_DIR/lemong-agent`

## 使用变更

### 旧方式（Subagent）

```bash
./lemong-music prompt "中文古风" /tmp/answers.json
./lemong-music generate --style "流行" --lyrics "..." --title "歌名"
```

### 新方式（Agent）

```bash
./lemong-agent/lemong-agent prompt "中文古风" /tmp/answers.json
./lemong-agent/lemong-agent generate --style "流行" --lyrics "..." --title "歌名"
```

## 回滚方案

如需回滚到旧的 Subagent 形态：

1. 旧目录 `captain/subagents/lemong-music/` 完整保留
2. 旧 CLI `/workspace/lemong-music` 仍可使用
3. 输出目录 `data/Lemong-data/` 为新结构，旧 `data/AI-Music/` 中的历史数据可保留

## 验证清单

- [x] 所有 JS 文件通过 `node -c` 语法检查
- [x] CLI Bash 脚本通过 `bash -n` 语法检查
- [x] 脚本路径引用在新目录结构下正确
- [x] 输出目录路径兼容
- [x] CODEBUDDY.md 已更新
- [x] 旧目录已标记 DEPRECATED
- [ ] E2E 测试（Phase 5）
