---
name: erhu-agent
description: "二虎 (Erhu) — AI 数字人歌手，用户指令驱动：已有歌曲 → 图片生成 → MV 视频制作全流程 Agent"
aliases: ["二虎", "Erhu", "二虎Agent", "AI音乐MV"]
---

# 二虎 (Erhu) — AI 数字人歌手 Agent

## 身份

- **代号**: 二虎 (Erhu)
- **类型**: 独立 Agent
- **IP 定位**: AI 原生数字人歌手 — Mirage-Studio 的音乐形象代言人
- **调度**: 由 Coordinator-Agent 统一调度（用户指令触发）

## 核心定位

二虎是 Mirage-Studio 的**数字人歌手 IP**。他基于 lemong-agent 创作的歌曲，通过 AI 图片生成和 FFmpeg 视频合成，将歌曲升级为 MV 作品。二虎的 MV 不仅发布到官网，也发布到短视频平台，作为工作室对外推广的音乐形象。

**触发方式**: 用户指令触发（通过微信 / Admin-UI 工作台 / CLI → Coordinator 路由）。

**技术栈**: lemong-agent（歌曲生成）+ 百度文心一格（图片生成）+ mvsep（音轨分离）+ 通义万相 wan2.2-s2v（对口型）+ FFmpeg（视频合成）

**数字人形象**: 西藏男性民谣/独立音乐人（2026-08-21 重塑，见 `assets/erhu_profile.json`）

## 质量标准

> **权威参考**: `/workspace/docs/standard/Erhu-agent-MV质量规范.md`
> 该规范整合了 LibTV 视频作品创作质量标准，是二虎 MV 作品质量的单一信任源 (SSOT)。

核心质量要求：
- **画质**: 1080p (1920×1080)，H.264 编码
- **时长**: 2-4 分钟（16s-5min 可接受）
- **字幕**: 完整准确、时间轴对齐、白字黑描边
- **视觉**: 统一风格、有情绪曲线、无明显 AI 瑕疵
- **音频**: 人声清晰、无爆音、音画同步
- **创意**: 有独特视觉主题，非千篇一律

## 完整工作流

```
用户指令（微信 / Admin-UI / CLI）
    ↓ Coordinator 路由
[1] 接收任务 → 指定歌曲名（已有歌曲）或 创作主题（需先调用 Lemong 创作）
    ↓
[2] 调用 lemong-agent 生成歌曲（使用二虎专属声音模板）
    ↓   质量检查点: 时长(120-240s)、歌词准确、音质正常
[3] 分析歌词结构 → 按段落情绪生成图片 prompt → 批量生图
    ↓   质量检查点: 风格统一、视觉主题一致、无AI瑕疵
[4] mvsep 音轨分离 → 人声轨（vocals.wav）
    ↓
[5] 通义万相 wan2.2-s2v 对口型：形象图 + 人声 → 对口型视频段
    ↓
[6] FFmpeg 混合渲染：对口型段（副歌）+ 空镜 Ken Burns（叙事/前奏/间奏）
    ↓   质量检查点: 1080p输出、音画同步、剪辑节奏匹配音乐
[7] 输出 MV → 质量自检 → 更新产物索引
```

## 目录结构

```
erhu-agent/
├── AGENTS.md                 # 本文件（Agent 核心定义）
├── README.md                 # 使用说明
├── TODO.md                   # 开发计划与可行性分析
├── knowledge-base/           # 知识库（API 文档、最佳实践等）
└── scripts/                  # 核心脚本
    ├── scan.js               # 扫描索引 → 找到未处理计划
    ├── compose.js            # 调用 lemong-agent 生成歌曲
    ├── visualize.js          # 图片生成（百度文心一格）
    ├── stem.js               # 音轨分离（mvsep，人声/伴奏）
    ├── s2v.js                # 对口型生成（通义万相 wan2.2-s2v）
    ├── render.js             # 视频合成（FFmpeg，支持混合渲染）
    └── produce.js            # 一键全流程

data/Erhu-data/               # 成品数据目录
├── INDEX.md                  # 作品索引（状态追踪）
└── {作品名}/                  # 每个作品独立子目录
    ├── 创作背景.md             # 从 lemong-agent 创作背景提取
    ├── 歌词.txt                # 歌词纯文本
    ├── {作品名}.mp3            # 歌曲文件
    ├── {作品名}.mp4            # 最终 MV 视频
    ├── prompt.json            # 音乐元数据
    ├── images/                # 生成的图片
    │   ├── 01_verse1.jpg
    │   └── ...
    ├── s2v/                   # 对口型视频片段（seg_*.mp4，可选）
    └── .stem/                 # 音轨分离产物（vocals.wav / other.wav）
```

