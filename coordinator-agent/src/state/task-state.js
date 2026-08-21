/**
 * 任务状态机
 *
 * 状态流转:
 *   pending → running → success
 *                    → failed → (手动 retry) → running
 *                    → cancelled
 *                    → waiting → success / failed   (人控任务：等待人工确认后回写)
 */

/** 允许的状态 */
export const TASK_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING: 'waiting', // 等待人工确认（Xujie 人控对话式 Agent）
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/** 状态跳转规则 */
const VALID_TRANSITIONS = {
  [TASK_STATES.PENDING]: [TASK_STATES.RUNNING, TASK_STATES.CANCELLED],
  [TASK_STATES.RUNNING]: [TASK_STATES.SUCCESS, TASK_STATES.FAILED, TASK_STATES.CANCELLED, TASK_STATES.WAITING],
  [TASK_STATES.WAITING]: [TASK_STATES.SUCCESS, TASK_STATES.FAILED, TASK_STATES.CANCELLED], // 人工回写
  [TASK_STATES.FAILED]: [TASK_STATES.RUNNING], // 手动 retry
  [TASK_STATES.SUCCESS]: [], // 终态
  [TASK_STATES.CANCELLED]: [], // 终态
};

/** 任务存储（内存，后续可换 SQLite） */
const tasks = new Map();
let taskIdCounter = 0;

/**
 * 创建任务
 * @param {Object} params
 * @param {string} params.agentId - 目标 Agent
 * @param {string} params.intent - 用户意图原文
 * @param {Object} params.input - 传递给 Agent 的输入
 * @returns {Object} 任务对象
 */
export function createTask({ agentId, intent, input }) {
  const id = `task_${Date.now()}_${++taskIdCounter}`;
  const task = {
    id,
    agentId,
    intent,
    input,
    status: TASK_STATES.PENDING,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
    retries: 0,
  };
  tasks.set(id, task);
  return task;
}

/**
 * 获取任务
 */
export function getTask(taskId) {
  return tasks.get(taskId) || null;
}

/**
 * 列出所有任务
 */
export function listTasks(filter) {
  const all = Array.from(tasks.values());
  if (!filter) return all;
  return all.filter(t => t.status === filter);
}

/**
 * 更新任务状态
 */
export function updateTaskStatus(taskId, newStatus, extra = {}) {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const allowed = VALID_TRANSITIONS[task.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${task.status} → ${newStatus}. Allowed: ${allowed.join(', ')}`
    );
  }

  const now = Date.now();
  task.status = newStatus;
  task.updatedAt = now;

  if (newStatus === TASK_STATES.RUNNING && !task.startedAt) {
    task.startedAt = now;
  }
  if (newStatus === TASK_STATES.SUCCESS || newStatus === TASK_STATES.FAILED) {
    task.completedAt = now;
  }

  Object.assign(task, extra);
  return task;
}

/**
 * 取消任务
 */
export function cancelTask(taskId) {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status === TASK_STATES.SUCCESS || task.status === TASK_STATES.CANCELLED) {
    throw new Error(`Cannot cancel task in status: ${task.status}`);
  }
  return updateTaskStatus(taskId, TASK_STATES.CANCELLED);
}

/**
 * 重试失败的任务
 */
export function retryTask(taskId) {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status !== TASK_STATES.FAILED) {
    throw new Error(`Can only retry failed tasks, current: ${task.status}`);
  }
  task.retries++;
  return updateTaskStatus(taskId, TASK_STATES.RUNNING);
}
