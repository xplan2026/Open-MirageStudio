/**
 * Admin API — 管理员专属接口
 * 需要 Basic Auth 认证
 */

import { Router } from 'express';
import { listAgents, getAgentCard, checkAgentHealth } from '../agents/registry.js';
import { listTasks, getTask, cancelTask, retryTask } from '../state/task-state.js';
import { handleRequest, executeTask, acknowledgeTask } from '../coordinator.js';

export const adminRouter = Router();

// Dashboard 概览
adminRouter.get('/dashboard', (req, res) => {
  const agents = listAgents('all').map(a => ({
    ...a,
    health: checkAgentHealth(a.agentId),
  }));

  const tasks = listTasks();
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    running: tasks.filter(t => t.status === 'running').length,
    waiting: tasks.filter(t => t.status === 'waiting').length,
    success: tasks.filter(t => t.status === 'success').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  };

  res.json({ agents, taskStats, recentTasks: tasks.slice(-10).reverse() });
});

// Agent 管理
adminRouter.get('/agents', (req, res) => {
  const agents = listAgents('all').map(a => ({
    ...a,
    health: checkAgentHealth(a.agentId),
  }));
  res.json({ agents });
});

adminRouter.get('/agents/:agentId', (req, res) => {
  const card = getAgentCard(req.params.agentId);
  if (!card) return res.status(404).json({ error: 'Agent not found' });
  res.json({ agent: { ...card, health: checkAgentHealth(req.params.agentId) } });
});

// 任务管理
adminRouter.get('/tasks', (req, res) => {
  const { status, limit } = req.query;
  let tasks = listTasks(status || null);
  if (limit) tasks = tasks.slice(-parseInt(limit));
  res.json({ tasks: tasks.reverse() });
});

adminRouter.get('/tasks/:taskId', (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

// 创建任务（编排入口）
adminRouter.post('/tasks', async (req, res) => {
  try {
    const { message, agentId, input } = req.body;

    let result;
    if (agentId && input) {
      // 直接指定 Agent 和输入
      result = await handleRequest(JSON.stringify({ agentId, input }));
    } else if (message) {
      // 通过意图解析
      result = await handleRequest(message);
    } else {
      return res.status(400).json({ error: '缺少 message 或 agentId+input' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 执行任务
adminRouter.post('/tasks/:taskId/execute', async (req, res) => {
  try {
    const task = await executeTask(req.params.taskId);
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 取消任务
adminRouter.post('/tasks/:taskId/cancel', (req, res) => {
  try {
    const task = cancelTask(req.params.taskId);
    res.json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 重试任务
adminRouter.post('/tasks/:taskId/retry', (req, res) => {
  try {
    const task = retryTask(req.params.taskId);
    res.json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 人工确认回写（S3：Xujie 人控任务 — 人工在 WebIDE 完成后回写状态）
// body: { success: boolean, result?: object, error?: string }
adminRouter.post('/tasks/:taskId/acknowledge', async (req, res) => {
  try {
    const { success, result, error } = req.body || {};
    if (typeof success !== 'boolean') {
      return res.status(400).json({ error: '缺少 success 布尔字段' });
    }
    const task = await acknowledgeTask(req.params.taskId, { success, result, error });
    res.json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 健康检查
adminRouter.get('/health', (req, res) => {
  const agents = listAgents('all');
  const health = agents.map(a => ({
    agentId: a.agentId,
    name: a.name,
    listed: a.status,
    runtime: checkAgentHealth(a.agentId),
  }));
  res.json({ coordinator: 'online', agents: health });
});
