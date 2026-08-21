---
name: llm-gateway-workflow
description: 小说创作全环节 LLM 网关工作流。把 Xujie-Writer 的推理/编排/分析（分镜规划、一致性校验、去AI味质检）与生成（正文/大纲/审校）统一经 scripts/llm-gateway.js 调用智谱免费模型（glm-4.7-flash 主 / glm-4-flash 备用 / DeepSeek 兜底），替代 CodeBuddy Credits 与服务器端 DeepSeek 计费。触发词：网关、llm-gateway、智谱免费、分镜生成、零成本创作、切换模型。
Updated: 2026-08-20 12:00
生命周期: 永久保存
保存位置: xujie-writer-agent/ai-fiction-writer/纯净版skill/llm-gateway工作流.md
---

# LLM 网关工作流 — Xujie-Writer 全部模型调用统一走智谱免费

> **定位**：Xujie-Writer Agent 从「人控 AI 辅助（CodeBuddy 自耗 Credits）」升级为「第三方 LLM 全托管（智谱免费模型）」，把小说创作全链路中所有消耗型 LLM 调用统一收敛到 `scripts/llm-gateway.js`，**零 API 成本**。
>
> **核心结论**：智谱免费模型可覆盖全部创作环节——写前推理（分镜规划）、写中生成（正文）、写后校验（一致性 + 去 AI 味质检）。部署到服务器后同样走本网关，不再需要 DeepSeek 计费调用。

---

## 一、为什么需要网关

Xujie-Writer 工作流中的 LLM 调用分两类，过去都不在掌控内：

| 环节 | 过去实现 | 问题 |
|------|---------|------|
| 写前推理/编排/分析（分镜规划、时间轴对齐、prompt 组装） | 开发阶段 CodeBuddy 自带接口 | 消耗 CodeBuddy Credits |
| 写后审校/质检（一致性校验、去 AI 味） | 同上 | 消耗 CodeBuddy Credits |
| 正文生成 | CodeBuddy 执行 | 消耗 CodeBuddy Credits |
| 部署到服务器后 | DeepSeek API | 按量计费 |

**网关统一解决**：所有环节改为调用 `scripts/llm-gateway.js` → 智谱免费模型（GLM-4.7-Flash 永久免费 / GLM-4-Flash 免费），开发阶段不烧 Credits，服务器部署不花钱。

---

## 二、环境准备

`.env` 中需配置（仓库根目录）：

```bash
# -------------- 智谱（LLM 免费模型 / 图片生成 / 视频生成）-----------------
ZHIPU_API_KEY=<智谱 API Key>
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
# ZHIPU_MODEL=glm-4.7-flash   # 可选：覆盖网关主模型（如遇高频限流可改 glm-4-flash）
```

可选兜底（智谱全挂时才会用，计费）：

```bash
DEEPSEEK_API_KEY=<DeepSeek Key>
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

---

## 三、任务模式一览

网关覆盖创作全链路 7 种任务，统一 CLI + 模块双用法：

| task | 环节 | temperature | 用途 |
|------|------|-------------|------|
| `plan` | 写前推理/编排 | 0.5 | 分镜规划：切镜头、定时间点、列内容要点、输出镜头序列 |
| `draft` | 正文生成 | 0.8 | 按单个镜头 prompt 生成 800-1500 字正文 |
| `outline` | 大纲/细纲 | 0.7 | 卷章大纲、章节细纲、时间轴对齐表 |
| `review` | 审校 | 0.3 | 全章审校：一致性 + 可读性 + 时代细节 |
| `verify` | 一致性核对 | 0.2 | 时间线/人称/角色行为/设定核对，输出问题清单 |
| `qa` | 去 AI 味质检 | 0.3 | 9 维度评分 + 问题定位 + 修改建议（对接 novel-humanizer） |
| `char` | 角色设定 | 0.6 | 角色档案、行为约束、关系网 |

---

## 四、标准工作流（每章）

镜头切换模式下的章节生产流水线，**每步都经网关**：

```
① plan      读前情/对齐表 → 输出本章镜头序列（2-4 个镜头，含时间点/人物/要点）
   ↓
② draft     ×N（每镜头一次调用）→ 各镜头 800-1500 字正文
   ↓
