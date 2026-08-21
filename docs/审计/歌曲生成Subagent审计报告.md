# 🔍 Lemong-Music 代码与逻辑审计报告

> **审计日期**: 2026-07-14  
> **审计范围**: `/workspace/captain/subagents/lemong-music/` 全部代码、配置和文档  
> **审计人**: 大副 (First Mate)

---

## 一、整体评估

**总体评分：7.5/10** — 架构设计清晰、文档完整度高，但存在若干中等问题和一处关键功能缺失。

---

## 二、代码质量分析

### 2.1 `scripts/generate-prompt.js` (411行) — **评分 7/10**

**优点：**
- 模块化设计良好，6 个导出函数职责单一
- `parseQuestions()` 的 Markdown 解析器设计合理，正则提取结构化字段
- `parseOutput()` 的三层 JSON 提取（直接解析 → code block → 大括号匹配）具备良好容错性
- 歌手系统 `loadSinger()`/`listSingers()` 集成干净，与 `buildContext()` 通过可选参数解耦

**问题：**

| # | 严重度 | 位置 | 问题 |
|---|--------|------|------|
| 1 | ⚠️ 中 | L258-315 `callLLM()` | 与 `generate-lyrics.js` L73-123 的 `callDeepSeek()` **功能重复约 90%**，仅 `SYSTEM_PROMPT` 不同。应提取为共享模块。 |
| 2 | ⚠️ 中 | L263-273 | API 调用未使用 `DEEPSEEK_BASE_URL` 的 `pathname`，hardcode 了 `/chat/completions`。如果 BASE_URL 已包含完整路径，`new URL('/chat/completions', ...)` 会正确拼接；但端口从 `url.port` 取，`url.pathname` 却被忽略——这是**不一致的**。 |
| 3 | 🔴 高 | L96-108 `loadTemplate()` | `readdirSync` 在读取目录时**没有 try-catch**，如果 `templates/` 目录不存在，会直接崩溃而非友好报错。 |
| 4 | 🟡 低 | L119 | `questionBlocks = content.split(/### \d+\./).slice(1)` — 如果 Markdown 中有非问题的 `### N.` 标题（如模板底部的"默认值汇总"二级标题），会被误解析为问题。实际上目前模板的"默认值汇总"用的是 `##`，所以暂时安全。 |
| 5 | 🟡 低 | L122-154 | `parseQuestions()` 中 `options` 的解析 regex `/^-\s*/` 无法处理缩进列表项（如 `  - xxx`），但当前模板使用无缩进的 `-`，暂时安全。 |

### 2.2 `scripts/generate-lyrics.js` (197行) — **评分 7/10**

**优点：**
- 创作/修订双模式设计清晰
- 修订模式保留原始主题 + 上一版歌词 + 反馈，上下文完整
- 独立的 JSON 提取函数（与 `generate-prompt.js` 同名函数逻辑重复，但属于不同文件内的合理重复）

**问题：**

| # | 严重度 | 位置 | 问题 |
|---|--------|------|------|
| 6 | ⚠️ 中 | L73-123 `callDeepSeek()` | 与 `generate-prompt.js` 的 `callLLM()` **几乎完全重复**（见问题 #1）。建议提取为共享 `lib/api-client.js`。 |
| 7 | ⚠️ 中 | L147-166 `main()` | 命令行参数解析使用 `indexOf` 方式，不支持 `--theme="xxx"` 带等号的写法，也不支持 `--theme` 作为最后一个参数的情况（会越界取 undefined）。 |
| 8 | 🟡 低 | L13 | `require('http')` 被引入但从未使用。 |

### 2.3 `scripts/generate-music.js` (427行) — **评分 8/10**

**优点：**
- 双模式输入（`music_prompt` JSON vs 风格模板）设计合理，向后兼容
- `buildPromptFromMusicPrompt()` 歌手特征注入逻辑干净
- 错误码分类（401/403/429/404/500）实用
- 提示词自动存档功能（Phase 9）实现优雅
- base64 解码 + 文件保存逻辑健壮

**问题：**

