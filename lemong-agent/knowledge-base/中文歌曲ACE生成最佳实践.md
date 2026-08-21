# 中文歌曲 ACE 生成最佳实践

> **来源**: 幻觉 v1→v9→test_N→v10（.txt 外部歌词）迭代实战经验  
> **创建日期**: 2026-07-15  
> **最后更新**: 2026-07-19（DS-渔利 5 轮自然语言提示词测试：验证间奏/尾奏/组合标签/歌词纯净度等控制机制）  
> **适用范围**: 所有使用 ACE Step1.5 Chat Completions 接口生成中文歌曲的场景

---

## 🔴 推荐工作流：两步流程（v10 验证成功 ✅）

### 步骤一：创作背景 → LLM 生成歌词 → 保存 `.txt`

```
创作背景.md → DeepSeek 生成歌词 → {歌名}.txt（含 [Verse]/[Chorus] 结构标注）
→ 用户审阅确认
```

### 步骤二：读取 `.txt` → ACE 生成音乐

```
{歌名}.txt + prompt.json → ACE Chat Completions → {歌名}.mp3
```

### 核心要点

1. **歌词独立为 `.txt` 文件**，不混在 `prompt.json` 中
2. **歌词使用 ACE 官方结构标注**（`[Verse 1]`/`[Chorus]`/`[Bridge]`/`[Outro]`），ACE 原生支持
3. **人工审阅歌词**后再生成音乐，确保歌词质量可控
4. **生成音乐时从 `.txt` 读取歌词**，与 `prompt.json` 中的 `music_prompt` 组装后传给 ACE

---

## 🔴 最关键：歌词传递方式

### 最终方案（v10 验证成功 ✅，连续两次稳定产出）

**歌词混在 `content` 文本中 + 强约束指令**，不使用顶层 `lyrics`/`vocal_language` 字段。

```javascript
// ✅ 正确：歌词放在 content 中，使用强约束防止 LM 改写
const content = `${prompt}

vocal_language: zh
instrumental: false

LYRICS (Chinese, MUST sing exactly these in Mandarin, do NOT translate):
${lyrics}`;

const body = {
  model: 'acemusic/acestep-v1.5-turbo',
  messages: [{ role: 'user', content }],
  max_tokens: 4000
};
```

### 稳定复现记录

| 生成次数 | 歌词 | 文件大小 | 质量 |
|----------|------|---------|------|
| v10 第1次 | 幻觉.txt（30行，417字） | 3681 KB | ✅ 全中文，完整度高 |
| v10 第2次 | 同上（同歌词） | 3673 KB | ✅ 效果更好，接近发布级 |

> 同歌词两次生成大小差异仅 0.2%，说明 ACE 对该工作流输出稳定。

### 失败方案回顾

| 方案 | 方式 | 结果 |
|------|------|------|
| v3 | 歌词混在 content，弱约束 | ❌ 英文歌词（LM 重写） |
| v4a | 顶层 `lyrics` 字段 + `vocal_language: "zh"` | ❌ 纯音乐，无人声 |
| v4b | `[INSTRUCTION]` 格式，歌词混在 content | ❌ 英文歌词 |
| test_M | 短歌词(4行) + 强约束 | ❌ 开头中文，结尾混入英文 |
| v8 | DeepSeek 生成 + 结构标注，prompt 英文多 | ❌ 前半英文+后半中文 |
| v9 | 手写歌词，prompt 277 字英文 | ❌ 18-49s 英文吟唱 |
| **v10** | **独立 .txt + 结构标注 + 强约束 + 人审** | **✅ 全中文，稳定可复现** |
| DS-渔利 v1 | 纯自然语言描述（创作背景 + 风格），不提供歌词 | ❌ 模型自动重写歌词，无法控制内容 |
| DS-渔利 v2 | 歌词中混入括号英文描述 `(Instrumental intro...)` | ❌ 整首英文演唱 |

### 关键发现

1. **Chat Completions 接口不支持顶层 `lyrics`/`vocal_language` 字段** — 这些是 ACE 原生 `/release_task` API 的参数，在 OpenAI 兼容接口中被忽略（已通过 HTTP 504 / 404 验证）
2. **歌词必须足够长**（>8行中文，200-400字）— 短歌词会导致 LM 自由发挥补充内容，混入英文
3. **强约束指令有效** — `"LYRICS (Chinese, MUST sing exactly these in Mandarin, do NOT translate)"` 配合 `vocal_language: zh` 和 `instrumental: false` 写在 content 中
4. **结构标注（`[Verse]`/`[Chorus]`）是 ACE 原生支持的格式**，不是导致英文演唱的原因（v8 英文根因是 prompt 英文量过大）
5. **人工审阅歌词是关键质量节点** — 两步流程中用户确认歌词后再生成，避免 typo 或结构问题进入最终作品
6. **歌词中不得混入任何英文描述** — 括号内的英文（如 `(Instrumental intro...)`）会被 ACE 当作歌词解析，导致整首英文演唱（DS-渔利 v2 教训）。所有控制指令必须放在 caption 中
7. **纯自然语言描述不可用于固定歌词场景** — 如果只提供创作背景和风格描述而不提供歌词，ACE 会自动生成新歌词，无法控制歌词内容（DS-渔利 v1 教训）。但这种方法在**没有歌词、只有创意**的场景下是可用的——生成的作品音乐质量不错，适合作为灵感探索或 demo 制作

