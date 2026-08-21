#!/usr/bin/env node
/**
 * Xujie Writer Agent — 小说创作 LLM 网关
 *
 * 把消耗型创作任务（正文生成 / 审校 / 大纲 / 角色设定）从 CodeBuddy 迁移到
 * 第三方 LLM API，显著降低 CodeBuddy Credits 消耗。
 *
 * 降级链（按优先级）:
 *   1. 智谱 GLM-4.7-Flash   (主, 永久免费, 200K 上下文, 混合思考)
 *   2. 智谱 GLM-4-Flash     (备用, 免费, 128K 上下文)
 *   3. DeepSeek chat        (兜底, 计费)
 *
 * 环境变量（从 .env 自动加载）:
 *   ZHIPU_API_KEY    智谱开放平台 Key（https://open.bigmodel.cn）
 *   ZHIPU_BASE_URL   默认 https://open.bigmodel.cn/api/paas/v4
 *   DEEPSEEK_API_KEY DeepSeek Key（仅兜底时需要）
 *   DEEPSEEK_BASE_URL 默认 https://api.deepseek.com/v1
 *
 * CLI 用法:
 *   node llm-gateway.js --task draft --prompt-file prompt.md [--out draft.md]
 *   cat prompt.md | node llm-gateway.js --task draft
 *   node llm-gateway.js --task draft --message "直接传提示词"
 *
 * 模块用法:
 *   const { callLLM } = require('./llm-gateway.js');
 *   const text = await callLLM({ task: 'draft', messages: [{role, content}] });
 *
 * task 说明（覆盖 Xujie-Writer 全环节，均走智谱免费模型）:
 *   draft   正文生成（temperature 0.8，允许创作发挥）
 *   outline 大纲/细纲（temperature 0.7）
 *   plan    分镜规划/编排分析（temperature 0.5，写前推理：切镜头、定时间、列要点）
 *   review  审校/一致性校验（temperature 0.3，追求严谨）
 *   verify  时间线/人称/行为一致性核对（temperature 0.2，最严谨，输出问题清单）
 *   qa      去 AI 味质检（temperature 0.3，9 维度评分 + 修改建议）
 *   char    角色设定（temperature 0.6）
 *
 * 说明：写前推理/编排（plan）、写后校验（verify/qa）与正文生成（draft）一样，
 * 全部经本网关调用智谱免费模型（glm-4.7-flash 主 / glm-4-flash 备用），
 * 彻底替代 CodeBuddy 自耗 Credits 与服务器端 DeepSeek 计费调用。
 */

const fs = require('fs');
const path = require('path');

// ============ .env 轻量加载（避免依赖 dotenv） ============
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

// ============ 配置 ============
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';
const ZHIPU_BASE_URL = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const ZHIPU_MODEL_PRIMARY = process.env.ZHIPU_MODEL || 'glm-4.7-flash';
const ZHIPU_MODEL_FALLBACK = 'glm-4-flash';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';

const REQUEST_TIMEOUT_MS = 120000; // 长文生成需要更久
const MAX_TOKENS = 8000;           // 单章正文约 4000-6000 字，留足余量
const RETRY_429_MS = [2000, 4000, 8000]; // 免费模型限流(429)退避重试间隔

// ============ 任务参数 ============
const TASK_CONFIG = {
  draft:   { temperature: 0.8, max_tokens: 8000, desc: '正文生成' },
  outline: { temperature: 0.7, max_tokens: 4000, desc: '大纲/细纲' },
  plan:    { temperature: 0.5, max_tokens: 3000, desc: '分镜规划/编排' },
  review:  { temperature: 0.3, max_tokens: 3000, desc: '审校/校验' },
  verify:  { temperature: 0.2, max_tokens: 3000, desc: '一致性核对' },
  qa:      { temperature: 0.3, max_tokens: 3000, desc: '去AI味质检' },
  char:    { temperature: 0.6, max_tokens: 3000, desc: '角色设定' },
};

/**
 * 调用单个供应商的 chat/completions，带超时保护与 429 退避重试
 * @returns {Promise<string>} 模型回复文本
 */
async function callProvider({ baseUrl, apiKey, model, messages, temperature, maxTokens }) {
  if (!apiKey) throw new Error(`缺少 API Key（${model}）`);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_429_MS.length; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
        signal: controller.signal,
      });
      if (response.status === 429 && attempt < RETRY_429_MS.length) {
        const wait = RETRY_429_MS[attempt];
        console.error(`[llm-gateway] ~ ${model} 限流(429)，${wait / 1000}s 后重试(${attempt + 1}/${RETRY_429_MS.length})`);
        clearTimeout(timer);
        await sleep(wait);
        continue;
      }
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`${model} HTTP ${response.status}: ${detail.slice(0, 200)}`);
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error(`${model} 返回空内容`);
      return content;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error(`${model} 重试后仍失败`);
}

