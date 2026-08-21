# Mirage-Studio 开发进度总结 & 下一阶段规划

> **日期**: 2026-08-11 | **版本**: remix-v2（已决策）
>
> 基于 `docs/standard/mirage-studio-positioning.md` 定位审视当前进度，生成重构路线。

---

## 关键决策记录

| 决策项 | 结论 | 理由 |
|--------|------|------|
| 优先级 | **Phase 1: Admin-UI 重构** → Phase 2: ai-fiction-writer 恢复 | 工作台是所有交互入口，先打好基础 |
| Admin-UI 技术栈 | **shadcn/ui + Tailwind CSS v4** | 组件丰富、深色模式原生支持、按需引入、响应式友好 |
| ai-fiction-writer | 从上游重新 clone，无法从 Git 历史恢复 | 该目录从未被 commit 至仓库（见 §四 调查结论） |

---

## 一、当前进度概览

### 1.1 已完成（骨架就绪）

| 模块 | 状态 | 说明 |
|------|------|------|
| **Coordinator-Agent** | ✅ 已部署 | Express HTTP 服务，端口 3100，部署于 4C4G 服务器 |
| **Admin-UI 工作台 v0.1** | ✅ 已部署 | 仪表盘 / 任务编排 / Agent 状态 / 日志查看 / 微信二维码登录 |
| **iLink-bot 通信** | ✅ 已集成 | 微信 → Coordinator 通信链路 |
| **Xujie Writer Agent** | 🟡 定义完成 | AGENTS.md 完整定义，`.novel/` 创作数据已有，但 `ai-fiction-writer/` 模块缺失 |
| **Zhupu Manager Agent** | 🟡 定义完成 | AGENTS.md 完整，CLI 入口就绪，族谱数据已有 |
| **Lemong Agent** | 🟡 定义完成 | AGENTS.md 完整，CLI 入口就绪，部分歌曲已产出 |
| **Erhu Agent** | 🟡 定义完成 | AGENTS.md 完整，CLI 入口就绪 |
| **Website 官网** | ✅ 已部署 | Astro 构建，对外展示 |

### 1.2 结论：骨架已搭建，需对各功能模块进行打磨优化

> 整体架构清晰：统一调度层 + 4 个生产 Agent + 官网。但各生产 Agent 功能尚未完全实现，Admin-UI 停留在监控面板阶段，需要升级为真正的**工作台 (Workspace)**。

---

## 二、优先事项一：Admin-UI 工作台重构

### 2.1 问题诊断

| 问题 | 详情 |
|------|------|
| **移动端不适配** | 侧边栏在移动端没有收起/隐藏机制，240px 固定宽度占满小屏 |
| **定位偏差** | 当前是"监控面板"而非"工作台"——缺乏与 Coordinator 的双向交互能力 |
| **无对话交互** | 无法像聊天一样向 Coordinator 发送指令，只能通过 `/tasks` 表单创建任务 |
| **无产物浏览** | 看不到 `data/` 目录下的已生产内容（章节、歌曲、MV、族谱） |
| **无 Agent 专属页** | 所有 Agent 挤在一个状态列表页面，没有独立的工作空间 |

### 2.2 重新定位：工作台 = 我与 Coordinator-Agent 协作的 Workspace

> Admin-UI 不应是"被动的监控面板"，而是**我与 Coordinator 协作的中央工作台**。所有创作指令从这里发起，所有产物在这里被管理和消费。

### 2.3 需要实现的核心能力

#### A. 我与 Coordinator 的对话交互

- [ ] **聊天式交互界面**：类似 ChatGPT 的对话窗口，支持自然语言指令输入
- [ ] **上下文保持**：对话历史持久化，支持多轮交互（如：先问小说进度，再指示续写）
- [ ] **指令路由可视化**：用户指令 → Coordinator 意图解析 → Agent 路由 → 执行反馈，整个链路可视
- [ ] **流式输出**：Agent 执行过程实时推送到聊天窗口