| # | 严重度 | 位置 | 问题 |
|---|--------|------|------|
| 9 | ⚠️ 中 | L30-31 `OUTPUT_DIR`/`PROMPT_OUTPUT_DIR` | 使用 `../../../../data/...` 相对路径，**依赖脚本文件在特定目录结构中的位置**。如果文件被移动，路径将错误。 |
| 10 | ⚠️ 中 | L35-72 `STYLE_TEMPLATES` | 6 种风格模板的硬编码 prompt **与 templates/ 下的交互式问卷完全独立**，是两个并行的系统。当模板问卷更新后，这些硬编码不会自动同步，造成维护负担。 |
| 11 | 🔴 高 | L162-265 `generateMusic()` | **歌手特征注入仅在 `music_prompt` 模式下生效**（L171 调用 `buildPromptFromMusicPrompt` 传入了 `singerProfile`），但**风格模板模式（L173-189）完全忽略了 `singerProfile` 参数**！ |
| 12 | 🟡 低 | L339 | `audioUrl.replace(/^data:audio\/mpeg;base64,/, '')` — 只处理了 `audio/mpeg`，如果 API 返回 `audio/mp3` 或 `audio/wav` 等其他 MIME type，解码会失败。建议用 `/^data:audio\/[^;]+;base64,/`。 |
| 13 | 🟡 低 | L398-402 | 提示词存档时 `promptFilePath` 被声明为局部变量，但如果 `musicPrompt` 为 null（风格模板模式），`promptFilePath` 未定义。虽然 L401 使用了它但不会执行到（L384 的 `if` 保护），代码可读性略差。 |

### 2.4 CLI 入口 `lemong-music` (303行 Bash) — **评分 8/10**

**优点：**
- 子命令路由清晰
- `.env` 自动加载
- `show_status()` 功能完善，包含 MP3、JSON、成品/草稿区分、提示词存档展示
- 颜色输出友好

**问题：**

| # | 严重度 | 位置 | 问题 |
|---|--------|------|------|
| 14 | ⚠️ 中 | L149-151, L166-168, L182-184 | `.env` 加载使用 `export $(grep -v '^#' .env \| xargs)` — **如果 `.env` 中有包含空格的值（如带引号的字符串），xargs 会错误分割**。且每次调用子命令都重复 export。 |
| 15 | ⚠️ 中 | L29 | `OUTPUT_DIR` 硬编码为 `$SCRIPT_DIR/data/AI-Music`，但 `generate-music.js` 中的 `OUTPUT_DIR` 使用相对路径 `../../../../data/AI-Music`。两处路径定义**不共享同一来源**，存在不一致风险。 |
| 16 | 🔴 高 | L275 | `run_prompt` 只接受 2 个位置参数，**无法传递 `--singer` 参数**给 `generate-prompt.js`。虽然 CLI help 中没有记录 singer 选项，但 `generate-prompt.js` 实际上支持。 |
| 17 | 🟡 低 | L117 | `grep -c '^### [0-9]'` 用于统计问题数 — 对无缩进的 `### N.` 有效，但对包含中文数字或其他格式的问题标题会漏计。当前模板统一使用阿拉伯数字，暂时安全。 |

---

## 三、逻辑与流程设计审计

### 3.1 工作流设计 — **评分 7.5/10**

```
管理员意图 → [1] 确认风格 → [1.5] 选择歌手 → [2] 逐题提问 → [3] LLM生成 → [4] 审阅 → [5] 音乐生成 → [6] 试听迭代 → [7] 发送
```

**优点：**
- 渐进式信息收集，从宏观到微观，符合认知顺序
- 每个阶段有明确的输入/输出契约
- 版本控制（V1→V2→成品）命名规范一致
- 歌手系统与风格系统解耦

**设计问题：**

| # | 严重度 | 问题 |
|---|--------|------|
| 🔴 A | 高 | **`generate-lyrics.js` 完全孤立于主工作流**。SKILL.md 描述的流程中，歌词生成和修改是通过 `generate-prompt.js` 的 `callLLM()` 完成的，而 `generate-lyrics.js` 是独立的歌词生成工具。两者输出的 JSON 格式不同（一个有 `music_prompt`，一个没有），在 Agent 实际执行时可能造成混淆。 |
| ⚠️ B | 中 | **风格模板硬编码 + 模板问卷双轨制**。`generate-music.js` 中的 `STYLE_TEMPLATES` 是硬编码的静态 prompt，而 `templates/` 下的问卷是交互式的。当用户跳过问卷直接用 CLI `--style` 模式时，使用的是硬编码模板而非问卷结果。两者之间没有数据流通。 |
| ⚠️ C | 中 | **歌手系统注入路径不完整**。歌手特征通过 `buildContext()` 注入 LLM 生成阶段，也通过 `buildPromptFromMusicPrompt()` 注入 ACE 生成阶段——但后者**仅在 music_prompt 模式下生效**（问题 #11）。 |
| 🟡 D | 低 | **缺少 singer 到 CLI 的传递**。`lemong-music prompt` 命令无法传递 `--singer` 参数（问题 #16）。 |

### 3.2 数据流完整性 — **评分 7/10**

