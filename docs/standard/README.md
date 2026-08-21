---
Updated: 2026-08-21 17:00
生命周期: 永久保存
保存位置: docs/standard/README.md
---

# 标准文档目录

> **目录性质**: 单一信任源 (Single Source of Truth, SSOT)
> **创建日期**: 2026-08-21
> **维护者**: yuleague
> **适用范围**: Mirage-Studio 项目的所有标准规范、配置和方案文档

---

## 一、目录定位

`/workspace/docs/standard/` 目录是本项目所有标准规范文档的**单一信源 (SSOT)**，用于存放项目开发过程中的权威性文档。

**设计思想**：
- 将开发过程中用于本项目的单一信源文档集中管理
- 作为运维决策、架构设计、实施标准的权威参考
- 避免文档分散导致的信息冲突

---

## 二、文档元数据规则

本目录下的文档均需遵循**文档元数据规范**（详见 [文档元数据规范.md](./文档元数据规范.md)），以时间戳作为文档对比可信度的依据。

### 2.1 必须包含的元数据

所有 `.md` 文档必须在文件顶部包含以下三项：

```yaml
---
Updated: 2026-08-21 17:00
生命周期: 永久保存
保存位置: docs/standard/文档名.md
---
```

### 2.2 时间戳更新规则

| 场景 | 是否更新时间戳 |
|------|:---:|
| 实质性修改（新增/删改/修正） | ✅ 必须 |
| 格式调整（排版/缩进） | 🟡 建议 |
| 生命周期变更 | ✅ 必须 |

### 2.3 冲突解决机制

当其它文档或参考数据与单一信源冲突时：
1. 对比 `Updated` 时间戳，确认哪份文档更新
2. 检查是否为预期变更（如方案升级）
3. 触发人工审核，确认以哪份为准
4. 更新错误的一方，并同步更新时间戳

---

## 三、单一信源原则

### 3.1 信任层级

```
docs/standard/ (最高信任度)
  └─ 数据实际实现（代码、数据目录）
```

### 3.2 冲突解决流程

```
发现冲突
  ↓
对比时间戳（哪个更新）
  ↓
人工审核（确认以哪个为准）
  ↓
修正错误一方
  ↓
更新时间戳
```

---

## 四、文档分类与清单

### 4.1 文档分类

| 分类 | 文档数量 | 说明 |
|------|---------|------|
| **架构与定位** | 1 | 项目顶层架构、模块关系 |
| **规范与标准** | 3 | 文档元数据、Token 优化术语表、数据存储规范 |
| **Agent 设计** | 6 | Coordinator/Xujie/Zhupu/Lemong/Erhu/Ambassador 设计 |
| **设计方案** | 5 | Admin-UI、博客、微信编排、二维码认证、前端选型 |
| **技术参考** | 3 | ACE-Step1.5（合并了参考资料）、模型配置、自定义名词 |

### 4.2 文档清单

#### 架构与定位
- [mirage-studio-positioning.md](./mirage-studio-positioning.md) — 工作室定位与架构（SSOT）

#### 规范与标准
- [文档元数据规范.md](./文档元数据规范.md) — 所有 `.md` 文档的元数据规则（SSOT）
- [token-optimization-glossary.md](./token-optimization-glossary.md) — Token 优化术语表设计规范
- [data-storage-design.md](./data-storage-design.md) — 单一信任源与数据目录结构规范

#### Agent 设计
- [coordinator-agent-design.md](./coordinator-agent-design.md) — Coordinator-Agent 统一调度层架构与API设计
- [xujie-writer-agent-design.md](./xujie-writer-agent-design.md) — Xujie Writer Agent 镜头切换创作模式与写作流程
- [zhupu-manager-agent-design.md](./zhupu-manager-agent-design.md) — Zhupu Manager Agent 族谱结构与关系图设计
- [lemong-agent-design.md](./lemong-agent-design.md) — Lemong Agent 音乐生成与Prompt工程
- [Erhu-agent设计文档.md](./Erhu-agent设计文档.md) — Erhu Agent 技术方案
- [Erhu-agent-MV质量规范.md](./Erhu-agent-MV质量规范.md) — MV 制作质量标准
- [ambassador-agent-design.md](./ambassador-agent-design.md) — Ambassador Agent 对外形象与A2A协议设计