#### B. 产物浏览与查询（`data/` 目录）

- [ ] **文件浏览器**：树形展示 `data/` 目录结构
  - `XujieWriter-data/` → 按书名/章节浏览
  - `Lemong-data/` → 按歌名浏览（歌词、创作背景、MP3 播放）
  - `Erhu-data/` → 按作品浏览（MV 播放、图片预览）
  - `Zhupu-data/` → 族谱索引、角色关系
- [ ] **全文搜索**：跨所有产物内容的搜索
- [ ] **媒体预览**：MP3 内嵌播放、MP4 内嵌播放、图片预览
- [ ] **产物统计**：章节数、字数、歌曲数、MV 数等汇总

#### C. 每个生产 Agent 的独立页面

| Agent | 独立页面需要的核心功能 |
|-------|----------------------|
| **Xujie Writer** | 见第三章详细设计 |
| **Zhupu Manager** | 族谱可视化浏览、角色查询、关系图谱展示、手动添加/修改角色 |
| **Lemong** | 歌曲列表、创作指令输入（基于小说章节灵感）、歌词编辑、prompt 调整、重新生成 |
| **Erhu** | MV 列表、制作指令输入（基于已有歌曲）、素材管理、进度追踪 |

- [ ] 每个 Agent 页面包含：**提示词输入区 + 知识/素材/约束补充区 + 产物列表**
- [ ] Agent 页面与 Coordinator 对话窗口联动（在对话中引用特定 Agent 的产物）

#### D. 移动端适配

- [ ] 侧边栏：移动端默认隐藏，汉堡菜单展开（Sheet 组件）
- [ ] 布局：所有页面改为响应式，卡片/表格在小屏自动堆叠
- [ ] 触摸优化：按钮和交互区域足够大（≥44px）

---

## 三、优先事项二：Xujie Writer Agent 工作台设计

### 3.1 核心认知

> 《幻觉》的创作是一个漫长的过程，其需要的素材是不断累积的。Xujie Writer 的工作台页面必须支持**持续补充素材**的能力。

### 3.2 需要的功能模块

#### A. 素材持续补充

##### 人物素材

- [ ] **新增角色**：姓名、生平、关键桥段、性格标签、说话风格、与其他角色的关系
- [ ] **已有角色故事扩充**：为已有角色添加新的桥段、背景故事、成长节点
- [ ] **角色时间线视图**：按《幻觉》四卷结构展示每个角色在各卷中的年龄、状态、关键事件
- [ ] **与 Zhupu 联动**：新增/修改角色自动同步族谱数据，Zhupu 返回一致性校验结果

##### 思想与立意素材

- [ ] **思想笔记**：记录对小说主题（伪知识传播）的思考片段、灵感火花
- [ ] **立意演化追踪**：记录小说立意从 v1 到当前版本的变化轨迹
- [ ] **经典作品参考**：对标书的关键段落摘录、值得借鉴的手法
- [ ] **主题标签系统**：为不同素材打标签（如"伪知识""家族""时代变迁"），便于检索

#### B. 章节修改与联动

- [ ] **章节修改意见输入**：对已完成章节提出修改意见（角色行为、情节逻辑、文风等）
- [ ] **修改执行追踪**：修改意见的状态（待处理 / 已执行 / 已确认），修改前后对比
- [ ] **联动影响分析**：修改一个角色设定时，自动提示受影响的其他角色、章节、伏笔
- [ ] **蝴蝶效应提示**：基于 `novel-outline` 的蝴蝶效应追踪机制，展示修改的连锁影响

#### C. 角色修改联动

- [ ] **角色修改表单**：修改角色信息时，自动标记哪些内容变更
- [ ] **影响范围报告**：列出受此修改影响的所有章节、其他角色关系、时间线节点
- [ ] **批量确认机制**：修改角色后，逐项确认受影响内容的调整方案
- [ ] **与 Zhupu 双向同步**：角色修改 → Zhupu 族谱更新 → 一致性校验 → 确认