```
用户答案 → buildContext() → callLLM() → {lyrics, music_prompt}
                                              ↓
                         buildPromptFromMusicPrompt(music_prompt, lyrics, singerProfile) → ACE API → MP3
                                              ↓
                         data/music-prompt/歌名.json (存档)
```

**优点：**
- 数据流单向清晰
- 每个阶段产物有明确的结构化格式
- 提示词存档实现了可追溯性

**问题：**

| # | 严重度 | 问题 |
|---|--------|------|
| 🔴 E | 高 | **`data/AI-Music/` 下的 `歌名_V1.json` / `歌名.json` 版本化保存功能在代码中并未实现**。SKILL.md 和 LLMs.txt 描述了完整的版本保存（V1/V2/成品），但 `generate-music.js` 只保存 MP3 和 `music-prompt/` 下的存档，**不会自动生成 `data/AI-Music/歌名_V1.json`**。Agent 需要在对话层手动完成此步骤。 |
| ⚠️ F | 中 | **ACE API 返回的元数据（BPM、Key、Duration）被解析但未充分利用**。`parseMetadata()` 提取了这些值，但仅作为 `output.metadata` 输出到 stdout，不会写回任何持久化存储。 |
| 🟡 G | 低 | **两个输出目录的定位方式不一致**。`data/AI-Music/` 通过 `../../../../` 相对路径定位，`data/music-prompt/` 同理。这依赖于脚本文件在 `captain/subagents/lemong-music/scripts/` 下的位置假设。 |

---

## 四、架构与可维护性

### 4.1 模块化 — **评分 6/10**

| 方面 | 评分 | 说明 |
|------|------|------|
| 代码复用 | 4/10 | DeepSeek API 调用逻辑在两处重复；JSON 解析逻辑在三处重复 |
| 关注点分离 | 7/10 | 三个脚本各司其职，但 `generate-music.js` 中混入了硬编码模板 |
| 可扩展性 | 8/10 | 新增风格只需添加模板 Markdown；新增歌手只需添加 profile.json |
| 配置管理 | 6/10 | 环境变量管理合理，但路径硬编码、模板硬编码分散 |

### 4.2 文档质量 — **评分 9/10**

文档非常出色：
- SKILL.md：完整的 6 阶段工作流 + 错误处理表 + 技术依赖表
- README.md：CLI 快速开始 + 完整工作流 + 子命令详解
- templates/README.md：设计原则 + 结构规范 + ACE 参数映射
- singer/README.md：Profile 规范 + 使用方式 + 添加新歌手指南
- TODO.md：9 个阶段的详细开发计划，每个阶段的任务列表清晰
- chord-progressions.md：专业级和弦参考库

**唯一缺失**：没有架构决策记录（ADR）或设计决策文档，未来维护者可能不理解为什么存在双轨制（模板 vs 硬编码）。

---

## 五、安全性

| # | 严重度 | 问题 |
|---|--------|------|
| 18 | 🟡 低 | `.env` 加载方式（`grep -v '^#' \| xargs`）在值包含空格或特殊字符时可能出错，但对 API Key 这种不含空格的场景通常安全。 |
| 19 | 🟡 低 | `generate-music.js` L398-402 的 `promptFilePath` 由用户提供的 `title` 派生，如果 title 包含 `../` 等路径遍历字符，可能导致文件写入任意位置。好在 L349 做了 `safeTitle` 过滤（替换了非安全字符），`/` 会被替换为 `_`，实际风险较低。 |

---

## 六、问题汇总与优先级

### 🔴 关键问题（需优先修复）

| # | 问题 | 位置 |
|---|------|------|
| 11 | `generateMusic()` 歌手注入在风格模板模式下缺失 | `generate-music.js` L173-189 |
| E | `data/AI-Music/歌名.json` 版本保存未在代码中实现 | `generate-music.js` |
| 16 | CLI `lemong-music prompt` 不支持 `--singer` 参数 | `lemong-music` L275 |
| 3 | `loadTemplate()` 缺少 `templates/` 目录不存在的 try-catch | `generate-prompt.js` L96-108 |

### ⚠️ 中等问题（建议尽快修复）

