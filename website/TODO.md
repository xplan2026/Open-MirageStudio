# 幻觉 IP 官方网站 — 开发计划

## 总体目标

构建「幻觉」独立自媒体 IP 的官方网站，聚合小说、音乐、MV、族谱四个内容板块和社区互动功能。

## 阶段划分

### 阶段〇：基础设施

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 0.1 | 确定前端技术栈 | **Astro + Tailwind CSS** — 纯静态 SSG | ✅ |
| 0.2 | 初始化项目脚手架 | `npm create astro@latest`，配置 Content Collections | ⬜ |
| 0.3 | 配置 Nginx | 静态文件 serve，指向 Astro 构建输出 `dist/` | ⬜ |
| 0.4 | 数据层设计 | GitHub 中转：`git push` → `git pull` → Astro 构建时读 `data/` | ✅ |

### 阶段一：内容展示（只读）

| # | 任务 | 说明 | 依赖 |
|---|------|------|------|
| 1.1 | **小说板块** — 列表页 | 卷章目录树、阅读进度 | 0.2 |
| 1.2 | **小说板块** — 章节详情页 | 正文渲染、上下章导航 | 1.1 |
| 1.3 | **音乐板块** — 列表页 | 歌曲列表、风格筛选、播放器组件 | 0.2 |
| 1.4 | **音乐板块** — 歌曲详情页 | 播放器、歌词展示、创作背景、关联 MV | 1.3 |
| 1.5 | **MV 板块** — 列表页 | 视频缩略图墙、视频播放器组件 | 0.2 |
| 1.6 | **MV 板块** — MV 详情页 | 视频播放、作品信息、歌词字幕 | 1.5 |
| 1.7 | **族谱板块** — 列表页 | 家族列表、简介卡片 | 0.2 |
| 1.8 | **族谱板块** — 族谱详情页 | 交互式族谱树（D3.js/OrgChart）、成员详情 | 1.7 |
| 1.9 | **全局导航 & 首页** | 顶部导航栏、IP 介绍首页、板块入口 | 0.2 |

### 阶段二：社区与互动

| # | 任务 | 说明 | 依赖 |
|---|------|------|------|
| 2.1 | **社区板块** — 首页 | 评论墙、讨论话题、读者互动 | 1.x |
| 2.2 | 评论系统 | 章节/歌曲/MV 评论功能（需后端支持或第三方服务） | 2.1 |
| 2.3 | 读者订阅 | 新章节/新歌/新 MV 的通知推送 | 2.1 |

### 阶段三：服务器部署

| # | 任务 | 说明 | 依赖 |
|---|------|------|------|
| 3.1 | 服务器格式化 | 备份并重新配置系统 | — |
| 3.2 | 部署运行时环境 | Node.js / Nginx / PM2 等 | 3.1 |
| 3.3 | 部署前端应用 | 构建产物上传 + Nginx 配置 | 0.2, 3.2 |
| 3.4 | SSL 证书续期 | 配置 Let's Encrypt 自动续期（或复用现有证书） | 3.2 |
| 3.5 | CI/CD 流水线 | GitHub Actions → 自动部署到服务器 | 3.3 |

### 阶段四：优化与扩展

| # | 任务 | 说明 | 依赖 |
|---|------|------|------|
| 4.1 | SEO 优化 | 页面 meta、sitemap、结构化数据 | 1.x |
| 4.2 | 性能优化 | 图片/视频 CDN、懒加载、代码分割 | 1.x |
| 4.3 | 移动端适配 | 响应式设计、移动端播放器优化 | 1.x |
| 4.4 | 数据分析 | 埋点统计（访问量、阅读量、播放量） | 1.x |
| 4.5 | 多语言支持 | 中/英双语（可选） | 1.x |

## 数据流（已确定）

```
Agent 构建产物 (data/)
    ├── XujieWriter-data/{幻觉}/  ──→  小说板块（Astro Content Collections 读取 .md）
    ├── Lemong-data/{歌名}/       ──→  音乐板块（读取 prompt.json + 歌词.md + .mp3）
    ├── Erhu-data/{作品名}/       ──→  MV 板块（读取 .mp4 + INDEX.md）
    └── Zhupu-data/{家族}/        ──→  族谱板块（读取 族谱.json）

分发链路:
  WebIDE (Agent产出 data/) → git push → GitHub → git pull on server
  → npm run build (Astro 读取 data/ 生成静态站)
  → Nginx serve dist/
```

媒体文件（MP3/MP4/图片）在构建时复制到 `dist/assets/media/`，由 Nginx 直接 serve，利用 `X-Accel-Redirect` 或直接静态托管。

## 服务器信息

| 项目 | 详情 |
|------|------|
| IP | [服务器 IP] |
| 域名 | [已配置域名] |
| 系统 | Alibaba Cloud Linux 8 (x86_64) |
| 配置 | 40G 磁盘, 1.8G 内存 |
| 目标用途 | 「幻觉」IP 官方网站前端服务 |

## 技术决策

### 前端框架：Astro（已确定）

- **类型**: 纯静态 SSG（Static Site Generation）
- **原因**: 服务器仅 1.8G 内存，Astro 构建产出纯静态 HTML，Nginx 直接 serve，零运行时开销
- **交互组件**: Islands 架构 — 族谱树可视化（D3.js）、音频/视频播放器按需加载 JS
- **Markdown 原生支持**: 小说章节天然是 `.md`，Astro Content Collections 直接读取渲染

### 数据流方案：GitHub 中转 + 构建时编译（已确定）

```
WebIDE: Agent 产出 data/ → git push
GitHub: mirage-studio (信任源)
Server: git pull → npm run build (Astro 读取 data/ 生成静态站) → Nginx serve dist/
```

- 不需要 WebIDE 直连服务器，GitHub 作为中间信任源
- 内容更新 = `git pull && npm run build`，可手动或 CI 自动化

### 其他技术选型

- [x] CSS 方案：**Tailwind CSS**（适合内容站点，开发效率高）
- [x] 族谱可视化：**D3.js**（灵活可控，SVG 渲染）
- [ ] 视频托管：阶段一 Nginx 自托管 → 阶段二评估 Cloudflare R2
- [ ] 社区评论：阶段二 — Giscus（GitHub Discussions）或 Cloudflare Workers API
- [ ] CI/CD：GitHub Actions → SSH 到服务器执行 `git pull && npm run build`