③ 拼接      手工/CodeBuddy 拼接：统一格式、补切点、清理标签、修时间意象
   ↓
④ verify    一致性核对：时间线、人称、角色行为、与族谱时间对齐
   ↓
⑤ qa        去 AI 味质检：白描克制、无直给抒情、时代细节自然
   ↓
⑥ review    全章审校 → 定稿
   ↓
⑦ 联动      更新 progress.json / 时间轴对齐表 / 修改记录 / 切片
```

### 第 ① 步：分镜规划（plan）

```bash
node scripts/llm-gateway.js --task plan --prompt-file /tmp/ch05_plan_prompt.md --out /tmp/ch05_plan.md
```

plan prompt 需包含：本章时间点、可用家族线（米/李/杨/何/于/社会关系）、族谱时间约束、前情摘要、镜头切换规范要点。

### 第 ② 步：分镜头生成（draft）

```bash
# 每镜头一个 prompt 文件，逐镜头调用（比一次生成整章稳定得多）
node scripts/llm-gateway.js --task draft --prompt-file /tmp/ch05_lens1_prompt.md --out /tmp/ch05_lens1.md
```

> **经验值**：`glm-4.7-flash`（30B 混合思考）正文质量达标；`glm-4-flash`（8B 级）正文不达标（性别错、要点罗列、直给抒情），**正文生成必须用 glm-4.7-flash**。

### 第 ④⑤⑥ 步：校验与审校

```bash
node scripts/llm-gateway.js --task verify --prompt-file /tmp/ch05_verify_prompt.md --out /tmp/ch05_verify.md
node scripts/llm-gateway.js --task qa     --prompt-file /tmp/ch05_qa_prompt.md     --out /tmp/ch05_qa.md
node scripts/llm-gateway.js --task review --prompt-file /tmp/ch05_review_prompt.md --out /tmp/ch05_review.md
```

---

## 五、429 限流处理（免费模型常态）

免费模型高峰 429 限流，网关已内置处理：

1. **内置退避重试**：429 后自动等待 2s / 4s / 8s 重试（共 3 次）
2. **自动降级**：仍失败 → 切备用免费模型 `glm-4-flash`（注意：正文质量会下降）
3. **外部循环重试**（推荐，保 glm-4.7-flash 质量）：

```bash
for round in 1 2 3 4 5 6; do
  ZHIPU_MODEL=glm-4.7-flash node scripts/llm-gateway.js --task draft \
    --prompt-file /tmp/ch05_lens1_prompt.md --out /tmp/ch05_lens1.md && break
  echo "round${round}_fail"; sleep 12
done
```

4. 若 `glm-4.7-flash` 持续限流，可在 `.env` 设 `ZHIPU_MODEL=glm-4-flash` 直接用备用模型（接受质量折损）。

---

## 六、模块用法（供脚本/服务器调用）

```js
const { callLLM } = require('../scripts/llm-gateway.js');

const text = await callLLM({
  task: 'verify',
  messages: [
    { role: 'system', content: '你是小说一致性校验员…' },
    { role: 'user', content: '…' },
  ],
});
```

网关自动加载仓库根 `.env`，部署到服务器时保持同一目录结构（`xujie-writer-agent/scripts/llm-gateway.js` + 根 `.env`）即可零改动复用。

---

## 七、与既有工作流衔接

- **写作工作流.md**：本工作流是「第三步 初稿生成」与「第四步 三轮自检」的执行引擎——所有 LLM 调用统一经网关，不再由 CodeBuddy 直接生成
- **镜头切换创作模式.md**：`plan` 输出即镜头序列；`draft` 单镜头调用遵循镜头切换写作规范
- **novel-humanizer / novel-review**：`qa` / `review` 任务可对接其评分维度与审稿视角
- **Coordinator-Agent**：服务器端意图解析/对话同样切到智谱免费优先（`src/intent/parser.js`、`reply.js`），DeepSeek 仅作兜底

---

## 八、验证命令（自检）

```bash
# 最小链路验证（免费）
node scripts/llm-gateway.js --task review --system "你是测试助手" --message "回复：网关链路正常"
# 语法检查
node --check scripts/llm-gateway.js
```