---

## 核心原则

### ❌ 不要约束旋律参数

给 ACE API 的 music_prompt 中**不应该指定 BPM、调式、和弦走向**等旋律参数。

**原因**:
- ACE 会优先满足这些音乐参数约束，导致旋律被"框死"
- 固定 BPM 和和弦走向无法灵活适配中文歌词的自然断句和呼吸节奏

### ✅ 正确做法

只描述风格氛围和乐器：

```
Generate music: {风格/氛围/乐器描述}.
Low, slightly husky male voice with a narrative, storytelling quality.
```

---

## 歌曲结构控制（DS-渔利 v4 验证）

### 间奏设计

在段落之间插入 `[Interlude]` 标签可实现器乐间隔，避免段落连唱无呼吸感：

```
[Verse 1]
...

[Interlude - erhu, 10s]

[Pre-Chorus]
...
```

- 组合标签指定乐器：`[Interlude - erhu, 10s]`、`[Interlude, 10s]`
- 时长标注为软约束，实际时长可能偏差

### 尾奏退场旋律

仅靠 `[Outro]` 唱完歌词即止，会显得突兀。在 Outro 后追加 `[Instrumental]` 标签实现器乐退场：

```
[Outro]
风定收竿罢，残饵随波流——
满江星月无人钓，空照旧渔舟。

[Instrumental - erhu solo, fade out, 10-15s]
```

- 组合标签：`[Instrumental - {乐器} solo, fade out, {时长}]`
- caption 中同步描述：`After the final lyric ends, an erhu solo instrumental outro fades out slowly over 15 seconds.`
- 使用 `10-15s` 范围比固定值更实际

### 前奏控制

`[Intro - short, 15s]` + caption 中强调 `Very short intro, no more than 15 seconds, vocals start quickly.`

⚠️ **限制**：ACE API 无独立 intro 时长参数，前奏时长不可精确控制，此为软约束。

---

## 歌词纯净度铁律

### 🔴 歌词区域绝对不得混入英文

括号内的英文描述会被 ACE 当作歌词解析，导致整首英文演唱：

```
❌ 错误：
[Interlude - erhu, 10s]
(Short erhu interlude, melancholy and flowing)   ← 这段英文被当作歌词！
[Pre-Chorus]
可叹这江上机关千百种，
...

✅ 正确：
[Interlude - erhu, 10s]
[Pre-Chorus]
可叹这江上机关千百种，
...
```

**规则**：
- 歌词中只保留：**结构标签 + 纯中文歌词**
- 所有英文描述/约束/说明 → 全部放在 **caption** 中
- 括号 `()` 在歌词中会被 ACE 解释为背景和声或旁白，不能用于写控制指令

---

## music_prompt 字段使用指南

| 字段 | 建议 | 原因 |
|------|------|------|
| `bpm` | ❌ 不填 | 会限制旋律灵活性 |
| `key_scale` | ❌ 不填 | 模型会自动选择合适调式 |
| `chord_progression` | ❌ 不填 | 会固定和声走向，限制中文断句适配 |
| `caption_en` | ✅ 必填 | 风格氛围描述，最重要的字段 |
| `vocal_language` | ✅ 作为顶层字段 `"zh"` | 与 lyrics 一起作为独立字段传递 |
| `vocal_style` | ✅ 推荐 | 描述人声特征 |
| `instruments` | ✅ 推荐 | 描述乐器配置 |
| `mood` | ✅ 推荐 | 情绪氛围词 |
| `special_notes` | ✅ 推荐 | 特殊要求 |
| `audio_format` | ✅ `"mp3"` | 固定值 |

---

## 歌词文件规范

### 格式

歌词保存为 `{歌名}.txt`，格式如下：

```
# 歌名

# 结构: Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Outro

[Verse 1]
歌词行1
歌词行2

[Chorus]
歌词行3
歌词行4

...
```

### 结构标注

使用 ACE 官方支持的标准结构标签（英文）。以下标签均经过实测验证（DS-渔利 v3/v4）：

| 标签 | 含义 | 验证状态 |
|------|------|----------|
| `[Intro]` / `[Intro - short, 15s]` | 前奏（支持组合标签描述时长） | ⚠️ 部分生效，时长不可精确控制 |
| `[Verse 1]` / `[Verse 2]` | 主歌段落 | ✅ |
| `[Pre-Chorus]` | 导歌，积蓄能量 | ✅ |
| `[Chorus]` | 副歌（可重复） | ✅ |
| `[Bridge]` | 桥段 | ✅ |
| `[Interlude]` / `[Interlude - erhu, 10s]` | 器乐间奏（支持组合标签指定乐器和时长） | ✅ |
| `[Outro]` | 尾声（人声收束） | ✅ |
| `[Instrumental - erhu solo, fade out, 10-15s]` | 纯器乐尾奏退场（支持组合标签） | ✅ |

