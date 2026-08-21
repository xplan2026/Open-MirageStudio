# Erhu Agent (二虎) — 可行性分析与 TODO

> 创建日期: 2026-07-16
> 定位: AI 原生音乐数字人歌手，自动生成歌曲 → 图片 → MV 视频的全流程 Agent

---

## 一、可行性分析

### 1.1 技术栈可行性

| 环节 | 技术方案 | 依赖 | 可行性 |
|------|---------|------|--------|
| 歌曲生成 | 调用 lemong-agent CLI | DeepSeek + ACE API（已有） | ✅ 成熟 |
| 图片生成 | 百度文心一格 ERNIE-ViLG | `BAIDU_AK` / `BAIDU_SK`（需配置） | ✅ 成熟，有免费额度 |
| 图片→视频 | **待定**（见 1.2） | 待调研 | 🟡 需选型 |
| 歌词字幕 | FFmpeg drawtext 硬字幕 | FFmpeg（系统自带） | ✅ 成熟 |
| 视频拼接 | FFmpeg concat | FFmpeg | ✅ 成熟 |

> ⚠️ **图片生成方案修正**：原方案为智谱 CogView-3-Flash，但该模型**不是免费模型**（约 0.10 元/张）。根据"智谱 API 选用免费模型"的约定，改回 **百度文心一格 ERNIE-ViLG**（有免费额度），Captain 已有完整封装。

### 1.2 图片→视频方案选型

根据"免费优先 / 仅用国产模型"原则，以下方案供选择：

| 方案 | 技术 | 成本 | 质量 | 推荐度 |
|------|------|------|------|--------|
| **A: FFmpeg Ken Burns** | 静图 + 缩放/平移动画 | **免费** | 中等 | ⭐⭐⭐⭐⭐ 首推 |
| B: 可灵 (Kling) | AI 视频生成 | 有免费额度 | 高 | ⭐⭐⭐ 后续升级 |
| C: 通义万相视频生成 | AI 视频生成 | 有免费额度 | 中高 | ⭐⭐⭐ 后续升级 |
| D: 智谱 CogVideoX | AI 视频生成 | 约 0.5-1 元/秒 | 高 | ⭐⭐ 付费 |

**推荐 MVP 阶段用方案 A**（FFmpeg Ken Burns 效果）：
- 零成本
- 效果可控（缩放 + 平移 + 淡入淡出 + 转场）
- 歌词 MV 场景完全够用
- 后续可升级到 AI 视频生成

**Ken Burns 效果说明**：对静态图片施加缓慢的缩放（zoom in/out）和平移（pan），配合淡入淡出转场，是最经典的纪录片/MV 风格。FFmpeg 原生支持 `zoompan` 滤镜。

### 1.3 声音方案

- 声音文件由管理员（Mifon）提供，不在此项目中生成
- 音色参考：从 `/workspace/data/Lemong-data/归航109/prompt.json` 提取
  - 风格: "Warm, gritty, nasal male vocal with a natural, unpolished delivery"
  - 参考: "Eagles-like warm, gritty, nasal male voice"
  - 代号: "二虎 (Erhu)"

**ACE 声音方案选择**：
1. **方案 A: 每次在 prompt 中描述音色**（当前 lemong-agent 做法）— 简单但一致性差
2. **方案 B: ACE 音色克隆** — 如果 ACE 支持 voice clone API，可上传参考音频生成固定音色 ID
3. **方案 C: 固定 prompt 模板** — 在 music_prompt 中固定 vocal_style 描述，追求最大一致性

> ⚠️ 需确认 ACE 是否支持 voice clone / speaker ID 功能。当前先使用方案 C（固定音色 prompt 模板）。

### 1.4 歌曲时长与图片/视频数量估算

以 180 秒（3 分钟）歌曲为例：

