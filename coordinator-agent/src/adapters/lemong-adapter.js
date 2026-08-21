/**
 * Lemong Agent 适配器
 *
 * 通过 CLI 调用 lemong-agent/lemong-agent（bash 脚本，非 node 脚本）
 * 输入: 歌词 + 风格参数（或主题生成歌词）
 * 输出: 歌曲文件路径 + 元数据
 *
 * CLI 实际用法（见 lemong-agent/AGENTS.md）:
 *   generate --style <风格> --lyrics <歌词> --title <歌名>
 *   lyrics   --theme <主题>                # 仅生成歌词
 *
 * S2 修复: 相对路径 → AGENT_ROOT 绝对路径；node 前缀 → bash 直接执行；
 *          参数格式对齐真实 CLI。
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

const LEMONG_CLI = cliPath('lemong');

/**
 * 执行 Lemong 任务
 * @param {Object} task - 任务对象
 * @param {Object} [task.input] - 输入参数
 * @param {string} [task.input.style] - 音乐风格
 * @param {string} [task.input.lyrics] - 歌词（与 theme 二选一）
 * @param {string} [task.input.theme] - 创作主题（无歌词时走 lyrics 子命令）
 * @param {string} [task.input.title] - 歌名
 * @returns {Promise<Object>}
 */
export async function execute(task) {
  const { input = {} } = task;
  const { style, lyrics, theme, title, promptJson } = input;

  let args;
  if (promptJson) {
    args = ['generate', '--prompt-json', promptJson, '--lyrics', lyrics || '', '--title', title || '未命名'];
  } else if (lyrics) {
    args = ['generate', '--style', style || '流行', '--lyrics', lyrics, '--title', title || '未命名'];
  } else if (theme) {
    args = ['lyrics', '--theme', theme];
  } else {
    return {
      success: false,
      error: `Lemong 任务缺少输入参数（需要 lyrics 或 theme），收到: ${JSON.stringify(input)}`,
    };
  }

  console.log(`[LemongAdapter] 执行: bash ${LEMONG_CLI} ${args.join(' ')}`);

  try {
    const { stdout, stderr } = await execFileAsync('bash', [LEMONG_CLI, ...args], {
      timeout: 600000, // 10 分钟超时
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
