/**
 * 意图解析引擎
 *
 * 四级 AI 降级链（2026-08-20 切换为智谱免费模型优先，零成本）：
 *   1. 智谱 GLM-4.7-Flash (主) — 免费，精确语义理解
 *   2. 智谱 GLM-4-Flash (备用) — 免费，限流降级
 *   3. DeepSeek (兜底) — 计费，仅智谱全挂时使用
 *   4. 关键词匹配 (最终兜底) — 离线可用
 *
 * 输入: "帮我写一首关于夏天的民谣歌曲"
 * 输出: { agentId: "lemong", params: { lyrics: "...", style: "民谣" }, confidence: 0.95 }
 */

import { listAgents } from '../agents/registry.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_BASE_URL = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const ZHIPU_PRIMARY_MODEL = process.env.ZHIPU_MODEL || 'glm-4.7-flash'; // 免费主模型
const ZHIPU_BACKUP_MODEL = 'glm-4-flash'; // 免费备用模型

/**
 * 构建意图解析 Prompt
 */
function buildIntentPrompt(userMessage) {
  const agents = listAgents('all');
  const agentDesc = agents
    .map(a => `- ${a.agentId}: ${a.description} (能力: ${a.capabilities.join(', ')})`)
    .join('\n');

  return `你是一个意图解析器，负责将用户的自然语言指令映射到可用的 Agent。

可用 Agent:
${agentDesc}

用户消息: "${userMessage}"

请以 JSON 格式返回（只返回 JSON，不要其他文字）:
{
  "agentId": "目标 Agent ID，如果无法确定则为 null",
  "params": { "提取的参数键值对" },
  "confidence": 0.0-1.0,
  "reasoning": "简短推理说明"
}`;
}

/**
 * 提取 LLM 响应中的 JSON
 */
function extractJson(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.agentId !== undefined) return parsed;
  }
  return null;
}

/**
 * 调用智谱免费模型 API（主引擎，零成本）
 * @param {string} userMessage - 用户消息
 * @param {string} model - 模型名（glm-4.7-flash 主 / glm-4-flash 备用）
 */
async function callZhipu(userMessage, model = ZHIPU_PRIMARY_MODEL) {
  const response = await fetch(`${ZHIPU_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个 JSON 意图解析器，只返回 JSON。' },
        { role: 'user', content: buildIntentPrompt(userMessage) },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  const data = await response.json();
  return extractJson(data.choices?.[0]?.message?.content || '');
}

/**
 * 调用 DeepSeek API（计费兜底，仅智谱全挂时使用）
 */
async function callDeepSeek(userMessage) {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个 JSON 意图解析器，只返回 JSON。' },
        { role: 'user', content: buildIntentPrompt(userMessage) },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  const data = await response.json();
  return extractJson(data.choices?.[0]?.message?.content || '');
}

/**
 * 解析用户意图
 *
 * 降级链: 智谱 GLM-4.7-Flash → 智谱 GLM-4-Flash → DeepSeek → 关键词匹配
 *
 * @param {string} userMessage - 用户自然语言消息
 * @returns {Promise<{agentId: string|null, params: Object, confidence: number, reasoning: string}>}
 */
export async function parseIntent(userMessage) {
  // 主引擎: 智谱免费模型（零成本）
  if (ZHIPU_API_KEY) {
    try {
      const result = await callZhipu(userMessage, ZHIPU_PRIMARY_MODEL);
      if (result) {
        console.log(`[IntentParser] 智谱 ${ZHIPU_PRIMARY_MODEL} 解析成功`);
        return result;
      }
    } catch (err) {
      console.warn(`[IntentParser] 智谱 ${ZHIPU_PRIMARY_MODEL} 调用失败:`, err.message);
    }

    // 备用引擎: 智谱 GLM-4-Flash（免费，限流降级）
    try {
      const result = await callZhipu(userMessage, ZHIPU_BACKUP_MODEL);
      if (result) {
        console.log('[IntentParser] 智谱 GLM-4-Flash (降级) 解析成功');
        return result;
      }
    } catch (err) {
      console.warn('[IntentParser] 智谱 GLM-4-Flash 调用失败:', err.message);
    }
  }

  // 兜底引擎: DeepSeek（计费，仅智谱全挂时使用）
  if (DEEPSEEK_API_KEY) {
    try {
      const result = await callDeepSeek(userMessage);
      if (result) {
        console.log('[IntentParser] DeepSeek (兜底) 解析成功');
        return result;
      }
    } catch (err) {
      console.warn('[IntentParser] DeepSeek 调用失败:', err.message);
    }
  }

  // 最终兜底: 关键词匹配
  console.log('[IntentParser] 使用关键词匹配（离线模式）');
  return fallbackParse(userMessage);
}

/**
 * 兜底：基于关键词的简单意图匹配（完全离线可用）
 */
function fallbackParse(message) {
  const lower = message.toLowerCase();

  // 简单关键词匹配
  if (/歌|音乐|写.*曲|创作.*乐|谱曲|作曲/.test(lower)) {
    return { agentId: 'lemong', params: { lyrics: message }, confidence: 0.6, reasoning: '关键词匹配：音乐创作' };
  }
  if (/MV|mv|视频|画面|配图|制作.*视频/.test(lower)) {
    return { agentId: 'erhu', params: {}, confidence: 0.6, reasoning: '关键词匹配：MV制作' };
  }
  if (/族谱|家族|家谱|辈分|亲戚/.test(lower)) {
    return { agentId: 'zhupu', params: { action: 'query' }, confidence: 0.6, reasoning: '关键词匹配：族谱管理' };
  }
  if (/写.*小说|小说|续写|章节|大纲|立意|人物|角色|世界观/.test(lower)) {
    return { agentId: 'xujie', params: { action: 'write_chapter' }, confidence: 0.6, reasoning: '关键词匹配：小说创作' };
  }

  return { agentId: null, params: {}, confidence: 0, reasoning: '无法识别意图' };
}
