---
Updated: 2026-07-13
生命周期: 永久保存
保存位置: docs/standard/token-optimization-glossary.md
---

# 自定义名词 Token 优化设计

> 文档性质：设计文档 + 实施记录
> 创建日期：2026-07-13
> 状态：已实施

---

## 一、问题背景

在 Mirage Studio 各 Agent 的运行环境中，每次会话启动时 LLM 需读取大量上下文文件

**典型场景**：
- `MEMORY.md` 中提到"子归"时，附带完整定义（角色、仓库、职责、层级关系）
- `SOUL.md` 中提到"舰队长"时，又附带完整定义
- `USER.md` 中再次解释"舰队长"和"船长"
- 每次会话启动，LLM 都要消耗 Token 重复"学习"这些名词

## 二、设计目标

1. **定义一次，全局引用** — 自定义名词只在 GLOSSARY.md 中定义，其他文件直接使用名词而不解释
2. **降低启动 Token** — 减少 MEMORY.md、SOUL.md 等文件中的冗余定义
3. **统一标准** — 所有文件对同一名词的理解保持一致
4. **可维护性** — 新增/修改名词时只需更新一处

## 三、核心设计

### 3.1 信任层级

```
docs/standard/custom_nouns.md          ← 项目级权威源（最高信任度）
  └─ captain/GLOSSARY.md               ← Agent 会话启动加载（速查表）
       └─ captain/_knowledge/custom_nouns/  ← 知识库副本（镜像）
```

### 3.2 读取顺序（AGENTS.md Session Startup）

```
1. SOUL.md          — 身份定义
2. USER.md          — 用户信息
3. GLOSSARY.md      — ★ 自定义名词速查（先于 MEMORY.md 加载）
4. memory/YYYY-MM-DD.md  — 近期日志
5. MEMORY.md        — 永久记忆（此时名词已解析完毕）
```

**关键设计点**：GLOSSARY.md 在第 3 步加载，MEMORY.md 在第 5 步加载。MEMORY.md 中使用名词时无需附带定义，因为 LLM 已在第 3 步"学会"了所有名词。

### 3.3 文件分工

| 文件 | 职责 | 是否含名词定义 |
|------|------|:---:|
| `docs/standard/custom_nouns.md` | 权威源，完整定义 | ✅ 唯一权威 |
| `captain/GLOSSARY.md` | 会话速查表，精简格式（表格） | ✅ 精简版 |
| `captain/MEMORY.md` | 永久记忆，直接引用名词 | ❌ 不重复定义 |
| `captain/SOUL.md` | 身份定义 | ❌ 引用 GLOSSARY |
| `captain/USER.md` | 用户信息 | ❌ 引用 GLOSSARY |

## 四、实施记录

### 4.1 创建的文件

| 文件 | 用途 |
|------|------|
| `docs/standard/custom_nouns.md` | 项目级权威名词定义（完整版） |
| `captain/GLOSSARY.md` | Agent 会话启动加载的速查表（表格格式，~444 tokens） |
| `captain/_knowledge/custom_nouns/README.md` | 知识库镜像副本 |
| `docs/standard/token-optimization-glossary.md` | 本文档（设计文档） |

### 4.2 修改的文件

| 文件 | 变更 |
|------|------|
| `captain/AGENTS.md` | Session Startup 新增第 3 步：读取 GLOSSARY.md |
| `captain/MEMORY.md` | 精简 ~26%（142→105 行，~1,200→~850 tokens） |

### 4.3 MEMORY.md 精简明细

**删除的重复内容**（已由 GLOSSARY.md 覆盖）：

- ❌ "身份" 章节 — 船长、舰队长定义
- ❌ 层级关系图（含 6 步逻辑链详述）— GLOSSARY 已有简化版
- ❌ 服务器 IP 地址 — GLOSSARY 已有
- ❌ Control UI、Nginx、Webhook 重复描述
- ❌ 知识库"结构概览"重复段落
- ❌ "内容生产流水线"中与层级关系重复的内容
- ❌ Hermes-Agent 废弃说明

**保留的独有信息**（GLOSSARY 中无）：

- ✅ 子归/子砚名称来源（etymology）
- ✅ 仓库路径、状态细节、职责优先级
- ✅ iLink_bot 账号 ID、配置路径等技术细节
- ✅ 通信注意事项（发图片规则、MIME 类型等）
- ✅ 邮件服务配置（SMTP、脚本路径、密码存储位置）
- ✅ 知识库目录详细结构（57 文档数、排除目录等）

### 4.4 效果评估

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| MEMORY.md 行数 | 142 行 | 105 行 | **-26%** |
| MEMORY.md 估算 tokens | ~1,200 | ~850 | **-29%** |
| GLOSSARY.md tokens | — | ~444 | 新增（一次性） |
| 每次会话净节省 | — | ~350 tokens | 约 **29%** |

> 注：GLOSSARY.md 只加载一次，MEMORY.md 每次主会话都加载。长期看，节省量随会话次数线性增长。

## 五、维护规范

### 新增名词时

1. 在 `docs/standard/custom_nouns.md` 添加完整定义（权威源）
2. 在 `captain/GLOSSARY.md` 添加精简条目（速查表）
3. 在 `captain/_knowledge/custom_nouns/README.md` 同步更新（知识库副本）
4. 其他文件（MEMORY.md、SOUL.md 等）直接使用名词，不重复定义

### 修改名词时

1. 先修改 `docs/standard/custom_nouns.md`
2. 同步更新 `captain/GLOSSARY.md`
3. 同步更新 `captain/_knowledge/custom_nouns/README.md`

### 引用约定

- MEMORY.md 顶部已添加声明：`> 自定义名词定义见 GLOSSARY.md（会话启动时已加载），本文件不再重复解释。`
- 其他文件应添加类似声明

---

## 六、相关文件索引

| 文件 | 路径 |
|------|------|
| 本文档 | `docs/standard/token-optimization-glossary.md` |
| 权威名词定义 | `docs/standard/custom_nouns.md` |
| Agent 速查表 | `captain/GLOSSARY.md` |
| 知识库副本 | `captain/_knowledge/custom_nouns/README.md` |
| 会话启动规则 | `captain/AGENTS.md` (Session Startup) |
| 永久记忆 | `captain/MEMORY.md` |
| Token 节省总览 | `docs/备忘录.md` |
| 实施 TODO | `coust_design/TODO.md` |
| 验证脚本 | `coust_design/verify.sh` |
