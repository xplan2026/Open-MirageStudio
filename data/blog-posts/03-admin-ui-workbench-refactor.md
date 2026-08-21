---
title: "从监控面板到创作工作台：Admin-UI 前端架构重构实战"
date: "2026-08-12"
summary: "分享如何用 shadcn/ui + Tailwind v4 + SSE 流式对话，把一个被动监控面板重构为主动创作工作台，以及迁移中的关键决策与踩坑。"
tags: ["前端架构", "工作台设计", "SSE", "技术栈迁移"]
---

# 从监控面板到创作工作台：Admin-UI 前端架构重构实战

## 为什么要重构？

Mirage-Studio 是一个多 Agent 协作的跨媒介内容生产工作室，Coordinator-Agent 是统一调度层，Admin-UI 是它与人类协作者的唯一图形化入口。

最初版本的 Admin-UI 定位是"监控面板"：看一眼 Agent 状态、查一下日志、手动提交一个任务表单。但随着 4 个生产 Agent（小说 / 歌曲 / MV / 族谱）逐步接入，问题暴露得越来越明显：

| 问题 | 具体表现 |
|------|----------|
| 定位偏差 | 只能"看"，不能"做"——缺乏与 Coordinator 的双向交互 |
| 无对话能力 | 无法用自然语言下发创作指令，只能填任务表单 |
| 无产物入口 | 看不到 `data/` 目录下已生产的章节、歌曲、MV、族谱 |
| 移动端不可用 | 240px 固定侧边栏占满整个小屏，无收起机制 |

结论很明确：**Admin-UI 应该是"我与 Coordinator 协作的中央工作台"**，而不是一个被动展示的仪表盘。所有创作指令从这里发起，所有产物在这里被管理和消费。

## 技术选型：为什么放弃"手写 CSS"

旧版是全手写 CSS（465 行全局样式 + 一条 768px media query），开发一个页面要自己写 Tab、Dialog、Collapsible……成本极高，且深色模式靠硬编码。

这次重构做了完整的选型对比：

| 维度 | 旧方案（纯 CSS） | 新方案（shadcn/ui + Tailwind v4） |
|------|------------------|-----------------------------------|
| 开发效率 | 低，所有组件手写 | 高，30+ 预置组件按需引入 |
| 深色模式 | 硬编码一套变量 | `dark:` 前缀 + CSS 变量双主题 |
| 响应式 | 一条 media query | sm/md/lg/xl/2xl 断点体系 |
| 对话组件 | 从零实现 | 基于 shadcn 组件快速组装 |
| 可维护性 | 全局 CSS 持续膨胀 | 组件级样式隔离 + 原子类 |

最终技术栈：

- **UI**：shadcn/ui（Radix primitives，代码归你所有）+ Tailwind CSS v4（`@import "tailwindcss"`）
- **路由**：react-router v7
- **服务端状态**：@tanstack/react-query（数据缓存、自动重取，替代手写 `setInterval` 轮询）
- **客户端状态**：zustand（~1KB，配合 localStorage 持久化聊天历史）
- **构建**：Vite 6

## 后端支撑：Workbench API

前端重构只是表象，真正的能力升级来自后端新增的 Workbench API。所有路由挂在 `/admin` 下，由 JWT 中间件保护：

```
/admin/data/tree    递归文件树（maxDepth 限制，避免超大目录卡死）
/admin/data/file    文本文件内容读取 / 二进制文件元信息
/admin/data/raw     媒体流（Range 支持，供 <audio>/<video> 内嵌播放）
/admin/data/search  全文搜索（递归扫描，命中行号 + 片段）
/admin/data/stats   产物统计（章节数 / 字数 / 歌曲数 / MV 数 / 族谱成员数）
/admin/chat/stream  SSE 流式对话
```

### 安全设计：路径越界拦截

文件浏览类接口最怕目录穿越。实现了一个统一的 `safeResolve`：

```js
function safeResolve(relPath) {
  const abs = path.resolve(DATA_ROOT, relPath || '.');
  const normalized = path.normalize(abs);
  if (normalized !== DATA_ROOT && !normalized.startsWith(DATA_ROOT + path.sep)) {
    const err = new Error(`路径越界: ${relPath}`);
    err.status = 400;
    throw err;
  }
  return normalized;
}
```