### 3.3 数据来源说明

> `.novel/` 目录下的内容是当前《幻觉》创作的核心数据：
> - `chapters/` — 11 个章节文件
> - `characters/` — 6 个角色档案（米丰、米南生、杨常玉、米旺、妻子何妮 + 人物表）
> - `outline/` — 大纲 v2 + 卷一章规划
> - `worldbuilding/` — 15 个文件（地图 JSON/SVG/HTML + 场景设定）
> - `knowledge/` — 知识库（待填充）
> - `progress/` — 进度管理
> - `tracking/` — 扫榜报告、拆文记录
>
> 这些数据将在 Xujie Writer 的工作台页面中**可浏览、可编辑、可扩充**。

---

## 四、已发现问题：ai-fiction-writer 模块缺失

### 4.1 调查结论

| 调查项 | 结果 |
|--------|------|
| Git 提交历史搜索（`--all --full-history`） | 无任何 `ai-fiction-writer` 相关记录 |
| Git reflog | 无相关痕迹 |
| `.gitmodules` | 不存在（从未作为 submodule） |
| `.gitignore` | 未排除该目录 |
| `git stash list` | 空 |
| Remote branches | 仅 `main`，无其他分支 |

**结论**：`ai-fiction-writer/` 目录**从未被 commit** 到 Git 仓库。它可能存在于之前容器会话的文件系统中，但在容器重建后丢失。用户提到的"个性内容与源仓库不同"同样无法从历史中恢复。

### 4.2 影响分析

| 影响 | 严重程度 |
|------|----------|
| 10 个小说创作 Skill 模块无法在本地执行 | 🔴 高 |
| `.novel/` 目录下的内容原通过 Skill prompt 手动在外部 AI 工具中生成，现在是静态存量 | 🟡 中 |
| 未来小说续写缺乏自动化 Skill 支持 | 🔴 高 |
| 用户提到的"个性内容与源仓库不同"已无法恢复 | 🔴 高 |

### 4.3 恢复方案（Phase 2 执行）

从上游重新 clone，在后续使用中重新积累个性化修改：

```bash
cd xujie-writer-agent/
git clone https://github.com/Wooooooooood/ai-fiction-writer.git
```

> **注意**：不采用 submodule，直接作为普通目录纳入版本控制，便于后续在此之上做个性化修改并纳入 Git 追踪。

---

## 五、技术决策：Admin-UI 重构技术栈

### 5.1 推荐方案：shadcn/ui + Tailwind CSS v4

| 维度 | 选型 | 理由 |
|------|------|------|
| **组件库** | shadcn/ui (Radix primitives) | 组件丰富（聊天、对话框、表格、表单、树、Sheet 侧边栏），代码归你所有 |
| **样式** | Tailwind CSS v4 | 原子化 CSS，响应式断点原生支持，深色模式 `dark:` 前缀开箱即用 |
| **路由** | react-router-dom v7 | 升级现有 v6，支持最新特性 |
| **图标** | lucide-react | shadcn/ui 默认图标库，Tree-shakable |
| **服务端状态** | @tanstack/react-query | API 数据缓存、自动重取、轮询（替代手写 setInterval） |
| **客户端状态** | zustand | 轻量（~1KB），API 简洁，适合聊天历史、UI 状态等 |
| **Markdown 渲染** | react-markdown + rehype-raw | Agent 返回内容大量为 Markdown，需渲染 |
| **媒体播放** | react-player | MP3/MP4 内嵌预览 |
| **D3.js**（保留） | d3 | Zhupu 族谱可视化复用现有实现 |
| **构建工具** | Vite 6 | 升级现有 5.4，Tailwind v4 推荐 |

### 5.2 与现有方案对比

