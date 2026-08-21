/**
 * 内部 A2A API — JSON-RPC 协议
 * 仅允许 localhost 访问
 */

import { Router } from 'express';
import { listAgents, getAgentCard, updateAgentStatus } from '../agents/registry.js';
import { handleRequest, executeTask, acknowledgeTask } from '../coordinator.js';
import { getTask, listTasks, cancelTask, retryTask } from '../state/task-state.js';

export const internalRouter = Router();

// agent.list — 获取注册 Agent 列表
internalRouter.post('/agent.list', (req, res) => {
  const filter = req.body?.filter || 'all';
  res.json({ agents: listAgents(filter) });
});

// agent.card — 获取单个 Agent Card
internalRouter.post('/agent.card', (req, res) => {
  const { agentId } = req.body;
  const card = getAgentCard(agentId);
  if (!card) return res.status(404).json({ error: `Agent not found: ${agentId}` });
  res.json({ card });
});

// agent.heartbeat — Agent 心跳上报
internalRouter.post('/agent.heartbeat', (req, res) => {
  const { agentId, status } = req.body;
  updateAgentStatus(agentId, { status: status || 'online' });
  res.json({ ok: true });
});

// task.create — 创建编排任务（意图解析 + 任务创建）
internalRouter.post('/task.create', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: '缺少 message 参数' });

    const result = await handleRequest(message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// task.status — 查询任务状态
internalRouter.post('/task.status', (req, res) => {
  const { taskId } = req.body;
  const task = getTask(taskId);
  if (!task) return res.status(404).json({ error: `Task not found: ${taskId}` });
  res.json({ task });
});

// task.cancel — 取消任务
internalRouter.post('/task.cancel', (req, res) => {
  try {
    const { taskId } = req.body;
    const task = cancelTask(taskId);
    res.json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// task.retry — 重试失败任务
internalRouter.post('/task.retry', (req, res) => {
  try {
    const { taskId } = req.body;
    const task = retryTask(taskId);
    res.json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// task.list — 列出所有任务
internalRouter.post('/task.list', (req, res) => {
  const { filter } = req.body;
  res.json({ tasks: listTasks(filter) });
});

// task.execute — 执行任务（调度到适配器）
internalRouter.post('/task.execute', async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await executeTask(taskId);
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// task.acknowledge — 人工确认回写（S3：Xujie 人控任务）
// body: { taskId, success, result?, error? }
internalRouter.post('/task.acknowledge', async (req, res) => {
  try {
    const { taskId, success, result, error } = req.body;
    if (!taskId) return res.status(400).json({ error: '缺少 taskId 参数' });
    if (typeof success !== 'boolean') {
      return res.status(400).json({ error: '缺少 success 布尔字段' });
    }
    const task = await acknowledgeTask(taskId, { success, result, error });
    res.json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