| 歌曲结构 | 时长(约) | 图片数(6-8张/小节) | 每张展示时长 |
|----------|---------|-------------------|-------------|
| Verse 1 | 40s | 6 | ~6.7s |
| Chorus 1 | 30s | 6 | ~5s |
| Verse 2 | 40s | 6 | ~6.7s |
| Chorus 2 | 30s | 6 | ~5s |
| Bridge | 20s | 6 | ~3.3s |
| Outro | 20s | 4 | ~5s |
| **合计** | **180s** | **~34 张** | — |

> 使用百度文心一格（免费额度），34 张约 0 元/首。

### 1.5 与 lemong-agent 的交互方式

**方案：CLI 调用**

Erhu Agent 通过 `node lemong-agent/scripts/generate-from-background.js` 或 `./lemong-agent/lemong-agent fb <song-name>` 调用 lemong-agent。

输入契约：
```
data/Erhu-data/{作品名}/创作背景.md  →  Erhu Agent 调用 lemong-agent →  data/Lemong-data/{作品名}/
```

输出结果：
- `{作品名}.mp3` — 歌曲文件
- `歌词.md` — 歌词
- `prompt.json` — 音乐元数据（含 duration、结构等）

### 1.6 整体架构

```
管理员(Mifon)
  │
  ├─ 不定期放入作品计划: data/Erhu-data/plans/{YYYY-MM-DD}-{作品名}.md
  │
  ▼
Erhu Agent (erhu-agent/)
  │
  ├─ [1] 读取索引 → 找到未处理计划
  ├─ [2] 调用 lemong-agent 生成歌曲
  ├─ [3] 分析歌词结构 → 生成图片 prompt → 调用百度文心一格生图
  ├─ [4] FFmpeg 静图→Ken Burns 视频片段
  ├─ [5] FFmpeg 拼接视频 + 音频 + 硬字幕
  └─ [6] 输出: data/Erhu-data/{作品名}/{作品名}.mp4
```

---

## 二、TODO — MVP 全流程打通

### Phase 1: Agent 骨架搭建 ✅

- [x] 1.1 创建 `erhu-agent/` 目录结构
- [x] 1.2 创建 `erhu-agent/AGENTS.md`（Agent 定义与行为规范）
- [x] 1.3 创建 `erhu-agent/erhu-agent` CLI 入口脚本
- [x] 1.4 创建 `data/Erhu-data/` 数据目录
- [x] 1.5 创建作品计划库 `data/Erhu-data/plans/` + 索引文件 `INDEX.md`

### Phase 2: 作品计划管理 ✅

- [x] 2.1 设计作品计划 `.md` 模板格式（见 AGENTS.md）
- [x] 2.2 实现 `INDEX.md` 索引文件（状态: 未处理 / 处理中 / 已完成 / 失败）
- [x] 2.3 实现 `erhu-agent scan` 命令：扫描未处理计划

### Phase 3: 歌曲生成（调用 lemong-agent） ✅

- [x] 3.1 实现 `erhu-agent compose <作品名>` 命令
- [x] 3.2 从计划文档生成 `创作背景.md` → 放入 `data/Lemong-data/{作品名}/`
- [x] 3.3 调用 lemong-agent 两步流程生成歌曲
- [x] 3.4 将产物（mp3 + 歌词 + prompt.json）复制到 `data/Erhu-data/{作品名}/`
- [x] 3.5 更新索引状态 + 注入二虎音色模板

### Phase 4: 图片生成 ✅

- [x] 4.1 实现 `erhu-agent visualize <作品名>` 命令
- [x] 4.2 分析歌词结构（解析 `[Verse]`/`[Chorus]` 等段落）
- [x] 4.3 为每个小节生成图片 prompt（DeepSeek + 歌词意象 + 音乐风格）
- [x] 4.4 调用百度文心一格 ERNIE-ViLG 批量生图（复用 Captain image-generation skill）
- [x] 4.5 图片保存到 `data/Erhu-data/{作品名}/images/`

### Phase 5: 视频合成 ✅

