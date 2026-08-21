---
Updated: 2026-08-21 10:30
生命周期: 永久保存
保存位置: erhu-agent/GLOSSARY.md
---

# GLOSSARY — 自定义名词速查

> 本文件在 Erhu Agent 会话启动时加载。集中定义自定义名词，避免在各文件中重复解释。
>
> **信任层级**: `docs/standard/custom_nouns.md`（项目级权威源，完整定义） > 本文件（会话速查表）
>
> **设计原则**: 见 `docs/standard/token-optimization-glossary.md`

---

## 身份与角色

| 名词 | 定义 |
|------|------|
| **Erhu / 二虎** | AI 数字人歌手 Agent，Mirage-Studio 音乐形象代言人；MV 发布官网 + 短视频平台 |
| **二虎音色** | 沙哑随性、鼻音稍重，Eagles 风（参考 Don Henley），适合乡村/民谣/旅行主题 |
| **Lemong** | AI 音乐创作 Agent（上游），歌曲来源 |
| **大副** (First Mate) | Coordinator-Agent 代号，统一调度员 |
| **舰队长** (Mifon / 米丰) | 项目所有者 / 上级，GitHub: xplan2026，管理员（提供声音文件） |

## 技术栈

| 名词 | 定义 |
|------|------|
| **百度文心一格** | 图片生成 API（免费额度），`BAIDU_AK` / `BAIDU_SK` |
| **mvsep** | 音轨分离 API，`MVSEP_TOKEN`；`stem.js` 分离人声 vocals.wav / 伴奏 other.wav |
| **通义万相 wan2.2-s2v** | 对口型视频生成，`DASHSCOPE_API_KEY` + `DASHSCOPE_WORKSPACE_ID`；`s2v.js` 单段上限 20s，超长自动切段拼接 |
| **FFmpeg** | 视频合成：Ken Burns (zoompan) + concat + 音频叠加 + drawtext 硬字幕 |
| **Ken Burns 效果** | 静图 → 动态视频片段（缩放+平移），参数按段落情绪调整 |
| **混合渲染** | render.js 将对口型段（副歌）+ 空镜 Ken Burns（叙事/前奏/间奏）混合拼接 |
| **1080p 输出** | 1920×1080 MP4，H.264 ≥ 5Mbps 目标 |

## 质量规范

| 名词 | 定义 |
|------|------|
| **MV 质量规范** | `docs/standard/Erhu-agent-MV质量规范.md` — 作品质量单一信任源 (SSOT) |
| 基础质量 (7 项) | 封面、标题、时长、字幕、音频、画质、AI一致性 |
| MV 垂类质量 (8 项) | 视觉主题、镜头语言、光影色彩、剪辑节奏、写实自洽、配乐、材质、创意 |
| 技术质量 (4 项) | 音画同步、文件完整、元数据、索引更新 |
| 视觉主题符号 | 每首歌 1-2 个重复视觉元素（如"公路"、"窗"、"光影"） |

## 图片风格映射

| 歌曲风格 | 图片风格 |
|---------|---------|
| 乡村 / 民谣 / 旅行 | 写实（二虎默认，自然光、真实质感） |
| 古风 | 国画（水墨/工笔） |
| 流行 | 插画（现代插画） |
| 电子 | 3D（科技感渲染） |
| 摇滚 / 爵士 | 写实（高对比度） |

## 数据目录

| 路径 | 说明 |
|------|------|
| `data/Erhu-data/INDEX.md` | 作品索引（状态追踪） |
| `data/Erhu-data/plans/YYYY-MM-DD-{作品名}.md` | 作品计划文档 |
| `data/Erhu-data/{作品名}/` | 每作品独立子目录（mp3 + mp4 + images/，仅保留媒体产物） |
| `data/Erhu-data/{作品名}/s2v/` | 对口型视频片段（seg_*.mp4，可选，供混合渲染） |
| `data/Erhu-data/{作品名}/.stem/` | 音轨分离产物（vocals.wav / other.wav） |
| `data/Lemong-data/{作品名}/` | 歌曲完整构建记录（单一信任源：歌词+背景+prompt+mp3） |

## 工作流

| 阶段 | 脚本 | 核心操作 |
|:---:|------|----------|
| 1 | `scan.js` | 扫描索引 → 找未处理计划 |
| 2 | `compose.js` | 调用 lemong-agent 生成歌曲（注入二虎音色） |
| 3 | `visualize.js` | 按段落情绪生图（百度文心一格） |
| 4 | `stem.js` | mvsep 音轨分离（人声/伴奏） |
| 5 | `s2v.js` | 通义万相对口型（形象图 + 人声 → 视频段） |
| 6 | `render.js` | FFmpeg 视频合成（混合渲染：对口型 + Ken Burns + 字幕） |
| 7 | `produce.js` | 一键全流程 |

## 调度

| 名词 | 定义 |
|------|------|
| 触发方式 | **用户指令触发**（微信 / Admin-UI 工作台 / CLI → Coordinator 路由），非自动联动 |
| 输入契约 | 已有歌曲直接用 `data/Lemong-data/{作品名}/`；新创作经 generate-music.js 后复制产物 |

---

> **维护规则**: 新增/修改自定义名词时，先更新 `docs/standard/custom_nouns.md`（权威源），再同步更新本表。
