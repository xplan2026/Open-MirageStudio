/**
 * 对外 A2A 兼容接口 — Google A2A 协议适配
 *
 * 将 Coordinator 内部数据映射为 Google A2A 协议格式：
 * - Agent Card → /.well-known/agent.json
 * - Task 操作 → /.well-known/a2a/tasks
 *
 * 参考: https://developers.google.com/a2a
 */

import { Router } from 'express';
import { listAgents, getAgentCard } from '../agents/registry.js';
import { createTask, getTask, listTasks, TASK_STATES } from '../state/task-state.js';

export const externalRouter = Router();

// Agent Card 发现
externalRouter.get('/.well-known/agent.json', (req, res) => {
  const agents = listAgents('online').map(a => ({
    agent_id: a.agentId,
    name: a.name,
    description: a.description,
    capabilities: a.capabilities,
    url: `/a2a/agent/${a.agentId}`,
  }));

  res.json({
    name: 'Mirage Studio Coordinator',
    description: 'AI 音乐创作、MV 制作、族谱管理统一调度平台',
    agents,
  });
});

// 单个 Agent Card
externalRouter.get('/agent/:agentId', (req, res) => {
  const card = getAgentCard(req.params.agentId);
  if (!card) return res.status(404).json({ error: 'Agent not found' });

  res.json({
    agent_id: card.agentId,
    name: card.name,
    description: card.description,
    capabilities: card.capabilities,
    input_schema: card.inputSchema,
    output_schema: card.outputSchema,
  });
});

// 创建外部任务（A2A 格式）
externalRouter.post('/tasks', async (req, res) => {
  try {
    const { agent_id, input, metadata } = req.body;

    const card = getAgentCard(agent_id);
    if (!card) return res.status(404).json({ error: `Agent not found: ${agent_id}` });

    const task = createTask({
      agentId: agent_id,
      intent: metadata?.intent || 'external_a2a',
      input: input || {},
    });

    const a2aTask = toA2ATaskFormat(task);
    res.status(202).json(a2aTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查询任务状态（A2A 格式）
externalRouter.get('/tasks/:taskId', (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  res.json(toA2ATaskFormat(task));
});

/**
 * 将内部 Task 对象转换为 Google A2A 格式
 */
function toA2ATaskFormat(task) {
  return {
    id: task.id,
    context_id: task.agentId,
    status: {
      state: task.status,
      timestamp: new Date(task.updatedAt).toISOString(),
    },
    artifacts: task.result ? [task.result] : [],
    error: task.error ? { message: task.error } : undefined,
  };
}
