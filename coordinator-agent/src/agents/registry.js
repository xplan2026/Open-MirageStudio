/**
 * Agent 注册表
 *
 * 管理所有已接入 Agent 的生命周期：
 * - 注册 / 注销
 * - 健康检查
 * - 能力查询
 */

import { AGENT_CARDS, getAgentCard } from './agent-card.js';

/** Agent 运行时状态 */
const agentStatus = new Map();

/**
 * 初始化注册表
 */
export async function initRegistry() {
  for (const card of AGENT_CARDS) {
    agentStatus.set(card.agentId, {
      agentId: card.agentId,
      name: card.name,
      status: card.status,
      lastHeartbeat: Date.now(),
      taskCount: 0,
      errorCount: 0,
    });
  }
  console.log(`[Registry] 注册 ${AGENT_CARDS.length} 个 Agent`);
}

/**
 * 获取所有 Agent 列表（含状态）
 * @param {'all'|'online'|'offline'} [filter]
 */
export function listAgents(filter = 'all') {
  const agents = AGENT_CARDS.map(card => ({
    ...card,
    runtime: agentStatus.get(card.agentId),
  }));

  if (filter === 'online') return agents.filter(a => a.runtime?.status === 'online');
  if (filter === 'offline') return agents.filter(a => a.runtime?.status !== 'online');
  return agents;
}

/**
 * 按能力查找 Agent
 * @param {string} capability
 * @returns {Array}
 */
export function findAgentsByCapability(capability) {
  return AGENT_CARDS.filter(a => a.capabilities.includes(capability));
}

/**
 * 更新 Agent 运行状态
 * @param {string} agentId
 * @param {Partial} update
 */
export function updateAgentStatus(agentId, update) {
  const current = agentStatus.get(agentId);
  if (current) {
    Object.assign(current, { ...update, lastHeartbeat: Date.now() });
  }
}

/**
 * 检查 Agent 健康状态
 * @param {string} agentId
 * @returns {'online'|'offline'|'unknown'}
 */
export function checkAgentHealth(agentId) {
  const status = agentStatus.get(agentId);
  if (!status) return 'unknown';

  // 超过 5 分钟没有心跳视为 offline
  const heartbeatAge = Date.now() - status.lastHeartbeat;
  if (heartbeatAge > 5 * 60 * 1000) {
    status.status = 'offline';
  }
  return status.status;
}

export { getAgentCard };
