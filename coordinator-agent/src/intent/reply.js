/**
 * AI 对话回复生成器
 *
 * 让工作台「AI 对话」具备真正的 LLM 推理 / 理解能力：
 *  - 意图匹配成功时：LLM 生成「理解确认 + 任务计划」的个性化回复
 *  - 意图未匹配时：作为自由对话，LLM 直接回答用户（闲聊、提问均可）
 *  - 降级链: 智谱 GLM-4.7-Flash (主,免费) → 智谱 GLM-4-Flash (备用,免费) → DeepSeek (兜底,计费) → 硬编码兜底
 *
 * 与 parser.js 的区别：
 *  - parser.js 只输出 JSON（意图分类），temperature 0.1
 *  - 本模块输出自然语言（对话回复），temperature 0.7，带超时保护
 */

import { listAgents } from '../agents/registry.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_BASE_URL = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const ZHIPU_PRIMARY_MODEL = process.env.ZHIPU_MODEL || 'glm-4.7-flash'; // 免费主模型
const ZHIPU_BACKUP_MODEL = 'glm-4-flash'; // 免费备用模型

const REQUEST_TIMEOUT_MS = 10000;

/**
 * 构建 system prompt —— 设定「大副」角色
 */
function buildSystemPrompt() {
  return `你是「大副」，Mirage-Studio 独立自媒体 IP 工作室的 AI 助手与统一调度员。

工作室以长篇连载小说《幻觉》为基石，通过多个 AI Agent 协作生产跨媒介内容。你可以调度的 Agent：
- xujie（Xujie Writer）：小说《幻觉》创作（章节、大纲、角色、世界观）
- lemong（Lemong）：AI 音乐创作（写歌、歌词、谱曲）
- erhu（二虎/Erhu）：AI 数字人歌手 MV 制作
- zhupu（Zhupu）：小说家族族谱管理（角色、辈分、家族关系）

你的职责：
1. 理解用户的创作意图与指令，将其调度给合适的 Agent；
2. 当用户闲聊或提问（与创作无关）时，直接给出有推理、有见地的回答；
3. 当已确认任务交由某 Agent 执行时，向用户清晰说明你理解了什么、接下来会做什么。

回复要求：使用简体中文，语气友好、专业、简洁，一般不超过 150 字，不要使用 Markdown 标题。`;
}

/**
 * 构建 user prompt —— 区分「自由对话」与「任务确认」两种场景
 */
function buildUserPrompt(message, intent) {
  if (intent && intent.agentId) {
    const card = listAgents('all').find((a) => a.agentId === intent.agentId);
    const agentDesc = card
      ? `${card.agentId}（${card.name || card.agentId}）：${card.description || 'Agent'}`
      : intent.agentId;
    return `用户指令: "${message}"

意图解析结果:
- 目标 Agent: ${agentDesc}
- 置信度: ${intent.confidence ?? 0}
- 参数: ${JSON.stringify(intent.params ?? {})}

请向用户回复一段话：确认你已经理解该指令，说明将由哪个 Agent 执行、大致会做什么，并给出下一步提示。要求自然、有温度，不要罗列 JSON。`;
  }
  // 自由对话：无匹配意图
  return `用户消息: "${message}"

这是一条与创作指令无关的对话消息（或意图无法确定）。请以「大副」的身份直接、自然、有推理地回答用户。若用户的问题与工作室创作相关，可以主动引导；若纯属闲聊/提问，直接给出有价值的回答即可。`;
}

/**
 * 调用单个 LLM 供应商，带超时保护
 */
async function callLLM({ baseUrl, apiKey, model, messages }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('LLM 返回空内容');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 生成对话回复
 *
 * @param {string} message - 用户消息
 * @param {object} [intent] - parseIntent 的结果（可选；缺失或 agentId 为 null 时走自由对话）
 * @returns {Promise<string>} 自然语言回复（永不抛异常，失败返回兜底文案）
 */
export async function generateChatReply(message, intent) {
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(message, intent) },
  ];

  // 主引擎: 智谱免费模型（零成本）
  if (ZHIPU_API_KEY) {
    try {
      return await callLLM({
        baseUrl: ZHIPU_BASE_URL,
        apiKey: ZHIPU_API_KEY,
        model: ZHIPU_PRIMARY_MODEL,
        messages,
      });
    } catch (err) {
      console.warn(`[ChatReply] 智谱 ${ZHIPU_PRIMARY_MODEL} 回复生成失败:`, err.message);
    }

    // 备用引擎: 智谱 GLM-4-Flash（免费，限流降级）
    try {
      return await callLLM({
        baseUrl: ZHIPU_BASE_URL,
        apiKey: ZHIPU_API_KEY,
        model: ZHIPU_BACKUP_MODEL,
        messages,
      });
    } catch (err) {
      console.warn('[ChatReply] 智谱 GLM-4-Flash 回复生成失败:', err.message);
    }
  }

  // 兜底引擎: DeepSeek（计费，仅智谱全挂时使用）
  if (DEEPSEEK_API_KEY) {
    try {
      return await callLLM({
        baseUrl: DEEPSEEK_BASE_URL,
        apiKey: DEEPSEEK_API_KEY,
        model: 'deepseek-chat',
        messages,
      });
    } catch (err) {
      console.warn('[ChatReply] DeepSeek 回复生成失败:', err.message);
    }
  }

  // 最终兜底：硬编码文案
  return fallbackReply(message, intent);
}

/**
 * 兜底回复
 */
function fallbackReply(message, intent) {
  if (intent && intent.agentId) {
    const card = listAgents('all').find((a) => a.agentId === intent.agentId);
    return `已收到您的指令。我将把它交由「${card?.name || intent.agentId}」处理，任务执行完成后可在对应 Agent 页面查看产物。`;
  }
  return `我暂时没有识别到与创作相关的指令。你可以让我：写《幻觉》小说章节、创作歌曲、制作 MV、管理族谱，或者直接和我聊聊。`;
}