### 媒体流的认证难题

`<audio>` / `<video>` 标签无法设置 `Authorization` 头，如果媒体接口强制 JWT Bearer 认证，浏览器播放器根本带不上 token。

解决方案：JWT 认证中间件同时支持 `Authorization: Bearer <token>` 和 `GET ?token=<token>` 两种方式。媒体 URL 由前端构造时自动拼接 query token，既能鉴权又兼容原生播放器。

### SSE 流式对话

聊天接口用 SSE（Server-Sent Events）实现流式推送，每个阶段都有独立事件类型：

```
event: status   → "正在解析创作意图…"
event: intent   → 意图解析结果（agentId / confidence / params）
event: task     → 任务已创建（id / agentId / 状态）
event: progress → 执行进度（running / success / failed）
event: done     → 最终回复
```

前端用 `EventSource` 无法 POST body，所以这里用的是 fetch + `ReadableStream` 手动解析 SSE 帧。意图解析 → 建任务 → 路由到 Agent → 执行反馈，整条链路在聊天窗口可视化呈现——这正是"工作台"与"面板"的本质区别：**双向、实时、可追踪**。

## 前端架构要点

### 1. 响应式 Layout

桌面端固定侧边栏，移动端收起为 Sheet 抽屉 + 汉堡菜单。Tailwind 断点体系让这个切换几乎零成本：

```jsx
{/* 桌面端 */}
<aside className="hidden lg:flex lg:flex-col ...">
{/* 移动端 */}
<Sheet>
  <SheetTrigger className="lg:hidden"><Menu /></SheetTrigger>
  <SheetContent side="left">...</SheetContent>
</Sheet>
```

### 2. 聊天历史持久化

zustand store 结合 localStorage，多轮对话在刷新后不丢失。store 中保存 messages 数组与一个 `addMessage / clear` 动作，配合 SSE 回调实时追加流式文本。

### 3. react-query 替代手写轮询

旧版 Dashboard 用 `setInterval` 每 N 秒拉一次状态。现在统一用 `useQuery` + `refetchInterval`，组件卸载自动停止轮询，数据变更自动失效重取，代码量减少 60% 以上。

## 踩坑记录

### 坑 1：中文路径 URL 编码

`data/raw` 接口的 path 参数含中文（如 `Erhu-data/DS-渔利/钓江秋_v3.mp3`）。用 `curl` 直接测试时一直 401，排查后发现是 curl 没有对中文做 URL 编码，token 解析错乱。**必须 `encodeURIComponent` 后再拼接**，前端 axios 层也要统一处理。

### 坑 2：章节统计为 0

`/data/stats` 第一版只统计 `chapters/` 顶层文件，结果一直是 0。真实目录结构是 `chapters/volume-01/` 下再按卷分层。改为递归 `walkChapters` 后，统计结果才正确（11 章 / 4.4 万字 / 7 角色）。

### 坑 3：标签闭合错误导致整页白屏

Dashboard 重构时一个 `<CardContent>` 忘记闭合，Vite 构建不报错，但浏览器渲染直接崩溃。**这类 JSX 结构错误必须靠 lint + 构建双重检查**，仅靠构建成功不够。

## 总结

这次重构的收获：

1. **选型要服务于定位**：不是"好看"驱动，而是"从监控面板变成工作台"这个产品定位驱动了全部技术决策。
2. **前后端一体设计**：前端聊天窗口 + 后端 SSE 链路是同一件事的两半，必须一起设计。
3. **安全是文件类 API 的第一优先级**：路径越界拦截必须从第一行代码就写好，而不是事后补。
4. **移动端不是加分项是底线**：创作者可能在手机上查看工作台，Sheet 抽屉方案成本极低、收益极高。

下一步：为 4 个生产 Agent 打造独立工作页面（角色素材管理、歌曲创作指令、MV 制作进度），把"对话 + 产物"的双向闭环打通到每个 Agent。
