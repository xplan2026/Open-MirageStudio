---
Updated: 2026-07-16
生命周期: 永久保存
保存位置: docs/standard/Erhu-agent设计文档.md
---

# Erhu Agent (二虎) — 设计文档

> 创建日期: 2026-07-16
> 版本: v1.0 MVP
> 状态: 架构完成，待端到端测试

---

## 一、概述

### 1.1 项目定位

**Erhu Agent (二虎)** 是 Mirage-Studio 的数字人歌手 IP，负责将歌曲升级为 MV 作品。用户通过 Coordinator（微信 / Admin-UI 工作台 / CLI）发送指令触发：歌词创作 → 歌曲生成 → 图片生成 → 视频合成 → 字幕叠加的全流程。

> **定位变更 (2026-08-09)**: 从"全自动/管理员投放计划文档"改为**用户指令触发**。详情见 `docs/standard/mirage-studio-positioning.md`。

### 1.2 核心特点

| 特性 | 说明 |
|------|------|
| 用户指令触发 | 通过 Coordinator 接收用户创作指令，非自动扫描 |
| 免费 | MVP 阶段所有 API 调用均使用免费额度 |
| 断点续传 | 各阶段独立，失败后可单独重试 |
| 国产模型 | DeepSeek + ACE + 百度文心一格 |
| IP 定位 | 二虎是 Mirage-Studio 的数字人歌手形象，MV 发布官网 + 短视频 |

### 1.3 代号由来

"二虎" (Erhu) — AI 原生数字人歌手。音色设计为沙哑随性、鼻音重的 Eagles 风格男声。区别于主流的"完美"AI 声音，追求一种粗粝、真实的质感。

---

## 二、系统架构

### 2.1 整体流程

```
管理员(Mifon) 投放计划文档
    ↓
[1] scan    → 扫描索引 → 找到未处理计划
    ↓
[2] compose → 调用 lemong-agent 生成歌曲（注入二虎音色）
    ↓
[3] visualize → 分析歌词 → DeepSeek 生成图片 prompt → 百度文心一格生图
    ↓
[4] render  → FFmpeg Ken Burns 静图转视频 → 拼接 → 叠加音频+字幕
    ↓
[5] 输出   → data/Erhu-data/{作品名}/{作品名}.mp4
```

### 2.2 目录结构

```
erhu-agent/                      # Agent 代码
├── AGENTS.md                    # 核心定义与行为规范
├── TODO.md                      # 可行性分析与开发计划
├── erhu-agent                   # CLI 统一入口 (bash)
├── knowledge-base/              # 知识库（API 文档、最佳实践）
└── scripts/                     # 核心脚本
    ├── scan.js                  # 扫描未处理计划
    ├── compose.js               # 歌曲生成（调用 lemong-agent）
    ├── visualize.js             # 图片生成（百度文心一格）
    ├── render.js                # 视频合成（FFmpeg）
    └── produce.js               # 一键全流程

data/Erhu-data/                  # 成品数据目录
├── INDEX.md                     # 作品索引（状态追踪）
├── plans/                       # 作品计划库
│   └── YYYY-MM-DD-作品名.md
└── {作品名}/                    # 每个作品独立子目录
    ├── 创作背景.md
    ├── 歌词.txt
    ├── {作品名}.mp3
    ├── {作品名}.mp4
    ├── prompt.json
    └── images/                  # 生成的图片 + meta.json
```

### 2.3 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 歌曲生成 | lemong-agent (DeepSeek + ACE API) | 已有成熟 Agent，通过 CLI 调用 |
| 图片生成 | 百度文心一格 ERNIE-ViLG | 免费额度，通过 Captain 脚本封装调用 |
| Prompt 生成 | DeepSeek Chat API | 根据歌词自动生成图片描述 |
| 视频合成 | FFmpeg | Ken Burns 效果 + 拼接 + 硬字幕 |
| 运行环境 | Node.js | 所有脚本均为 Node.js |

---

## 三、各阶段详细设计

### 3.1 Phase: scan（计划扫描）

