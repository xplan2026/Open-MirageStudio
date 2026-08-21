---
Updated: 2026-08-21 16:15
生命周期: 永久保存
保存位置: docs/standard/data-storage-design.md
---

# Data Storage Design — 单一信任源与数据目录结构规范

> **创建日期**: 2026-08-21
> **版本**: v1.0
> **定位**: 全局索引 — 向 LLM 提供数据目录上下文

---

## 一、设计原则

### 1.1 单一信任源 (Single Source of Truth, SSOT)

| 原则 | 说明 |
|------|------|
| **职责划分** | `Lemong-data/` 是歌曲的完整构建记录，`Erhu-data/` 只保留最终媒体产物 |
| **不重复存储** | 歌词/创作背景/prompt 等文本数据不重复存储，统一由 `Lemong-data/` 管理 |
| **文件系统优先** | 各 Agent 的构建数据保存在文件系统中（`data/` 目录），而非数据库 |
| **按 Agent 分类** | 每个构建数据目录以 Agent 名称命名（如 `Lemong-data`、`Erhu-data`） |

### 1.2 全局索引

`data/LLMs.txt` 是全局索引文件，向 LLM 提供数据目录上下文：

```
data/
├── LLMs.txt                    # 全局索引 — 向 LLM 提供数据目录上下文
│
├── Lemong-data/                # Lemong Agent 歌曲构建产物（单一信任源）
│   └── {歌名}/                 # 每首歌一个独立子目录
│       ├── {歌名}.mp3          # 生成的歌曲音频
│       ├── 歌词.md             # 歌词（含结构标注）
│       ├── 创作背景.md          # 原始创作描述（歌曲立意、歌词设计、音乐方向）
│       └── prompt.json         # 音乐生成的 prompt 参数
│
├── Erhu-data/                  # Erhu Agent MV 构建产物
│   ├── INDEX.md                # 作品索引
│   ├── plans/                  # 作品计划文档
│   │   └── {日期}-{歌名}.md
│   └── {歌名}/                 # 每个作品独立子目录（仅保留媒体文件）
│       ├── {歌名}.mp3          # 从 Lemong-data 提取/复制的歌曲音频
│       ├── {歌名}.mp4          # 完整 MV 视频
│       └── images/             # MV 图片素材
│
├── Zhupu-data/                # Zhupu Manager Agent 族谱构建产物
│   ├── INDEX.md               # 家族索引
│   ├── graph/                 # ★ 关系子图（Agent 长期记忆，优化 LLM 缓存）
│   │   ├── 跨家族联姻图.json   #   根状关系图（主根·米家 + 4侧根 + 根须层）
│   │   └── 跨家族联姻图.md     #   ASCII根状总览 + Mermaid + 根须化规律
│   └── {家族名}/               # 每个家族独立子目录
│       ├── 族谱.json           # 族谱完整数据
│       ├── 家训.md             # 家训/家族文化
│       └── export/            # 导出文件目录
│
└── XujieWriter-data/           # Xujie Writer Agent 写作构建产物
    └── {书名}/                 # 每本书一个独立子目录
        ├── 大纲.md             # 卷章大纲、细纲
        ├── 世界观设定.md        # 世界观、规则体系
        ├── .novel/             # 创作工作区（镜头切换模式）
        │   ├── characters/
        │   │   ├── 姻亲/       #   ★ 各家族谱内人物档案
        │   │   └── 社会关系/   #   ★ 家族谱外重要角色档案（按模板）
        │   ├── chapters/参考/   #   v1 旧稿（已转参考，非正文）
        │   └── ...
        └── 章节/               # 各章节正文
```

---

## 二、数据目录详解

### 2.1 Lemong-data（歌曲构建产物）

#### 目录结构

```
Lemong-data/
├── INDEX.md                # 歌曲索引
└── {歌名}/                 # 每首歌一个独立子目录
    ├── {歌名}.mp3          # 生成的歌曲音频
    ├── 歌词.md             # 歌词（含结构标注）
    ├── 创作背景.md          # 原始创作描述
    └── prompt.json         # 音乐生成的 prompt 参数
```

#### 字段定义

| 文件 | 必填 | 说明 |
|------|------|------|
| `{歌名}.mp3` | ✓ | 生成的歌曲音频文件 |
| `歌词.md` | ✓ | 歌词文本，含结构标注（情绪/韵脚） |
| `创作背景.md` | ✓ | 创作背景描述（立意/来源/音乐方向） |
| `prompt.json` | ✓ | ACE Step1.5 API 的完整 prompt 参数 |

#### 歌词.md 格式

```markdown
# 歌名

## 创作背景

（从小说提取或用户提供）

## 歌词

[情绪:叙事]
第一段歌词 [韵脚A]

[情绪:悲伤]
第二段歌词 [韵脚B]

[情绪:高亢]
副歌部分 [韵脚A]
```

---

### 2.2 Erhu-data（MV 构建产物）

#### 目录结构

```
Erhu-data/
├── INDEX.md                # 作品索引
├── plans/                  # 作品计划文档
│   └── {日期}-{歌名}.md
└── {歌名}/                 # 每个作品独立子目录（仅保留媒体文件）
    ├── {歌名}.mp3          # 从 Lemong-data 提取/复制的歌曲音频
    ├── {歌名}.mp4          # 完整 MV 视频
    └── images/             # MV 图片素材
```

#### 字段定义

| 文件 | 必填 | 说明 |
|------|------|------|
| `{歌名}.mp3` | ✓ | 从 Lemong-data 提取/复制的歌曲音频 |
| `{歌名}.mp4` | ✓ | 完整 MV 视频文件 |
| `images/` | ✗ | MV 图片素材（可选） |