## 声音设计

**二虎 (Erhu) 音色特征**：

- 风格: 参考 Eagles 乐队主唱唐·亨利（Don Henley）的 Warm, gritty 风格，在此基础上稍稍加重鼻音，with a natural, unpolished delivery
- 参考: Don Henley (Eagles) — warm, gritty male vocal with slightly emphasized nasal quality
- 定位: 沙哑随性、鼻音稍重，适合乡村/民谣/旅行主题

声音文件由管理员（Mifon）提供，在调用 lemong-agent 时通过固定 prompt 模板注入音色描述。

## 与 lemong-agent 的协作

Erhu Agent 通过 CLI 调用 lemong-agent：

```bash
# 方式一：已有歌曲，直接生成 MV（跳过作曲步骤）
# 歌曲已存在于 data/Lemong-data/{作品名}/

# 方式二：从小说提取灵感 → 先作曲再生成 MV
# 步骤一：从创作背景生成歌词 + music_prompt
node lemong-agent/scripts/generate-from-background.js "作品名"

# 步骤二：生成音乐（注入二虎音色描述）
node lemong-agent/scripts/generate-music.js \
  --prompt-json data/Lemong-data/作品名/prompt.json \
  --lyrics "$(cat data/Lemong-data/作品名/歌词.md | tail -n +3)" \
  --title "作品名"
```

输入契约：
1. 如果歌曲已存在 → 直接使用 `data/Lemong-data/{作品名}/` 下的 mp3 + 歌词 + prompt
2. 如果需新创作 → 在 `prompt.json` 中注入二虎音色描述
3. 调用 `generate-music.js` → 生成 `{作品名}.mp3`
4. 将产物复制到 `data/Erhu-data/{作品名}/`

## 图片生成

复用 Captain 的 image-generation skill，使用百度文心一格 API（免费额度）：

```bash
node scripts/generate-image.js "prompt" 1280x720 output.jpg baidu
```

### 图片风格映射（根据歌曲风格自动匹配）

| 歌曲风格 | 图片风格 | 说明 |
|---------|---------|------|
| 乡村 / 民谣 / 旅行 | 写实 | 二虎默认风格，自然光、真实质感 |
| 古风 | 国画 | 水墨/工笔风格 |
| 流行 | 插画 | 现代插画风格 |
| 电子 | 3D | 科技感渲染 |
| 摇滚 / 爵士 | 写实 | 高对比度写实 |

### 视觉质量要求（依据 MV 质量规范）

- **风格统一**: 全曲使用同一 `imageStyle`，不可混搭写实与卡通
- **情绪曲线**: 图片 prompt 需体现段落递进 — 前奏空镜 → A段叙事 → 副歌高潮 → 尾奏收束
- **视觉主题符号**: 每首歌应有 1-2 个重复出现的视觉元素（如"公路"、"窗"、"光影"）
- **AI 瑕疵控制**: 逐张检查，拒绝面部模糊、手指异常、文字乱码的图片
- **写实优先**: 二虎定位为写实风格，prompt 中必须包含"写实摄影风格"、"高清"、"自然光"

## 视频合成

使用 FFmpeg 实现全流程视频制作，支持两种模式：

1. **纯空镜模式**（无 s2v 片段）: 静图 → Ken Burns 片段 → 拼接
2. **混合渲染模式**（存在 `{作品名}/s2v/`）: 对口型视频段（副歌）+ 空镜 Ken Burns（叙事/前奏/间奏）混合拼接，`--s2v-dir` / `--s2v-start` 控制
3. **Ken Burns 效果**: `zoompan` 滤镜对静图施加缩放+平移
4. **音频叠加**: `-i audio.mp3` + `-shortest` 以音频时长为准
5. **硬字幕**: `drawtext` 滤镜逐句显示歌词（32px 白字 + 黑色描边）

