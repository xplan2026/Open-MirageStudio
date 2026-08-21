/**
 * 适配器路径收口（S2 修复：相对路径 → 基于仓库根的统一常量）
 *
 * 本文件位于 <root>/coordinator-agent/src/adapters/，上溯 3 级即为仓库根：
 *   本地  : /workspace
 *   服务器: /opt/mirage-studio
 *
 * 采用运行时计算而非硬编码，保证本地与服务器目录结构一致时无需维护绝对路径。
 * 即使 PM2 cwd 指向 coordinator-agent，适配器也能正确定位 Agent CLI。
 */

import { fileURLToPath } from 'url';
import path from 'path';

/** 仓库根目录（AGENT_ROOT） */
export const AGENT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);

/** 各 Agent CLI 入口（相对 AGENT_ROOT，与 REGISTER.md / agent-card.js 的 cliEntry 保持一致） */
export const AGENT_CLI = {
  lemong: 'lemong-agent/lemong-agent',
  erhu: 'erhu-agent/erhu-agent',
  zhupu: 'zhupu-manager-agent/zhupu-manager-agent',
  // xujie: 无 CLI 入口（人控对话式 Agent），S3 定义调度模式
};

/**
 * 获取 Agent CLI 的绝对路径
 * @param {string} agentId
 * @returns {string|null}
 */
export function cliPath(agentId) {
  const entry = AGENT_CLI[agentId];
  return entry ? path.join(AGENT_ROOT, entry) : null;
}
