---
title: "把 10 个写作 Skill 封装成 REST API：Xujie Writer 工作台实现复盘"
date: "2026-08-12"
summary: "复盘 ai-fiction-writer 模块恢复、10 个写作 Skill 的 API 化封装、角色/思想笔记/章节修改三大联动面板的设计，以及目录穿越防护与冒烟测试实践。"
tags: ["AI Agent", "REST API", "协作工作台", "写作工具"]
---

# 把 10 个写作 Skill 封装成 REST API：Xujie Writer 工作台实现复盘

## 背景：一个"地基"模块的丢失与恢复

Xujie Writer 是整个 Mirage-Studio 的内容基石——长篇连载小说《幻觉》的创作引擎。它的核心能力来自一个独立的写作工具链 `ai-fiction-writer`，包含角色管理、大纲、章节、思想笔记等 10 个可复用 Skill。

问题来了：工作区里这个模块**只剩壳**——Skill 脚本丢失，只留下目录结构和数据。而从 Git 历史也无法恢复（拆分分支时未保留）。

恢复策略选择了最直接的路径：**clone 上游仓库**（`github.com/xplan2026/ai-fiction-writer`），把 Skill 脚本重新落位到 `data/XujieWriter-data/幻觉/.novel` 数据目录对应的模块里。这一步验证了一个重要原则：**构建产物模块必须独立成仓**，否则一次分支拆分就可能让内容引擎失联。

## 架构：Skill 从"CLI 脚本"到"REST API"

Skill 原本是 CLI 形式——在终端里逐个调用，不适合做图形化工作台。本次改造的核心理念：

> **Skill 是能力单元，API 是能力的标准化出口。** 前端只认 REST 接口，不关心能力背后是脚本、库还是 LLM 调用。

后端新增 `xujie-skills.js` 路由（挂在 `/admin/xujie` 下，JWT 保护），把 10 个 Skill 映射为 15+ 个 REST 端点：

| 能力域 | 端点 | 说明 |
|--------|------|------|
| 角色管理 | `GET/POST /characters` | 角色列表 / 新建角色 |
| | `GET /characters/:name` | 单角色详情 |
| | `GET /characters/:name/timeline` | 角色时间线（出场 → 成长 → 结局） |
| 大纲 | `GET /outline` | 卷章大纲 |
| 章节 | `GET /chapters` | 章节列表 |
| | `GET /chapters/:file` | 单章正文 |
| 思想笔记 | `GET/POST /notes`、`DELETE /notes/:id` | 笔记 CRUD + 标签 |
| 基准 | `GET /benchmarks` | 写作基准（风格 / 格式规范） |
| 世界观 | `GET /worldbuilding` | 世界观与规则体系 |
| 跟踪 | `GET /tracking` | 章节 / 角色 / 设定一致性跟踪 |
| 反馈 | `GET/POST /feedback`、`PATCH /feedback/:id/status` | 修改意见收集与状态流转 |
| 影响分析 | `GET /impact?q=` | 改动一处，牵动哪些章节 / 角色 |
| 质量 | `GET /quality` | 整体质量评估 |
| 元信息 | `GET /skills` | 已注册 Skill 清单（供前端动态渲染） |

### 越界拦截：`..%2F` 的坑

角色与章节端点都接收文件名参数（`:name` / `:file`）。第一版拦截器用 `path.normalize` 做了路径解析校验，但冒烟测试发现 **URL 编码绕过**：攻击者传入 `..%2F..%2F.secret`，Express 解码后 `:name` 变成 `../.secret`，绕过前缀白名单。

修复方案：**解码发生在参数提取之前**，对 `req.params` 统一先 `decodeURIComponent` 再做规范化与边界校验，任何解析结果越出 `DATA_ROOT` 一律 400 拒绝。

## 前端：三面板联动设计

前端新增 `api.xujie` 对象与 20+ 个 react-query hooks（`useCharacters` / `useCharacter` / `useNotes` / `useImpact` …），mutation 成功后自动 `invalidateQueries` 失效缓存。页面 `AgentXujie.jsx` 用 Tabs 组织三个联动面板：

### 1. CharacterPanel — 角色素材管理

- 左侧角色列表，右侧编辑表单（角色档案：性格、动机、关系）
- 每个角色附带**时间线**视图：出场章节 → 成长节点 → 结局
- **联动分析**：改动某角色设定时，调用 `/impact` 列出受影响的章节与笔记，提示"这条改动会牵动 3 章正文"

### 2. NotesPanel — 思想笔记

灵感碎片的结构化管理：CRUD + 标签系统 + **演化追踪**（同一条思路从「萌芽」到「定稿」的版本痕迹）。笔记是写作的第二大脑，标签让它在需要时能被迅速召回。

### 3. ChapterPanel — 章节修改闭环

这是最核心的面板，把修改意见做成一个**闭环工作流**：

```
录入修改意见 → 关联目标章节 → 执行修改 → 蝴蝶效应分析（/impact）
→ 确认影响范围 → 同步更新角色 / 笔记 / 大纲 → 落盘
```

修改任何一章，系统都会回答"这个改动会波及哪些角色设定、哪些后续章节伏笔"，把长篇创作最怕的"改一处、崩全书"问题显式化。

## 质量保障：21/21 冒烟测试

新增 `scripts/smoke-xujie.js`，覆盖全部端点：

- **正向用例**：角色 CRUD、笔记增删、章节读取、impact 查询、反馈流转
- **反向用例**：未认证 401、路径越界 400、URL 编码绕过 400、不存在资源 404

一个有意思的插曲：测试刚开始是 20/21——"失败"的那条恰恰是**越界拦截按预期返回 400**，而测试期望值写成了 200。**断言写错远比功能写错隐蔽**，修复期望值后 21/21 全绿。这提醒我们：安全用例的"失败"往往就是它正确工作的证据。

## 踩坑与经验

1. **模块必须独立成仓**：`ai-fiction-writer` 的丢失证明，能力模块与数据目录分离还不够，模块本身要能独立拉取、独立升级。
2. **URL 解码是安全边界的一部分**：所有参数在解析路径前先 `decodeURIComponent`，拒绝 `..` 前缀越界。
3. **改动即风险**：长篇创作里"改一章"是全局操作，impact 分析把它变成了可控操作——这是工具链的价值观输出。
4. **测试的期望值要跟着语义走**：安全拦截返回 400 不是 bug，是特性。

## 下一步

三个面板还只是起点。规划中的增强包括：多本书并行管理（当前仅《幻觉》）、章节修改的 diff 预览、以及把"蝴蝶效应分析"从规则匹配升级为 LLM 语义级影响评估——让创作工具的智能从"能查"走向"会想"。