| 维度 | 现有方案（纯 CSS） | 新方案（shadcn/ui + Tailwind） |
|------|-------------------|------------------------------|
| 开发效率 | 低（手写所有组件） | 高（30+ 预置组件） |
| 深色模式 | 硬编码一套 CSS 变量 | `dark:` 前缀 + CSS 变量双主题 |
| 响应式 | 一条 media query（768px） | Tailwind 断点体系（sm/md/lg/xl/2xl） |
| 对话组件 | 需从零实现 | 成熟社区方案，基于 shadcn 组件组装 |
| 文件树 | 需从零实现 | 基于 Accordion / Collapsible 组装 |
| 可维护性 | 465 行全局 CSS 持续膨胀 | 组件级样式隔离 + Tailwind 原子类 |

### 5.3 迁移策略

- **非破坏性迁移**：在 `admin-ui/` 内重新初始化，不直接改现有文件，旧文件逐步替换
- **逐页替换**：Layout/Sidebar → Dashboard → Chat → Agent 专属页（新增） → 旧页面保留或移除
- **API 层保留**：`api.js` 基本不变，只需加 react-query hooks 封装

---

## 六、实施路线图

### Phase 1：Admin-UI 工作台重构 🔵 当前阶段

> **技术栈**：shadcn/ui + Tailwind CSS v4 + react-router-dom v7 + @tanstack/react-query + zustand

| 序号 | 任务 | 说明 |
|------|------|------|
| 1.1 | 项目初始化 | Vite + Tailwind v4 + shadcn/ui 初始化，保留 `api.js` |
| 1.2 | 新 Layout | 移动端 Sheet 侧边栏 + 桌面端固定侧边栏 + 响应式壳 |
| 1.3 | 对话式交互界面 | 聊天窗口组件 + SSE 流式输出 + 历史持久化（zustand + localStorage） |
| 1.4 | 产物浏览器 | FileTree 组件 + `GET /admin/data/tree` API + Markdown/媒体预览 |
| 1.5 | Xujie Writer 专属页 | 角色素材管理 + 思想笔记 + 章节修改工作流（见 §三） |
| 1.6 | Zhupu 专属页 | 族谱可视化（D3.js 复用） + 角色查询 |
| 1.7 | Lemong 专属页 | 歌曲列表 + 创作指令 + prompt 编辑 + MP3 播放 |
| 1.8 | Erhu 专属页 | MV 列表 + 制作指令 + MP4 播放 + 图片预览 |
| 1.9 | Dashboard 重写 | 基于 react-query 的监控面板（替代 setInterval） |

### Phase 2：Xujie Writer 功能实现

| 序号 | 任务 | 说明 |
|------|------|------|
| 2.1 | 恢复 ai-fiction-writer | `git clone` 至 `xujie-writer-agent/ai-fiction-writer/`，纳入 Git |
| 2.2 | 10 Skill → API 封装 | Coordinator 侧为每个 Skill 添加 API endpoint，供工作台调用 |
| 2.3 | 角色素材管理页 | 新增/修改角色、时间线视图、联动提示（对接工作台 1.5） |
| 2.4 | 思想/立意素材页 | 笔记 CRUD + 标签系统 + 演化追踪 |
| 2.5 | 章节修改联动 | 修改意见 → 执行 → 蝴蝶效应分析 → 确认 |

### Phase 3：高级功能

| 序号 | 任务 | 说明 |
|------|------|------|
| 3.1 | 内容编排管线 | 从章节 → 一键发起歌曲 → 完成后一键发起 MV |
| 3.2 | AI 推广交互 | 基于官网内容的对外 AI 问答 |
| 3.3 | 看板增强 | 作品在架数量、渠道数据、生产管线概览 |

---

## 七、待确认事项

1. **ai-fiction-writer 是否立即 clone？** 还是等 Phase 1 进展到 Xujie Writer 专属页（1.5）时再做？
2. **Coordinator 侧 API 扩展**：产物浏览需要 `GET /admin/data/tree` 和 `GET /admin/data/file?path=` 等新接口，是否在 Phase 1 同步开发？
3. **对话历史持久化**：`localStorage`（纯前端）vs 文件存储（Coordinator 后端）vs 暂不持久化？
