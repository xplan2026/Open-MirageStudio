/**
 * Erhu Agent 适配器
 *
 * 通过 CLI 调用 erhu-agent/erhu-agent（bash 脚本，非 node 脚本）
 * 依赖: Lemong 先完成歌曲生成
 *
 * CLI 实际用法（见 erhu-agent/AGENTS.md）:
 *   produce <作品名> [--dry-run]    # 全流程制作（compose → visualize → render）
 *   compose / visualize / render <作品名> [--dry-run]
 *
 * S2 修复: 相对路径 → AGENT_ROOT 绝对路径；node 前缀 → bash 直接执行；
 *          参数格式对齐真实 CLI（作品名位置参数，非 --song/--plan）。
 */

import { execFile } from 'child_process';
import { cliPath } from './paths.js';

/**
 * execFile 的 Promise 包装（保留失败时的 stdout/stderr —
 * promisify 在非 0 退出时 error 对象不含 stdout，而 CLI 错误信息多输出到 stdout）
 */
function execFileAsync(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        reject(Object.assign(err, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

const ERHU_CLI = cliPath('erhu');

/**
 * 执行 Erhu 任务
 * @param {Object} task - 任务对象
 * @param {Object} [task.input] - 输入参数
 * @param {string} [task.input.workName] - 作品名（优先）
 * @param {string} [task.input.song] - 兼容旧字段：歌曲/作品名
 * @param {boolean} [task.input.dryRun] - 是否 dry-run（默认 false，生产为真实制作）
 * @returns {Promise<Object>}
 */
export async function execute(task) {
  const { input = {} } = task;
  const workName = input.workName || input.song || '';

  const args = ['produce'];
  if (workName) args.push(workName);
  if (input.dryRun) args.push('--dry-run');

  console.log(`[ErhuAdapter] 执行: bash ${ERHU_CLI} ${args.join(' ')}`);

  try {
    const { stdout, stderr } = await execFileAsync('bash', [ERHU_CLI, ...args], {
      timeout: 1200000, // 20 分钟超时（MV 制作较慢）
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      success: true,
      output: stdout,
      stderr,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
    };
  }
}