> **重要**: `Erhu-data/` 只保留**最终媒体产物**（mp3 + mp4 + images），不含文本元数据。歌词/创作背景/prompt 等文本数据不重复存储，统一由 `Lemong-data/` 管理。

---

### 2.3 Zhupu-data（族谱构建产物）

#### 目录结构

```
Zhupu-data/
├── INDEX.md               # 家族索引
├── graph/                 # 关系子图（长期记忆文件）
│   ├── 跨家族联姻图.json   # 机器可读的根状关系图
│   └── 跨家族联姻图.md     # ASCII根状总览 + Mermaid + 根须化规律
└── {家族名}/              # 每个家族独立子目录
    ├── 族谱.json           # 族谱完整数据
    ├── 家训.md             # 家训/家族文化
    └── export/            # 导出文件目录
```

#### 字段定义

| 文件 | 必填 | 说明 |
|------|------|------|
| `族谱.json` | ✓ | 族谱完整数据（JSON 结构化） |
| `家训.md` | ✗ | 家训/家族文化 |
| `跨家族联姻图.json` | ✓ | 机器可读的根状关系图 |
| `跨家族联姻图.md` | ✓ | ASCII根状总览 + Mermaid + 根须化规律 |

#### 族谱.json 结构

```json
{
  "familyName": "米家",
  "origin": "四川潼南",
  "generations": 4,
  "members": [
    {
      "id": "G1-MFY",
      "name": "米福云",
      "gender": "男",
      "birthYear": 1914,
      "deathYear": 2009,
      "generation": 1,
      "isMainLine": true,
      "spouse": [
        {
          "name": "徐氏",
          "status": "separated"
        },
        {
          "name": "李维贞",
          "marriageYear": 1950,
          "family": "李家"
        }
      ],
      "children": ["G2-MNS", "G2-MNH", "G2-MNH-2", "G2-MNF", "G2-MNZ"]
    }
  ]
}
```

---

### 2.4 XujieWriter-data（写作构建产物）

#### 目录结构

```
XujieWriter-data/
└── {书名}/                 # 每本书一个独立子目录
    ├── 大纲.md             # 卷章大纲、细纲
    ├── 世界观设定.md        # 世界观、规则体系
    ├── .novel/             # 创作工作区（镜头切换模式）
    │   ├── characters/
    │   │   ├── 姻亲/       # 各家族谱内人物档案
    │   │   └── 社会关系/   # 家族谱外重要角色档案（按模板）
    │   ├── chapters/参考/   # v1 旧稿（已转参考，非正文）
    │   └── ...
    └── 章节/               # 各章节正文
```

#### 字段定义

| 文件 | 必填 | 说明 |
|------|------|------|
| `大纲.md` | ✓ | 卷章大纲、细纲 |
| `世界观设定.md` | ✗ | 世界观、规则体系 |
| `characters/姻亲/` | ✗ | 各家族谱内人物档案 |
| `characters/社会关系/` | ✗ | 家族谱外重要角色档案（按模板） |
| `章节/` | ✓ | 各章节正文 |

---

## 三、数据流转

### 3.1 创作链路

```
小说创作 (Xujie Writer)
    ↓
族谱同步 (Zhupu Manager)
    ↓
歌曲创作 (Lemong)
    ↓
MV 制作 (Erhu)
```

### 3.2 数据流向

| 阶段 | 数据来源 | 数据流向 |
|------|---------|---------|
| 小说创作 | — | `XujieWriter-data/幻觉/` |
| 族谱同步 | 小说章节 | `Zhupu-data/{家族名}/族谱.json` |
| 歌曲创作 | 小说章节 / 自由创作 | `Lemong-data/{歌名}/` |
| MV 制作 | `Lemong-data/{歌名}/` | `Erhu-data/{歌名}/` |

### 3.3 数据依赖

```
Erhu-data/{歌名}/
    ↓ (依赖)
Lemong-data/{歌名}/
    ↓ (依赖)
XujieWriter-data/幻觉/
```

---

## 四、索引文件设计

### 4.1 INDEX.md 文件

每个数据目录都有一个 `INDEX.md` 索引文件，用于快速定位数据。

| 数据目录 | INDEX.md 内容 |
|---------|-------------|
| `Lemong-data/` | 歌曲索引（歌名 / 风格 / BPM / 来源 / 状态） |
| `Erhu-data/` | 作品索引（歌名 / 风格 / 状态） |
| `Zhupu-data/` | 家族索引（家族名 / 人数 / 代数 / 简介） |
| `XujieWriter-data/` | 作品索引（书名 / 进度 / 卷数 / 主角） |

### 4.2 LLMs.txt 全局索引

`data/LLMs.txt` 是全局索引文件，向 LLM 提供数据目录上下文：

```text
data/
├── LLMs.txt                    # 全局索引
│
├── Lemong-data/                # 歌曲构建产物
├── Erhu-data/                  # MV 构建产物
├── Zhupu-data/                # 族谱构建产物
└── XujieWriter-data/           # 写作构建产物
```

---

## 五、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-08-21 | 初版，基于项目实际数据结构编写设计文档 |

---

## 参考文档

| 文档 | 路径 |
|------|------|
| 工作室定位与架构 | `docs/standard/mirage-studio-positioning.md` |
| Lemong Agent 设计 | `docs/standard/lemong-agent-design.md` |
| Erhu Agent 设计 | `docs/standard/Erhu-agent设计文档.md` |
| Zhupu Manager Agent 设计 | `docs/standard/zhupu-manager-agent-design.md` |
| Xujie Writer Agent 设计 | `docs/standard/xujie-writer-agent-design.md` |