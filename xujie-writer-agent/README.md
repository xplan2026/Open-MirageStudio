# Xujie Writer Agent ✍️📖

AI 辅助长篇小说写作 Agent。

## 定位

由人掌控创意和决策，Agent 负责管理设定、角色状态、逻辑一致性和写作流程。不做全自动生成，做创作者的工具箱。

## 目录结构

```
xujie-writer-agent/
├── AGENTS.md                      # Agent 定义文件（身份、能力、工作流）
├── README.md                      # 本文件
└── ai-fiction-writer/             # 上游工具仓库（基于 10-Skill 写作工作流）
    ├── README.md                  # 上游仓库说明
    ├── 纯净版skill/               # 10 个独立 Skill 模块
    └── LICENSE
```

## 核心 Skill 模块

基于 [ai-fiction-writer](https://github.com/Wooooooooood/ai-fiction-writer) 的 10 个 Skill：

| # | Skill | 功能 |
|---|-------|------|
| 1 | NOVEL-ANALYZE | 扫榜与拆文 |
| 2 | NOVEL-OUTLINE | 大纲编排 |
| 3 | NOVEL-CHARACTER | 角色档案 |
| 4 | NOVEL-KNOWLEDGE | 知识库管理 |
| 5 | NOVEL-WORLDBUILDING | 世界构建 |
| 6 | NOVEL-LOGIC | 逻辑预防 |
| 7 | NOVEL-PROGRESS | 进度管理 |
| 8 | NOVEL-WRITING | 写作核心 |
| 9 | NOVEL-HUMANIZER | 去 AI 味质检 |
| 10 | NOVEL-REVIEW | 多视角审稿 |

## 构建数据

构建产物保存在 `data/XujieWriter-data/`，每本书一个独立子目录：

```
data/XujieWriter-data/
└── {书名}/
    ├── 大纲.md
    ├── 角色档案.md
    ├── 世界观设定.md
    └── 章节/
        ├── 第1章.md
        └── ...
```

## 快速开始

```bash
cd xujie-writer-agent/ai-fiction-writer
# 参考上游 README 和「写作工作流」文档初始化
```

## 路径设计：两层目录的协作关系

ai-fiction-writer 上游仓库的所有 Skill 使用**两层目录结构**，约定在工作目录内创建：

```
工作目录/
├── .novel/              ← 项目元数据（设定、大纲、角色、进度、逻辑等）
│   ├── outline/         ← 大纲与细纲
│   ├── characters/      ← 角色档案
│   ├── knowledge/       ← 知识库
│   ├── worldbuilding/   ← 世界观设定
│   ├── tracking/        ← 伏笔、时间线、逻辑矩阵等追踪文件
│   ├── progress/        ← 进度管理与章节切片
│   └── logic/           ← 场景微逻辑卡、段落检查
│
└── chapters/            ← 正文章节
    └── vol{N}-{卷名}/
        └── ch{NN}-{标题}.md
```

而 Xujie Writer Agent 的 `data/XujieWriter-data/` 是**全局构建数据存档目录**：

```
data/XujieWriter-data/
└── {书名}/
    ├── 大纲.md
    ├── 角色档案.md
    ├── 世界观设定.md
    └── 章节/
        └── 第N章.md
```

### 两者关系：无冲突

| 维度 | `.novel/` + `chapters/` | `data/XujieWriter-data/` |
|------|------------------------|--------------------------|
| 定位 | 创作工作区（类似 `.git/`） | 构建产物归档 |
| 作用域 | 随项目走，每个写作项目一个 | 跨项目汇总 |
| 生命周期 | 创作中持续读写 | 阶段性/完成时归档 |

**工作流**：在某个目录初始化写作项目后，`.novel/` 和 `chapters/` 出现在工作目录下。创作完成或阶段性归档时，从工作目录提取内容存入 `data/XujieWriter-data/{书名}/`。两者是不同层次的概念，互不冲突。

### 辅助脚本路径

`scripts/` 目录下有两个 Python 脚本：

| 脚本 | 功能 | 输出路径 |
|------|------|----------|
| `generate_logic_matrix.py` | 扫描正文 `<!-- LOGIC: ... -->` 注释生成逻辑矩阵 | `.novel/tracking/逻辑矩阵.md`（默认） |
| `generate_map.py` | 读取地图 JSON 生成 SVG + HTML 交互地图 | 由 `-o` 参数指定输出目录 |

两个脚本均只依赖 Python 标准库，无第三方依赖。

## 参考资料

- [10 个小说 Skill 集成](../docs/reference/10个小说skill集成.md)
- [ai-fiction-writer 上游仓库](https://github.com/Wooooooooood/ai-fiction-writer)