> ⚠️ 中文标注（如 `[A段]`、`[副歌]`）无效，必须使用英文标签。
>
> **组合标签**：用 `-` 连接子描述，如 `[Intro - short, 15s]`、`[Interlude - erhu, 10s]`。但时长标注仅为软约束，ACE 不完全精确遵循。

### 代码中读取歌词

从 `.txt` 文件读取时，需去掉标题行（`# ` 开头）和结构注释行：

```javascript
const lyrics = txtContent
  .replace(/^#.*\n/gm, '')    // 去掉所有 # 开头的行
  .replace(/^\n+/, '')         // 去掉开头空行
  .trim();
```

---

## 歌词传递方式

| 方式 | 结果 | 说明 |
|------|------|------|
| ❌ 混在 content，无强约束 | 英文歌词 | LM Query Rewriting 会重写 |
| ❌ 顶层 `lyrics` 字段 | 纯音乐/无人声（HTTP 504） | Chat Completions 不支持此字段 |
| ❌ 短歌词 + 强约束 | 中英混杂 | 歌词太短，LM 自由发挥 |
| ✅ 长歌词(>8行) + 结构标注 + 强约束 | 全中文，稳定可复现 | v10 两次验证成功 |

---

## 执行环境注意事项

### 可用运行时

- ✅ **Node.js** — 唯一可靠运行时
- ❌ **Python** — 可能不可用，执行前需 `which python` 确认

### 文件写入

- ❌ **`/tmp/`** — 对 shell 子进程可能不可写，不可依赖
- ❌ **shell 重定向 `>`** — 输出文件可能无法写入
- ✅ **`/data/Lemong-data/`** — 已验证可写
- ✅ **Node.js `fs.writeFileSync()`** — 直接文件写入，最可靠

### API 调用

- **前台同步调用不可靠**: `execute_command` 返回时前台进程被终止，异步 HTTP 回调丢失
- **后台运行 `node script.js &`**: 唯一可靠的长时 API 调用方式
- **超时设置**: ACE API 处理中文长歌词需至少 **360 秒**（6 分钟），实际约 3-4 分钟

---

## 快速检查清单

生成中文歌曲前，确认：

- [ ] 歌词保存为独立 `{歌名}.txt`（含 `[Verse]`/`[Chorus]` 结构标注）
- [ ] 歌词已通过人工审阅确认
- [ ] music_prompt 中**没有** `bpm`、`key_scale`、`chord_progression` 字段
- [ ] 歌词**不要**作为顶层 `lyrics` 字段（Chat Completions 不支持，返回 504）
- [ ] `vocal_language: zh` 和 `instrumental: false` 写在 `content` 文本中
- [ ] 歌词前加 `LYRICS (Chinese, MUST sing exactly these in Mandarin, do NOT translate):`
- [ ] 歌词长度足够（>8行中文，200-400字），避免过短导致 LM 自由发挥
- [ ] `caption_en` 只描述风格/乐器/情绪，不包含歌词内容
- [ ] API 调用使用 360 秒超时
- [ ] **歌词区域无任何英文描述**（括号、注释等全部移除，控制指令放在 caption 中）
- [ ] 段落间有 `[Interlude]` 标签（避免段落连唱无间隔）
- [ ] Outro 后有 `[Instrumental - fade out]` 标签（避免唱完突兀结束）

---

## 自然语言 Prompt 模板

DS-渔利 v4 验证通过的完整歌词模板，可作为同风格歌曲的起点。模板文件位于：

```
lemong-agent/knowledge-base/natural-language-prompt-template.txt
```

### 核心结构

```
title：{歌名}

[Intro - short, 15s]
[Verse 1]
{主歌一歌词}

[Interlude - {乐器}, 10s]
[Pre-Chorus]
{导歌歌词}

[Chorus]
{副歌歌词}

[Interlude, 10s]
[Verse 2]
{主歌二歌词}

[Chorus]
{副歌歌词}

[Outro]
{尾声歌词}

[Instrumental - {乐器} solo, fade out, 10-15s]
```

### caption 模板

```javascript
const caption = [
  'Generate a Chinese ancient style (古风) folk song.',
  'Low, slightly husky male voice with a narrative storytelling quality.',
  'Clear articulation, every syllable pronounced distinctly and clearly.',
  'Very short intro, no more than 15 seconds, vocals start quickly.',
  'Use erhu (二胡) and acoustic guitar as main instruments.',
  'The song has clear section breaks with short erhu instrumental interludes between verses.',
  'After the final lyric ends, an erhu solo instrumental outro fades out slowly over 15 seconds.',
  'Use Chinese vocal language. Sing all lyrics in Mandarin Chinese ONLY.'
].join(' ');
```