| # | 问题 | 位置 |
|---|------|------|
| 1/6 | DeepSeek API 调用代码重复（两处） | `generate-prompt.js` + `generate-lyrics.js` |
| B | 风格模板硬编码 + 模板问卷双轨制 | `generate-music.js` |
| A | `generate-lyrics.js` 与主工作流的割裂 | `generate-lyrics.js` |
| 9 | 路径硬编码依赖目录结构 | `generate-music.js` L30-31 |
| F | ACE 元数据未持久化存储 | `generate-music.js` |
| 7 | 命令行参数解析不支持 `=` 格式 | `generate-lyrics.js` L147-166 |
| 2 | API URL 构造中 port/pathname 不一致 | `generate-prompt.js` L263-273 |
| 14 | `.env` 加载方式不够健壮 | `lemong-music` |
| 15 | 两处 OUTPUT_DIR 路径定义不一致 | `lemong-music` + `generate-music.js` |

### 🟡 改进建议

| # | 问题 | 位置 |
|---|------|------|
| 8 | `require('http')` 未使用 | `generate-lyrics.js` L13 |
| 12 | base64 MIME type 正则过于严格 | `generate-music.js` L339 |
| 13 | `promptFilePath` 变量作用域可读性 | `generate-music.js` L398-402 |

---

## 七、修复记录

### 修复时间：2026-07-14

---

### 🔴 关键问题修复

#### 修复 #11：`generateMusic()` 歌手注入在风格模板模式下缺失

**文件**: `scripts/generate-music.js` L173-189

**变更**: 在风格模板模式（`--style`）分支中增加了歌手特征注入逻辑。当 `singerProfile` 存在时，将 `vocal_style_injection` 追加到 style prompt 末尾，并在日志中提示歌手特征已注入。

```javascript
// 注入歌手声音特征（如果有指定歌手）
if (singerProfile && singerProfile.usage_in_prompt?.vocal_style_injection) {
  stylePrompt += `\nSinger vocal characteristics: ${singerProfile.usage_in_prompt.vocal_style_injection}`;
}
```

---

#### 修复 #E：`data/AI-Music/歌名.json` 版本保存功能

**文件**: `scripts/generate-music.js`

**变更**: 在音乐生成成功后，新增自动版本检测与 JSON 保存逻辑：
1. 扫描 `data/AI-Music/` 下已有的同名 `_VN.mp3` 文件，自动确定下一个版本号
2. 保存版本化 JSON（`歌名_V1.json`）到 `data/AI-Music/`，包含完整的 lyrics、music_prompt、audio 元数据
3. 输出结果中增加 `version` 和 `version_json` 字段
4. 提示词存档中也增加了 `version` 字段

---

#### 修复 #16：CLI `lemong-music prompt` 不支持 `--singer` 参数

**文件**: `lemong-music`

**变更**: 
1. `run_prompt()` 函数重构为 `while` 循环参数解析，支持 `--singer <歌手名>` 参数
2. 当指定 `--singer` 时，透传 `--singer` 参数给 `generate-prompt.js`
3. 主入口 `prompt` case 改为 `run_prompt "$@"` 透传所有参数
4. `help` 文本更新，增加 `--singer` 用法示例

---

#### 修复 #3：`loadTemplate()` 缺少 try-catch

**文件**: `scripts/generate-prompt.js` L96-108

**变更**: 
1. 新增 `fs.existsSync(TEMPLATES_DIR)` 检查，目录不存在时友好报错
2. `readdirSync` 包裹在 try-catch 中，避免崩溃
3. 过滤排除 `chord-progressions.md` 避免将其列为"风格"

---

### ⚠️ 中等问题修复

#### 修复 #9 + #15：路径硬编码 + 两处 OUTPUT_DIR 不一致

**文件**: `scripts/generate-music.js` + `lemong-music`

**变更**:
1. `generate-music.js` 引入 `WORKSPACE_ROOT` 统一基准路径，`OUTPUT_DIR` 和 `PROMPT_OUTPUT_DIR` 通过环境变量 `LEMONG_OUTPUT_DIR`/`LEMONG_PROMPT_DIR` 可覆盖
2. CLI 入口导出 `LEMONG_OUTPUT_DIR` 和 `LEMONG_PROMPT_DIR` 环境变量后调用脚本，确保两处路径一致
3. `show_status()` 中的 `prompt_dir` 改用 `$PROMPT_OUTPUT_DIR` 变量
4. `path.relative()` 统一使用 `WORKSPACE_ROOT` 作为基准

---

#### 修复 #14：`.env` 加载方式不够健壮

**文件**: `lemong-music`

**变更**: 三处 `.env` 加载从 `export $(grep -v '^#' .env | xargs)` 改为 `set -a; source .env; set +a`，正确处理包含空格和特殊字符的值。

---

#### 修复 #7：命令行参数解析不支持 `=` 格式

**文件**: `scripts/generate-lyrics.js` L147-166

**变更**: 新增 `parseArgs()` 函数，支持 `--key=value` 和 `--key value` 两种格式，同时防止 `--theme` 作为最后一个参数时越界取 undefined。

