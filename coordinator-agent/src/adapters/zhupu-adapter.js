/**
 * Zhupu Agent 适配器
 *
 * 通过 CLI 调用 zhupu-manager-agent/zhupu-manager-agent（bash 脚本，非 node 脚本）
 *
 * CLI 实际用法（见 zhupu-manager-agent/AGENTS.md）:
 *   query <家族名> / tree <家族名> / stats <家族名> / export <家族名>
 *   list                        # 无家族名
 *
 * S2 修复: 相对路径 → AGENT_ROOT 绝对路径；node 前缀 → bash 直接执行；
 *          家族名改为位置参数（非 --family）。
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

const ZHUPU_CLI = cliPath('zhupu');

/** 支持的动作（映射到 CLI 子命令） */
const ACTION_MAP = {
  query: 'query',
  tree: 'tree',
  stats: 'stats',
  export: 'export',
  list: 'list',
};

/**
 * 执行 Zhupu 任务
 * @param {Object} task - 任务对象
 * @param {Object} [task.input] - 输入参数
 * @param {string} [task.input.action] - query/tree/stats/export/list（默认 query）
 * @param {string} [task.input.family] - 家族名（位置参数）
 * @returns {Promise<Object>}
 */
export async function execute(task) {
  const { input = {} } = task;
  const action = ACTION_MAP[input.action] || 'query';
  const family = (input.family || '').trim();

  let args;
  if (family) {
    args = [action, family];
  } else if (action === 'list') {
    args = ['list'];
  } else {
    // query/tree/stats/export 无家族名 → 降级为 list（列出全部家族）
    args = ['list'];
  }

  console.log(`[ZhupuAdapter] 执行: bash ${ZHUPU_CLI} ${args.join(' ')}`);

  try {
    const { stdout, stderr } = await execFileAsync('bash', [ZHUPU_CLI, ...args], {
      timeout: 60000, // 1 分钟
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
