# 博客创作指南

## 定位

博客是 Mirage-Studio 项目的技术实践记录，聚焦开发与维护中的创新思路和实现方案。

与《幻觉》小说**完全独立**，不涉及小说内容。

## 涉及范围

| 方向 | 示例 |
|------|------|
| 项目定位/目标/规划 | 工作室架构演进、Roadmap 更新 |
| Agent 设计目的与方案 | Erhu Agent 设计揭秘、Lemong 提示词工程 |
| 子模块复用价值 | 族谱可视化方案、Markdown → 网站管线 |
| 前沿技术可行性分析 | Voice Clone 接入评估、视频生成方案对比 |
| Agent 协作流程 | 多 Agent 任务编排实践 |

## 文章格式

所有博客文章使用 Markdown 文件，存储在 `data/blog-posts/` 下。

### 文件命名

`{序号}-{slug}.md`，例如：
- `01-mirage-studio-architecture.md`
- `02-erhu-agent-mv-production.md`

序号递增，slug 使用英文小写 + 连字符。

### YAML Frontmatter

每篇文章头部必须有：

```yaml
---
title: "文章标题（中文）"
date: "YYYY-MM-DD"
summary: "一句话摘要，20-50字，吸引读者"
tags: ["标签1", "标签2", "标签3"]
---
```

### 正文

标准 Markdown 格式，支持：
- 标题 (h2-h4)
- 段落、列表、引用、代码块
- 表格、粗体、斜体、链接
- 用 `---` 分隔线

### 文章长度

建议 1500-4000 字，图文并茂。

## 创作流程

### 1. 选题

从以下来源获取灵感：
- `docs/standard/` 中的设计文档
- 各 Agent 的 `AGENTS.md` / `TODO.md`
- 最近完成的功能/修复的 Bug
- 技术调研结果

### 2. 起草

```bash
# 使用脚手架创建新文章
bash coordinator-agent/scripts/new-blog-post.sh "文章标题" "标签1,标签2"
```

这会创建带 YAML frontmatter 模板的空文章。

### 3. 写作

在 `data/blog-posts/{文件名}.md` 中使用 AI 辅助完成写作。

### 4. 发布

```bash
# 1. 构建
cd website && npm run build

# 2. 部署到 4C4G 服务器
rsync -avz --delete -e "ssh -i /workspace/.codebuddy/ssh_keys/xplan_server_key -o StrictHostKeyChecking=no" \
  dist/ ubuntu@182.254.180.26:/opt/mirage-studio/website/dist/

# 3. 重载 Nginx
ssh -i /workspace/.codebuddy/ssh_keys/xplan_server_key ubuntu@182.254.180.26 \
  "sudo systemctl reload nginx"
```

## 索引维护

新文章发布后，需更新 `data/blog-posts/INDEX.md` 中的文章列表。

## 写作原则

1. **面向读者**：即使不了解本项目，也能看懂文章
2. **实用导向**：分享可复用的技术经验，而非单纯的进度汇报
3. **诚实**：记录失败尝试和踩坑经验，它们和成功一样有价值
4. **克制**：不为了发文章而发文章，每篇都要有实质内容

## 入口

- 博客列表：`https://a-o-c.cc.cd/blog/`（或 IP 直连）
- 文章源文件：`data/blog-posts/`
- 脚手架脚本：`coordinator-agent/scripts/new-blog-post.sh`