**入口**: `erhu-agent/scripts/scan.js`

**功能**:
- 扫描 `data/Erhu-data/plans/` 目录下的计划文档
- 解析 `data/Erhu-data/INDEX.md` 索引表
- 找出状态为"未处理"或索引中不存在的计划

**输入**: 文件系统（`plans/` 目录 + `INDEX.md`）

**输出**:
- 标准模式: 人类可读的计划列表
- `--json` 模式: JSON 格式，供 `produce.js` 编程消费

**作品计划文档格式**:
```markdown
# 作品名

## 创作主题
描述歌曲的核心主题...

## 歌词方向
歌词设计的思路...

## 音乐风格
乡村民谣 / 流行 / 古风 等...

## 特别要求
（可选）其他特殊需求...
```

---

### 3.2 Phase: compose（歌曲生成）

**入口**: `erhu-agent/scripts/compose.js`

**功能**:
1. 从计划文档提取创作背景
2. 创建 `data/Lemong-data/{作品名}/` 目录
3. 写入 `创作背景.md`（含二虎音色信息）
4. 调用 lemong-agent 两步流程：
   - `generate-from-background.js` → 生成歌词 + music_prompt
   - `generate-music.js` → 调用 ACE API 生成音频
5. 注入二虎音色模板到 `prompt.json`
6. 将产物复制到 `data/Erhu-data/{作品名}/`
7. 更新索引状态

**二虎音色模板**:
```json
{
  "vocal_style": "Warm, gritty, nasal male vocal with a natural, unpolished delivery. Eagles-like warm, gritty, nasal male voice.",
  "special_notes": "CRITICAL: Chinese (Mandarin) song, no English lyrics. Vocals should be rough and heartfelt, with a slightly nasal quality reminiscent of Eagles' vocal style."
}
```

**与 lemong-agent 的协作契约**:
- Erhu 负责：提取计划 → 写入创作背景 → 注入音色 → 复制产物
- Lemong 负责：DeepSeek 生成歌词 → ACE API 生成音频
- 数据流: `plans/` → `Lemong-data/` → `Erhu-data/`

**错误处理**:
- lemong-agent 调用失败 → 更新索引为"失败"
- prompt.json 缺失 → 报错退出
- mp3 生成成功但复制失败 → 记录错误

---

### 3.3 Phase: visualize（图片生成）

**入口**: `erhu-agent/scripts/visualize.js`

**功能**:
1. 读取 `歌词.txt`，解析歌词结构（`[Verse]`/`[Chorus]` 等段落）
2. 调用 DeepSeek API，根据歌词段落 + 歌曲风格生成图片 prompt
3. 调用百度文心一格 ERNIE-ViLG 批量生图
4. 保存图片到 `data/Erhu-data/{作品名}/images/`
5. 保存元数据 `meta.json`（图片-段落映射）

**歌词结构解析**:
- 正则匹配 `[SectionName]` 格式的段落标记
- 每段歌词独立提取，传递给 DeepSeek 生成对应 prompt

**图片 Prompt 生成**:
- 使用 DeepSeek Chat API（`deepseek-chat` 模型）
- System prompt: MV 视觉设计师角色
- User prompt: 包含歌曲标题、风格、情绪、歌词全文
- 输出: JSON 数组 `[{ "section": "段落名", "prompts": ["prompt1", ...] }]`
- 每个段落生成 6 张图片的 prompt

**图片风格映射**:
| 歌曲风格 | 图片风格 |
|---------|---------|
| 乡村 / 民谣 / 旅行 | 写实 |
| 古风 | 国画 |
| 流行 | 插画 |
| 电子 | 3D |
| 摇滚 / 爵士 | 写实 |

**生图 API**: 复用 `captain/scripts/generate-image.js`，通过 CLI 调用：
```bash
node captain/scripts/generate-image.js "prompt" 1280x720 output.jpg baidu
```

**图片规格**: 1280×720（16:9），最终拉伸至 1920×1080

