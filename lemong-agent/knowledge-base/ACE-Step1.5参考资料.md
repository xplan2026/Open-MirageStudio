# ACE Step1.5 参考资料

> **状态**: 已归档  
> **最后更新**: 2026-07-14  
> **来源**: ACE Step1.5 官方文档、GitHub 仓库、社区资料  
> **关联**: `/workspace/captain/subagents/lemong-music/` — Lemong-Music 音乐创作子代理

---

## 一、设计哲学

ACE Step1.5 核心理念是 **"以人为中心的生成"**——AI 是创作合作者而非替代者，通过快速迭代将零碎想法打磨成完整音乐。

---

## 二、操作模式

| 模式 | 说明 |
|------|------|
| **Simple** | 自然语言描述（如"适合安静夜晚的柔和情歌"），AI 自动生成歌词和元数据 |
| **Custom** | 手动精确控制 Caption、歌词及所有参数 |
| **Cover** | 上传音频，改变风格但保留结构 |
| **Repaint** | 重新生成音频的特定时间段 |
| **Extract/Lego/Complete** | 基础模型独有，用于音轨分离、重组等 |

---

## 三、核心参数

### 音乐内容描述

| 参数 | 说明 | 技巧 |
|------|------|------|
| `caption` | 描述风格、乐器、情绪等 | **建议用英文**，效果更稳定；避免风格冲突，可按时序描述 |
| `lyrics` | 歌词文本，纯音乐填 `[Instrumental]` | 使用 `[Verse]`、`[Chorus]` 等结构标签 |

### 音乐结构与元数据

| 参数 | 说明 |
|------|------|
| `duration` / `audio_duration` | 生成音频长度（10秒 ~ 10分钟） |
| `bpm` | 音乐速度 |
| `key_scale` | 调式 |
| `time_signature` | 拍号 |
| `vocal_language` | 人声语言（`zh` / `en` / `ja`） |

### 模型与性能控制

| 参数 | 说明 |
|------|------|
| `thinking` | 启用 5Hz LM 生成高质量音频代码，**强烈建议开启** |
| `model` | DiT 模型选择（如 `acestep-v15-turbo`） |
| `audio_format` | 输出格式：`mp3` / `wav` / `flac` |
| `seed` | 固定后可重复生成相同结果 |

> 参数同时支持 `snake_case` 和 `camelCase`（如 `audio_duration` / `duration` / `audioDuration`）。

---

## 四、歌词输入方式

| 方式 | 场景 |
|------|------|
| 直接粘贴 | 代码中字符串传递，适合快速测试 |
| 从文件读取 | `--lyrics-file` 指定 `.txt` 文件 |
| AI 自动生成 | 设置 `auto-generate`，让模型根据 caption 创作 |
| `instruction.txt` 编辑 | 启用 `thinking=true` 时 CLI 生成，可预生成前微调 |
| 标准 LRC 格式 | 带时间戳 `[mm:ss.xx]`，实现歌词与音乐精确同步 |

---

## 五、架构：LM + DiT 混合

| 组件 | 角色 |
|------|------|
| **LM（语言模型）** | "总规划师"——将简单描述扩展为歌曲蓝图，自动规划歌词、元数据、音乐描述 |
| **DiT（扩散变换器）** | "演奏者"——根据 LM 生成的蓝图合成高保真音频 |

支持通过 API 传入外部模型生成的歌词（`lyrics` 参数），可与任意 LLM 协作。

---

## 六、API 调用方式

### 在线 API（推荐）

- **Base URL**: `https://api.acemusic.ai/v1`
- **认证**: `Authorization: Bearer <API_KEY>`
- **申请地址**: [acemusic.ai/api-key](https://acemusic.ai/api-key)

### 本地部署

```bash
git clone https://github.com/ace-step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv run acestep-openrouter --host 0.0.0.0 --port 8002
```

- **Gradio 界面**: `http://localhost:7860`
- **API 端点**: `http://localhost:8001`
- **优势**: 免费、无限制、数据私有

### 第三方平台

| 平台 | 说明 |
|------|------|
| deAPI.ai | 免费试用额度 |
| DeepInfra | `https://api.deepinfra.com/v1/inference/ACE-Step/acestep-v15-xl-sft` |
| fal.ai | 环境变量 `FAL_KEY` |
| WaveSpeedAI | 专用 API 服务 |

---

## 七、进阶技巧

1. **迭代工作流**: 摆脱"一次成型"，利用"生成-聆听-调整"快速循环
2. **提示词工程**: 精确描述风格、节奏、配器、情感弧光
3. **善用 `format_sample`**: 让 5Hz LM 自动优化你的粗略描述
4. **英文 Caption**: 用英文写提示词效果通常更稳定
5. **LoRA 适配器**: 本地部署可训练专属音乐风格

---

## 八、项目信息

| 项目 | 详情 |
|------|------|
| **研发方** | 阶跃星辰（StepFun）+ ACE Studio（北京时域科技有限公司） |
| **核心作者** | Junmin Gong（一作）、Yulin Song、Wenxiao Zhao、Sen Wang 等 |
| **首次开源** | 2025-05-07（v1-3.5B） |
| **v1.5 发布** | 2026-01-28 |

### 关键链接

| 资源 | URL |
|------|-----|
| 官方主仓库 | <https://github.com/ace-step/ACE-Step> |
| v1.5 代码库 | <https://github.com/ace-step/ACE-Step-1.5> |
| 在线 Demo | <https://huggingface.co/spaces/ACE-Step/ACE-Step> |
| 中文教程 | <https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/zh/Tutorial.md> |
| API 文档 | <https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md> |
| Discord 社区 | <https://discord.gg/PeWDxrkdj7> |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-14 | 初始归档，从参考资料提炼为标准文档 |