#### 设计方案
- [admin-ui-workbench-design.md](./admin-ui-workbench-design.md) — Admin-UI 工作台 v2.0 升级方案
- [博客模块设计与实施.md](./博客模块设计与实施.md) — 博客模块设计方案
- [微信编排Agent技术方案.md](./微信编排Agent技术方案.md) — 微信集成技术方案
- [二维码认证方案.md](./二维码认证方案.md) — 二维码认证机制设计
- [前端技术选型.md](./前端技术选型.md) — 前端技术栈选型方案

#### 技术参考
- [ACE-Step1.5指南.md](./ACE-Step1.5指南.md) — ACE Step1.5 API 使用指南（合并了参考资料）
- [模型配置说明.md](./模型配置说明.md) — 各模型供应商配置说明
- [custom_nouns.md](./custom_nouns.md) — 项目自定义名词表

---

## 五、文档管理规范

### 5.1 创建规则

开发过程中新增一级模块（如新的 Agent、子系统、平台集成），需在 `/workspace/docs/standard/` 目录下创建对应的设计方案文档，并随着开发进度及时更新。

**实施保障**：
- 新增模块设计文档需包含完整的元数据（Updated / 生命周期 / 保存位置）
- 设计文档需明确模块定位、技术栈、架构方案、实施路线
- 开发过程中及时更新文档，保持与代码同步
- 模块上线后将文档生命周期更新为「永久保存」

### 5.2 修改规则

| 操作 | 要求 |
|------|------|
| **新增内容** | 更新 `Updated` 时间戳 |
| **修改内容** | 更新 `Updated` 时间戳 |
| **修正错误** | 更新 `Updated` 时间戳 |
| **格式调整** | 建议同步更新 `Updated` 时间戳 |

### 5.3 废弃规则

- 标记生命周期为 `临时` 或在文档顶部添加 `> 状态：已废弃` 注释
- 在 README.md 文档清单中移除
- 保留文档但不作为权威参考

---

## 六、常见问题

### 6.1 如何判断哪个文档是最新版本？

答：对比 `Updated` 时间戳，时间戳较新者为最新版本。

### 6.2 其他文档与标准文档冲突怎么办？

答：
1. 对比时间戳，确认哪份文档更新
2. 检查是否为预期变更（如方案升级）
3. 触发人工审核，确认以哪份为准
4. 更新错误的一方，并同步更新时间戳

### 6.3 时间戳精度为什么是分钟？

答：
- 精确到分钟足以区分大部分文档版本
- 避免秒级精度带来的不必要的时间戳更新（如格式调整）
- 保持实用性与可维护性的平衡

### 6.4 什么时候应该创建新文档？

答：
- 涉及新的主题/领域，且已有文档无法覆盖
- 需要长期保存的设计方案或规范
- 作为其他文档的权威依据

### 6.5 什么时候应该更新现有文档？

答：
- 文档内容有实质性修改（新增、删改、修正）
- 文档生命周期变更（如 `开发阶段` → `永久保存`）
- 发现错误并修正

---

## 七、变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-21 17:00 | 清理文档：合并 ACE 文档、更新状态、新增文档管理规范（创建规则）、修复重复章节 | yuleague |
| 2026-08-21 16:30 | 新增 6 个 Agent 设计文档（Coordinator/Xujie/Zhupu/Lemong/Ambassador/Data Storage），更新文档清单与分类统计 | yuleague |
| 2026-08-21 14:45 | 创建 README：目录定位、元数据规则、单一信源原则、文档清单、管理规范 | yuleague |