**错误处理**:
- 单张图片生成失败 → 跳过，记录在 meta.json 中
- DeepSeek API 调用失败 → 报错退出
- 百度文心 API Key 未配置 → 检查 `.env` 中的 `BAIDU_AK` / `BAIDU_SK`

---

### 3.4 Phase: render（视频合成）

**入口**: `erhu-agent/scripts/render.js`

**功能**:
1. 获取音频时长（`ffprobe`）
2. 解析歌词时序（按比例分配时间）
3. 对每张图片生成 Ken Burns 视频片段
4. 拼接所有片段
5. 叠加音频 + 硬字幕
6. 输出最终 MP4

**Ken Burns 效果**:
- 使用 FFmpeg `zoompan` 滤镜
- 交替缩放方向：偶数索引 zoom_in（1.0→1.3），奇数索引 zoom_out（1.3→1.0）
- 三向平移循环：left / center / right
- 帧率: 25fps
- 编码: H.264 (libx264)，preset fast

**字幕渲染**:
- 使用 FFmpeg `drawtext` 滤镜
- 逐句显示，根据时间戳 `enable='between(t,start,end)'`
- 字体: DejaVuSans（系统自带）
- 字号: 32px，白色，黑色描边
- 位置: 底部居中（`x=(w-text_w)/2, y=h-th-80`）

**输出规格**:
| 参数 | 值 |
|------|-----|
| 分辨率 | 1920×1080 (1080p) |
| 帧率 | 25fps |
| 视频编码 | H.264 (libx264) |
| 音频编码 | AAC 192kbps |
| 容器 | MP4 |

**时序计算**:
- 总时长 = 音频文件时长
- 每张图片展示时长 = 总时长 / 图片数量
- 每句歌词显示时长 = 总时长 / 歌词行数（按比例）

**错误处理**:
- 图片目录为空 → 报错退出
- ffprobe 读取音频时长失败 → 报错退出
- 单个 Ken Burns 片段生成失败 → 使用备用纯色图
- FFmpeg 拼接失败 → 报错退出

---

### 3.5 Phase: produce（全流程串联）

**入口**: `erhu-agent/scripts/produce.js`

**功能**:
- 串联 scan → compose → visualize → render 全流程
- 支持 `--dry-run` 预览模式
- 支持指定作品名或处理所有未处理计划
- 阶段间错误隔离：某个阶段失败不影响其他作品

**流程**:
```
produce.js
  ├─ scan.js --json  → 获取未处理列表
  ├─ for each song:
  │   ├─ compose.js    → 歌曲生成
  │   ├─ visualize.js  → 图片生成
  │   └─ render.js     → 视频合成
  └─ 完成
```

---

## 四、环境依赖

### 4.1 环境变量（`.env`）

| 变量 | 用途 | 必填 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek 文本生成 + 图片 prompt 生成 | ✅ |
| `ACE_API_KEY` | ACE 音乐生成 API | ✅ |
| `BAIDU_AK` | 百度文心一格 Access Key | ✅ |
| `BAIDU_SK` | 百度文心一格 Secret Key | ✅ |

### 4.2 系统依赖

| 依赖 | 版本要求 | 用途 |
|------|----------|------|
| Node.js | ≥18 | 脚本运行环境 |
| FFmpeg | ≥4.0 | 视频合成、字幕叠加 |
| ffprobe | ≥4.0 | 音频时长检测 |

### 4.3 内部依赖

| 依赖 | 路径 | 说明 |
|------|------|------|
| lemong-agent | `lemong-agent/scripts/` | 歌曲生成 |
| Captain 生图脚本 | `captain/scripts/generate-image.js` | 百度文心一格封装 |

---

## 五、技术决策记录