- [x] 5.1 实现 `erhu-agent render <作品名>` 命令
- [x] 5.2 计算歌曲时长 → 分配每张图片展示时长
- [x] 5.3 FFmpeg Ken Burns 效果：静图 → 缩放/平移视频片段
- [x] 5.4 FFmpeg 拼接所有视频片段
- [x] 5.5 FFmpeg 叠加音频 + 硬字幕（歌词逐句显示）
- [x] 5.6 输出 `data/Erhu-data/{作品名}/{作品名}.mp4`

### Phase 6: 全流程串联 ✅

- [x] 6.1 实现 `erhu-agent produce <作品名>` 一键全流程命令
- [x] 6.2 更新索引状态为"已完成"/"失败"
- [x] 6.3 错误处理与断点续传（步骤间独立，失败后可重试）

### Phase 7: 文档与清理 ✅

- [x] 7.1 更新 `/workspace/.codebuddy/CODEBUDDY.md` 注册 Erhu Agent
- [x] 7.2 创建 `docs/standard/Erhu-agent设计文档.md`
- [ ] 7.3 端到端测试一首完整 MV
- [ ] 7.4 设置脚本可执行权限 `chmod +x erhu-agent/erhu-agent erhu-agent/scripts/*.js`

### Phase 8: 数字人改造（西藏形象 + 音轨分离 + 对口型）🟡

> 详见 `docs/数字人改造计划-2026-08-21.md`（权威计划）

- [x] 8.1 清理音轨分离参考文档（Spleeter/UVR/demucs 已删除）
- [x] 8.2 重塑形象为西藏男性民谣歌手（`assets/erhu_profile.json` + 4 张西藏形象图）
- [ ] 8.3 人工审图（eyes_closed 待生成）
- [x] 8.4 音轨分离脚本 `scripts/stem.js`（mvsep）+ 测试通过
- [x] 8.5 对口型脚本 `scripts/s2v.js`（wan2.2-s2v，≤20s 自动切段拼接）
- [ ] 8.6 对口型端到端测试（**需 `DASHSCOPE_API_KEY` + `DASHSCOPE_WORKSPACE_ID`**）
- [x] 8.7 render.js 混合渲染（对口型段 + 空镜段）
- [x] 8.8 更新 AGENTS.md / GLOSSARY.md / TODO.md

---

## 三、技术决策待确认

| # | 决策点 | 选项 | 建议 |
|---|--------|------|------|
| 1 | 图片→视频方案 | FFmpeg Ken Burns / 可灵 / 通义万相 | **FFmpeg Ken Burns**（MVP，免费） |
| 2 | ACE 声音一致性 | prompt 描述 / voice clone API | 先 prompt 描述，后续探索 voice clone |
| 3 | 歌词字幕格式 | 逐句 / 逐行 / 卡拉OK 高亮 | **逐句显示**（简单有效） |
| 4 | 视频分辨率 | 1080p / 720p | **1080p (1920x1080)** |
| 5 | 图片尺寸 | 1024x1024 / 1280x720 | **1280x720**（16:9，拉伸至 1920x1080 损失可接受） |
| 6 | 是否需要人工审核环节 | 全自动 / 环节间暂停 | MVP 全自动，后续可加 `--review` 模式 |
| 7 | 图片生成 API | 百度文心一格（免费额度）/ 智谱 CogView（付费） | **百度文心一格**（免费优先） |

---

## 四、数据目录结构

```
data/Erhu-data/
├── INDEX.md                          # 作品索引（状态追踪）
├── plans/                            # 作品计划库
│   ├── 2026-07-16-归航109.md          # 管理员放入的计划文档
│   └── 2026-07-20-春天里.md
├── {作品名}/                          # 每个作品独立子目录
│   ├── 创作背景.md                    # 从计划文档提取
│   ├── 歌词.txt                       # 歌词纯文本
│   ├── {作品名}.mp3                   # 歌曲文件
│   ├── {作品名}.mp4                   # 最终 MV 视频
│   ├── prompt.json                   # 音乐元数据
│   └── images/                       # 生成的图片
│       ├── 01_verse1.jpg
│       ├── 02_verse1.jpg
│       ├── ...
│       └── meta.json                 # 图片-段落映射元数据
```