/**
 * 主入口：按降级链调用，返回首个成功的模型回复
 * @param {object} opts
 * @param {string} opts.task - draft|outline|review|char
 * @param {Array}  opts.messages - [{role, content}]
 * @param {object} [opts.options] - 覆盖 temperature / max_tokens
 */
async function callLLM({ task = 'draft', messages, options = {} }) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages 不能为空');
  }
  const cfg = { ...TASK_CONFIG[task] || TASK_CONFIG.draft, ...options };
  const errors = [];

  // 1) 智谱主模型（免费）
  if (ZHIPU_API_KEY) {
    try {
      const text = await callProvider({
        baseUrl: ZHIPU_BASE_URL,
        apiKey: ZHIPU_API_KEY,
        model: ZHIPU_MODEL_PRIMARY,
        messages,
        temperature: cfg.temperature,
        maxTokens: cfg.max_tokens,
      });
      console.error(`[llm-gateway] ✓ 主引擎 智谱 ${ZHIPU_MODEL_PRIMARY} (${cfg.desc})`);
      return text;
    } catch (err) {
      errors.push(`智谱 ${ZHIPU_MODEL_PRIMARY}: ${err.message}`);
      console.error(`[llm-gateway] ! 主引擎失败: ${err.message}`);
    }
  }

  // 2) 智谱备用免费模型
  if (ZHIPU_API_KEY && ZHIPU_MODEL_FALLBACK !== ZHIPU_MODEL_PRIMARY) {
    try {
      const text = await callProvider({
        baseUrl: ZHIPU_BASE_URL,
        apiKey: ZHIPU_API_KEY,
        model: ZHIPU_MODEL_FALLBACK,
        messages,
        temperature: cfg.temperature,
        maxTokens: cfg.max_tokens,
      });
      console.error(`[llm-gateway] ✓ 备用引擎 智谱 ${ZHIPU_MODEL_FALLBACK} (${cfg.desc})`);
      return text;
    } catch (err) {
      errors.push(`智谱 ${ZHIPU_MODEL_FALLBACK}: ${err.message}`);
      console.error(`[llm-gateway] ! 备用引擎失败: ${err.message}`);
    }
  }

  // 3) DeepSeek 兜底（计费）
  if (DEEPSEEK_API_KEY) {
    try {
      const text = await callProvider({
        baseUrl: DEEPSEEK_BASE_URL,
        apiKey: DEEPSEEK_API_KEY,
        model: DEEPSEEK_MODEL,
        messages,
        temperature: cfg.temperature,
        maxTokens: cfg.max_tokens,
      });
      console.error(`[llm-gateway] ✓ 兜底引擎 DeepSeek (${cfg.desc})`);
      return text;
    } catch (err) {
      errors.push(`DeepSeek: ${err.message}`);
      console.error(`[llm-gateway] ! 兜底引擎失败: ${err.message}`);
    }
  }

  throw new Error(`全部引擎失败。请检查 .env 中 ZHIPU_API_KEY 配置。\n  ${errors.join('\n  ')}`);
}

// ============ CLI ============
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--task') args.task = argv[++i];
    else if (a === '--prompt-file') args.promptFile = argv[++i];
    else if (a === '--message') args.message = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--system') args.system = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || Object.keys(args).length === 0) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 40).join('\n'));
    console.log('\n参数: --task <draft|outline|plan|review|verify|qa|char> --prompt-file <文件> | --message <文本> [--system <提示>] [--out <文件>]');
    process.exit(args.help ? 0 : 1);
  }

  // 读取用户提示
  let userContent;
  if (args.promptFile) {
    userContent = fs.readFileSync(path.resolve(args.promptFile), 'utf8');
  } else if (args.message) {
    userContent = args.message;
  } else if (!process.stdin.isTTY) {
    userContent = fs.readFileSync(0, 'utf8');
  }
  if (!userContent || !userContent.trim()) {
    console.error('[llm-gateway] 错误: 请通过 --prompt-file / --message / stdin 提供提示词');
    process.exit(1);
  }

  const messages = [];
  if (args.system) messages.push({ role: 'system', content: args.system });
  messages.push({ role: 'user', content: userContent });

  try {
    const text = await callLLM({ task: args.task || 'draft', messages });
    if (args.out) {
      fs.writeFileSync(path.resolve(args.out), text + '\n');
      console.error(`[llm-gateway] 已写入: ${args.out}`);
    } else {
      process.stdout.write(text + '\n');
    }
  } catch (err) {
    console.error(`[llm-gateway] ✗ ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[llm-gateway] 未捕获异常:', err);
    process.exit(1);
  });
}

module.exports = { callLLM, TASK_CONFIG };
