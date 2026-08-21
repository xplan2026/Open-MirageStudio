---
Updated: 2026-08-20 10:30
生命周期: 永久保存
保存位置: zhupu-manager-agent/GLOSSARY.md
---

# GLOSSARY — 自定义名词速查

> 本文件在 Zhupu Manager Agent 会话启动时加载。集中定义自定义名词，避免在各文件中重复解释。
>
> **信任层级**: `docs/standard/custom_nouns.md`（项目级权威源，完整定义） > 本文件（会话速查表）
>
> **设计原则**: 见 `docs/standard/token-optimization-glossary.md`

---

## 身份与角色

| 名词 | 定义 |
|------|------|
| **Zhupu**（族谱管家） | 小说《幻觉》角色家族关系管理 Agent，角色关系中枢 |
| **双重角色** | ① 小说辅助（主功能）② 通用族谱管理（附加能力） |
| **Xujie Writer**（许杰） | 《幻觉》小说创作 Agent（上游），角色设定权威方 |
| **大副** (First Mate) | Coordinator-Agent 代号，统一调度员 |
| **舰队长** (Mifon / 米丰) | 项目所有者 / 上级，GitHub: xplan2026 |

## 核心概念

| 名词 | 定义 |
|------|------|
| 辈分 (generation) | 从 1 开始递增，可自定义辈分名称（太祖/高祖/…） |
| 族谱.json | 每家族一份 JSON，成员以 `father`/`mother` 链式关联 |
| 关系树 (tree) | 父子、夫妻、兄弟姐妹关系可视化 |
| 根状关系图 | `graph/跨家族联姻图.json` — 主根·米家直系 + 4侧根 + 根须层 + 横向闭合回路 |
| 米家直系长房 | 主根：米福云→米南生→米丰→米欢/米杰，四代纵轴 |
| 侧根 (LR01~LR04) | 四大家族附着主根不同深度：李家G1 / 杨家G2 / 何家G3 / 于家G2.5 |
| 根须层 | 随世代增加，侧根自然发散为远支（杨柯·北京、官二·云南等） |
| 根须化规律 | 判断"XX 对米家主线是否重要"（0层核心 → 4层+背景） |

## 协作契约（与 Xujie 双翼）

| 名词 | 定义 |
|------|------|
| 角色录入 | Xujie 创作新角色 → Zhupu 同步更新族谱 |
| 关系查询 | Xujie 写作时查询角色关系链 |
| 一致性校验 | 检测辈分冲突/时间线不一致 → 反馈 Xujie |
| `角色档案.md` | Xujie 侧权威（性格/背景/成长弧），不一致时以 Xujie 为准 |
| `族谱.json` + `graph/` | Zhupu 侧权威（关系数据） |

## 数据目录

| 路径 | 说明 |
|------|------|
| `data/Zhupu-data/INDEX.md` | 家族索引 |
| `data/Zhupu-data/graph/` | ★ 跨家族关系子图（长期记忆，确定性内容最大化 LLM 缓存命中） |
| `data/Zhupu-data/{家族名}/族谱.json` | 族谱完整数据 |
| `data/Zhupu-data/{家族名}/家训.md` | 家训/家族文化 |
| `data/Zhupu-data/{家族名}/export/` | 导出文件目录 |
| `zhupu-manager-agent/knowledge-base/族谱数据结构规范.md` | 数据结构权威定义 |

## CLI 命令

| 命令 | 功能 |
|------|------|
| `init <家族名>` | 初始化新家族 |
| `add <家族名>` | 添加成员（`--name` / `--generation` / `--interactive` 等） |
| `query <家族名>` | 查询成员/关系（`--name` / `--generation` / `--list`） |
| `tree <家族名>` | 关系树可视化 |
| `export <家族名>` | 导出 JSON / Markdown / 文本 |
| `stats <家族名>` | 统计分析 |
| `motto <家族名>` | 编辑家训 |
| `emblem <家族名>` | 设置族徽 |

## 调度

| 名词 | 定义 |
|------|------|
| 触发方式 | 跟随小说更新 / 用户指令触发（微信 / Admin-UI / CLI → Coordinator） |
| 技术栈 | Node.js + JSON 结构化存储 |

---

> **维护规则**: 新增/修改自定义名词时，先更新 `docs/standard/custom_nouns.md`（权威源），再同步更新本表。