| # | 决策点 | 选项 | 最终选择 | 原因 |
|---|--------|------|----------|------|
| 1 | 图片→视频方案 | Ken Burns / 可灵 / 通义万相 | **FFmpeg Ken Burns** | 免费、效果可控、MV 场景够用 |
| 2 | 图片生成 API | 百度文心一格 / 智谱 CogView | **百度文心一格** | 智谱无免费生图模型，文心有免费额度 |
| 3 | 歌词字幕格式 | 逐句 / 逐行 / 卡拉OK | **逐句显示** | 简单有效 |
| 4 | 视频分辨率 | 1080p / 720p | **1080p** | 品质优先 |
| 5 | 图片尺寸 | 1280×720 | **1280×720** | 16:9，拉伸至 1920×1080 损失可接受 |
| 6 | 审核环节 | 全自动 / 环节暂停 | **全自动** | MVP 先打通，后续加 `--review` 模式 |
| 7 | ACE 声音一致性 | prompt 描述 / voice clone | **固定 prompt 模板** | ACE 目前不支持 voice clone |

---

## 六、成本分析

### 6.1 单首 MV 成本（180s / 3min）

| 环节 | API 调用次数 | 单价 | 成本 |
|------|-------------|------|------|
| 歌词+prompt 生成 | 1 次 DeepSeek | 免费 | ¥0 |
| 音乐生成 | 1 次 ACE API | 免费 | ¥0 |
| 图片 prompt 生成 | 1 次 DeepSeek | 免费 | ¥0 |
| 图片生成 | ~34 次 文心一格 | 免费额度 | ¥0 |
| 视频合成 | FFmpeg 本地 | — | ¥0 |
| **合计** | — | — | **¥0** |

> 注意：免费额度有上限，批量生产时需关注配额。

---

## 七、扩展方向

### 7.1 短期（v1.1）

- [ ] 支持 `--review` 模式（阶段间暂停，人工确认后继续）
- [ ] 支持自定义音色（传入声音描述覆盖默认模板）
- [ ] 歌词卡拉OK 高亮效果
- [ ] 视频转场效果（淡入淡出 / 滑动）

### 7.2 中期（v2.0）

- [ ] AI 视频生成（可灵 / 通义万相）替代 Ken Burns
- [ ] ACE voice clone 实现声音一致性
- [ ] 数字人形象（虚拟歌手视觉统一）
- [ ] Web UI 管理面板

### 7.3 长期（v3.0）

- [ ] 多歌手协作（二虎 + 其他数字人）
- [ ] 实时生成（边播边生成）
- [ ] 社交媒体自动发布

---

## 八、质量标准

> **权威参考**: [Erhu-agent-MV质量规范.md](./Erhu-agent-MV质量规范.md)
> 整合了 LibTV 视频作品创作质量标准，是 Erhu Agent MV 作品质量的单一信任源 (SSOT)。

### 核心质量指标

| 维度 | 目标 |
|------|------|
| 画质 | 1920×1080 (1080p)，H.264 ≥ 5Mbps |
| 时长 | 2-4 分钟（16s-5min 可接受范围） |
| 字幕 | 完整准确、时间轴对齐、32px 白字+黑色描边 |
| 视觉风格 | 统一风格、有情绪曲线、无明显 AI 瑕疵 |
| 音频 | 人声清晰、无爆音、音画同步 |
| 剪辑节奏 | 按段落情绪分配时长（非等分），副歌快/叙事中/间奏慢 |

---

## 九、文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `erhu-agent/AGENTS.md` | ~200 | Agent 核心定义与行为规范（含质量标准） |
| `erhu-agent/TODO.md` | 198 | 可行性分析与开发计划 |
| `erhu-agent/erhu-agent` | ~30 | CLI 入口（bash） |
| `erhu-agent/scripts/scan.js` | 113 | 计划扫描 |
| `erhu-agent/scripts/compose.js` | 199 | 歌曲生成 |
| `erhu-agent/scripts/visualize.js` | 282 | 图片生成 |
| `erhu-agent/scripts/render.js` | 250 | 视频合成 |
| `erhu-agent/scripts/produce.js` | 112 | 一键全流程 |
| `data/Erhu-data/INDEX.md` | 22 | 作品索引 |
| `docs/standard/Erhu-agent设计文档.md` | — | 本文件 |
| `docs/standard/Erhu-agent-MV质量规范.md` | — | MV 质量规范（SSOT） |
| **合计** | **~1,500** | |