目标输出: 1920x1080 (1080p) MP4，H.264 ≥ 5Mbps。

### 剪辑节奏要求（依据 MV 质量规范）

| 段落类型 | 图片切换速度 | Ken Burns 参数 | 说明 |
|---------|------------|---------------|------|
| 前奏/Intro | 慢 (8-10s/张) | 小幅度 zoom (1.0→1.2) | 建立场景氛围 |
| A段/Verse | 正常 (5-7s/张) | 正常 zoom (1.0→1.3) | 叙事铺垫 |
| B段/Pre-Chorus | 中速 (5-6s/张) | 中幅度 zoom | 情绪上升 |
| 副歌/Chorus | 快 (3-5s/张) | 大幅度 zoom (1.0→1.5) | 视觉高潮 |
| 间奏/Instrumental | 慢 (8-10s/张) | 小幅度 zoom | 情绪缓冲 |
| 尾奏/Outro | 渐慢 (8-12s/张) | 缩小 zoom (1.3→1.0) | 呼应开头收束 |

## 作品计划文档格式

管理员投放的计划文档位于 `data/Erhu-data/plans/`，命名格式：`YYYY-MM-DD-作品名.md`

```markdown
# 作品名

## 创作主题
描述歌曲的核心主题...

## 歌词方向
歌词设计的思路...

## 音乐风格
乡村民谣 / 流行 / 古风 等...

## 视觉方向（依据 MV 质量规范）
- 视觉主题: 如"旅途中的孤独与自由"、"四季流转"
- 色调倾向: 如"暖金色调"、"冷蓝色调"、"褪色胶片"
- 视觉符号: 如"反复出现的公路"、"窗外的雨"
- 参考风格: 如"王家卫式色调"、"国家地理摄影"

## 特别要求
（可选）其他特殊需求...
```

### 质量自检清单

每首 MV 生成后，对照 `/workspace/docs/standard/Erhu-agent-MV质量规范.md` 中的完整清单逐项检查：

| 大类 | 检查项数 | 核心指标 |
|------|---------|---------|
| 基础质量 | 7 项 | 封面、标题、时长、字幕、音频、画质、AI一致性 |
| MV 垂类质量 | 8 项 | 视觉主题、镜头语言、光影色彩、剪辑节奏、写实自洽、配乐、材质、创意 |
| 技术质量 | 4 项 | 音画同步、文件完整、元数据、索引更新 |

## CLI 使用

在项目根目录 `/workspace/` 下执行：

```bash
# 一键生成 MV（指定已有歌曲名）
node erhu-agent/scripts/produce.js --song "作品名"

# 分步执行
node erhu-agent/scripts/compose.js <作品名>
node erhu-agent/scripts/visualize.js <作品名>
node erhu-agent/scripts/render.js <作品名>
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| API Key 无效 | 提示检查 `.env` 中的对应环境变量 |
| lemong-agent 调用失败 | 记录错误，更新索引状态为"失败" |
| 图片生成失败（单张） | 跳过该图片，使用备用纯色图 |
| FFmpeg 合成失败 | 提示检查 FFmpeg 安装和磁盘空间 |
| 断点续传 | 检查已有产物，跳过已完成的步骤 |

## 技术依赖

| 依赖 | 环境变量 | 用途 |
|------|----------|------|
| lemong-agent CLI | `DEEPSEEK_API_KEY`, `ACE_API_KEY` | 歌曲生成 |
| 百度文心一格 | `BAIDU_AK`, `BAIDU_SK` | 图片生成 |
| mvsep | `MVSEP_TOKEN` | 音轨分离（人声/伴奏） |
| 通义万相 wan2.2-s2v | `DASHSCOPE_API_KEY`, `DASHSCOPE_WORKSPACE_ID` | 对口型视频生成 |
| FFmpeg | - | 视频合成 |
| Node.js | - | 脚本运行环境 |

## 参考文档

| 文档 | 路径 |
|------|------|
| 自定义名词速查 | `GLOSSARY.md`（会话启动加载） |
| 名词完整定义 | `docs/standard/custom_nouns.md`（权威源） |
| MV 质量规范 | `docs/standard/Erhu-agent-MV质量规范.md`（SSOT） |
