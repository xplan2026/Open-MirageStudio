/**
 * Coordinator 核心 — 请求分发与任务编排
 */

import { parseIntent } from './intent/parser.js';
import { getAgentCard } from './agents/registry.js';
import { createTask, updateTaskStatus, getTask, TASK_STATES } from './state/task-state.js';
import { getAdapter } from './adapters/index.js';

/**
 * 处理用户请求（同步：解析意图 → 创建任务）
 * @param {string} userMessage - 用户消息
 * @returns {Promise<Object>} { task, intent }
 */
export async function handleRequest(userMessage) {
  // 1. 意图解析
  const intent = await parseIntent(userMessage);

  if (!intent.agentId || intent.confidence < 0.3) {
    return {
      error: true,
      message: '无法识别您的意图，请尝试更明确的描述。',
      intent,
    };
  }

  // 2. 验证 Agent 可用
  const card = getAgentCard(intent.agentId);
  if (!card) {
    return {
      error: true,
      message: `Agent "${intent.agentId}" 未注册。`,
      intent,
    };
  }

  if (card.status !== 'online') {
    return {
      error: true,
      message: `Agent "${card.name}" 当前不可用 (状态: ${card.status})。`,
      intent,
    };
  }

  // 3. 创建任务
  const task = createTask({
    agentId: intent.agentId,
    intent: userMessage,
    input: intent.params,
  });

  // 4. 标记为运行中（异步执行由适配器处理）
  updateTaskStatus(task.id, TASK_STATES.RUNNING);

  return {
    error: false,
    task: { id: task.id, agentId: task.agentId, status: task.status },
    agent: { id: card.agentId, name: card.name },
    intent,
  };
}

/**
 * 执行任务（分发到对应适配器真实执行 — Phase 3 完成，移除模拟）
 * @param {string} taskId
 */
export async function executeTask(taskId) {
  const task = getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const card = getAgentCard(task.agentId);
  if (!card) throw new Error(`Agent not found: ${task.agentId}`);

  console.log(`[Coordinator] 执行任务: ${taskId} → ${card.name} (${task.agentId})`);

  // pending 任务先置为运行中，保证状态机合法流转（PENDING → RUNNING → SUCCESS/FAILED）
  if (task.status === TASK_STATES.PENDING) {
    updateTaskStatus(taskId, TASK_STATES.RUNNING);
  }

  // 分发到适配器
  const adapter = getAdapter(task.agentId);
  if (!adapter) {
    const msg =
      task.agentId === 'xujie'
        ? 'Agent "xujie" 尚无适配器（人控对话式 Agent，调度模式待 S3 定义，见 TODO-调度链路.md）'
        : `Agent "${task.agentId}" 无对应适配器`;
    updateTaskStatus(taskId, TASK_STATES.FAILED, { error: msg });
    return getTask(taskId);
  }

  try {
    const result = await adapter.execute(task);
    if (result && result.success) {
      if (result.needsHuman) {
        // 人控任务（如 Xujie）：落盘成功 → 等待人工确认
        updateTaskStatus(taskId, TASK_STATES.WAITING, { result });
      } else {
        updateTaskStatus(taskId, TASK_STATES.SUCCESS, { result });
      }
    } else {
      updateTaskStatus(taskId, TASK_STATES.FAILED, {
        error: result?.error || '适配器执行失败',
        stdout: result?.stdout || null,
        stderr: result?.stderr || null,
      });
    }
  } catch (err) {
    updateTaskStatus(taskId, TASK_STATES.FAILED, { error: err.message });
  }

  return getTask(taskId);
}

/**
 * 人工确认回写（S3：Xujie 人控任务）
 * 人工在 WebIDE 完成创作后，将任务从 WAITING 回写为 SUCCESS/FAILED
 * @param {string} taskId
 * @param {{success: boolean, result?: object, error?: string}} outcome
 */
export async function acknowledgeTask(taskId, outcome) {
  const task = getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  if (task.status !== TASK_STATES.WAITING) {
    throw new Error(`任务 ${taskId} 当前状态为 ${task.status}，仅 WAITING 状态可人工回写`);
  }

  const adapter = getAdapter(task.agentId);
  if (!adapter?.acknowledge) {
    throw new Error(`Agent "${task.agentId}" 不支持人工回写`);
  }

  const ack = adapter.acknowledge(taskId, outcome); // 落盘移动 pending → done
  updateTaskStatus(taskId, outcome.success ? TASK_STATES.SUCCESS : TASK_STATES.FAILED, {
    result: outcome.result || null,
    error: outcome.error || null,
    acknowledge: ack,
  });
  return getTask(taskId);
}
