/**
 * Xujie 适配器 — 人控对话式 Agent（S3 决策：选项 A 任务队列 + 人工确认）
 *
 * Xujie 是「人控 AI 辅助写作」对话式 Agent，无 CLI 入口、依赖 IDE/WebIDE 工作流。
 * 调度模式（选项 A）：
 *   1. execute(task)：任务**落盘** data/XujieWriter-data/tasks/pending/{taskId}.json
 *   2. 任务状态 → waiting（等待人工在 WebIDE 确认执行）
 *   3. 人工完成后通过 acknowledge() 回写状态（SUCCESS/FAILED）
 *
 * 落盘文件既是「待办队列」也是「执行凭证」，人工在 WebIDE 中读取后创作，
 * 完成后回写状态，实现 Coordinator ↔ 人工的任务闭环。
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, renameSync } from 'fs';
import { join } from 'path';
import { AGENT_ROOT } from './paths.js';

const TASKS_ROOT = join(AGENT_ROOT, 'data', 'XujieWriter-data', 'tasks');
const PENDING_DIR = join(TASKS_ROOT, 'pending');
const DONE_DIR = join(TASKS_ROOT, 'done');

/** 确保目录存在 */
function ensureDirs() {
  mkdirSync(PENDING_DIR, { recursive: true });
  mkdirSync(DONE_DIR, { recursive: true });
}

/**
 * 执行任务 — 落盘为待人工确认的任务文件
 * @param {object} task
 * @returns {Promise<{success: boolean, needsHuman: boolean, taskFile?: string, error?: string}>}
 */
export async function execute(task) {
  try {
    ensureDirs();
    const taskFile = join(PENDING_DIR, `${task.id}.json`);
    const record = {
      taskId: task.id,
      agentId: task.agentId,
      intent: task.intent,
      input: task.input,
      status: 'waiting',
      createdAt: task.createdAt || Date.now(),
    };
    writeFileSync(taskFile, JSON.stringify(record, null, 2));
    return {
      success: true,
      needsHuman: true,
      taskFile,
      message: `任务已落盘，等待人工在 WebIDE 确认执行（${taskFile}）`,
    };
  } catch (err) {
    return { success: false, error: `落盘失败: ${err.message}` };
  }
}

/**
 * 人工执行完成后回写状态
 * - 将 pending/{taskId}.json 更新结果并移动到 done/
 * @param {string} taskId
 * @param {{success: boolean, result?: object, error?: string}} outcome
 * @returns {{status: string, record: object}}
 */
export function acknowledge(taskId, outcome) {
  ensureDirs();
  const pendingFile = join(PENDING_DIR, `${taskId}.json`);
  if (!existsSync(pendingFile)) {
    throw new Error(`未找到待办任务文件: ${pendingFile}`);
  }
  const record = JSON.parse(readFileSync(pendingFile, 'utf-8'));
  record.status = outcome.success ? 'success' : 'failed';
  record.result = outcome.result || null;
  record.error = outcome.error || null;
  record.completedAt = Date.now();

  // 移动到 done/
  const doneFile = join(DONE_DIR, `${taskId}.json`);
  writeFileSync(doneFile, JSON.stringify(record, null, 2));
  renameSync(pendingFile, doneFile);

  return { status: record.status, record };
}