---

#### 修复 #F：ACE 元数据写入持久化存储

**文件**: `scripts/generate-music.js`

**变更**: 版本化 JSON 保存时，将 `parseMetadata()` 解析出的 BPM、Key、Duration 等元数据通过 `...metadata` 展开写入 `audio` 字段，实现元数据的持久化存储。

---

### 🟡 改进修复

#### 修复 #8：移除未使用的 `require('http')`

**文件**: `scripts/generate-lyrics.js` L13

**变更**: 删除 `const http = require('http');`

---

#### 修复 #12：base64 MIME type 正则过于严格

**文件**: `scripts/generate-music.js` L339

**变更**: 正则从 `/^data:audio\/mpeg;base64,/` 改为 `/^data:audio\/[^;]+;base64,/`，兼容 `audio/mp3`、`audio/wav` 等多种 MIME type。

---

#### 修复 #13：`promptFilePath` 变量作用域可读性

**文件**: `scripts/generate-music.js`

**变更**: 
1. 移除顶层的 `let promptFilePath = null` 声明
2. 将 `promptFilePath` 声明移入 `if (musicPrompt)` 块内
3. 版本 JSON 保存逻辑合并到同一 `if` 块中，代码结构更清晰

---

### 关于 #2 的说明（误报）

审计报告中的问题 #2（API URL 构造中 port/pathname 不一致）经核查为误报。`callLLM()` 和 `callDeepSeek()` 中均正确使用了 `url.port` 和 `url.pathname`，URL 构造逻辑正确无误。已从修复列表中排除。

---

### 待后续修复的问题

以下问题涉及较大重构，建议在后续迭代中处理：

| # | 问题 | 建议方案 |
|---|------|----------|
| 1/6 | DeepSeek API 调用代码重复 | 提取 `lib/api-client.js` 共享模块 |
| B | 风格模板硬编码双轨制 | 让 `STYLE_TEMPLATES` 从模板 Markdown 动态生成 |
| A | `generate-lyrics.js` 与主工作流割裂 | 统一输出格式，或明确标注为独立工具 |

---

### 修复后验证

- ✅ 所有 JS 文件通过 `node -c` 语法检查
- ✅ Bash CLI 通过 `bash -n` 语法检查
- ✅ Linter 无新增错误

---

## 八、待后续修复问题的设计说明

### 关于问题 B：风格模板双轨制

**现象**：`generate-music.js` 中存在硬编码的 `STYLE_TEMPLATES`（6 种风格的英文 prompt + BPM + 乐器），与 `templates/` 目录下的交互式 Markdown 问卷描述的是同一批风格，但两者数据互不相通。

**设计意图**：这两条路径各有用途，并非需要统一的"重复"：

- **交互式路径**（`generate-prompt.js` → LLM 生成 `music_prompt`）：面向需要精细控制的场景，通过模板问卷逐题收集管理员偏好，由 DeepSeek LLM 理解意图后生成定制化的 `music_prompt`。
- **快捷路径**（`generate-music.js` 硬编码 `STYLE_TEMPLATES`）：面向快速生成场景，管理员通过 CLI `--style` 直接指定风格，跳过所有交互，用预设的高质量 prompt 直接调 ACE API 生成音乐。

两者是互补关系而非冗余关系，无需统一。

### 关于问题 A：`generate-lyrics.js` 定位问题

**现象**：`generate-lyrics.js` 有自己独立的 DeepSeek API 调用、System Prompt、输出格式（`{ title, structure, style_suggestion, lyrics, notes }`），输出不包含 `music_prompt`，与主工作流（通过 `generate-prompt.js` 的 `callLLM()` 生成歌词）格式不同。

**设计意图**：`generate-lyrics.js` 是一个**独立的纯歌词工具**，面向"只需要写歌词，不需要生成音乐"的使用场景。它本身就是独立运行的，天然不需要与主音乐生成工作流耦合。主工作流中歌词的生成和修改通过 `generate-prompt.js` 完成，`generate-lyrics.js` 作为独立工具存在是合理的。

### 关于问题 1/6：DeepSeek API 调用代码重复

**现象**：`generate-prompt.js` 的 `callLLM()` 与 `generate-lyrics.js` 的 `callDeepSeek()` 实现几乎相同（约 90% 重复）。

**设计意图**：该 Subagent 设计上可以独立运行，不必强求共享模块。每个脚本自包含 API 调用逻辑，避免了模块间耦合，使每个脚本都可以脱离项目独立使用。代码重复量不大（约 50 行），在当前规模下是合理的取舍。

