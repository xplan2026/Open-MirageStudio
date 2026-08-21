/**
 * 适配器分发中心（S1 修复：coordinator.js → getAdapter(agentId) 路由）
 *
 * 注册表：
 *   - lemong / erhu / zhupu：可无头 CLI Agent（execute 真实调用 CLI）
 *   - xujie：人控对话式 Agent（S3 决策选项 A — 任务落盘 + 人工确认回写）
 */

import { execute as executeLemong } from './lemong-adapter.js';
import { execute as executeErhu } from './erhu-adapter.js';
import { execute as executeZhupu } from './zhupu-adapter.js';
import { execute as executeXujie, acknowledge as acknowledgeXujie } from './xujie-adapter.js';
import { AGENT_ROOT } from './paths.js';

/** 适配器注册表 */
const ADAPTERS = {
  lemong: { execute: executeLemong },
  erhu: { execute: executeErhu },
  zhupu: { execute: executeZhupu },
  xujie: { execute: executeXujie, acknowledge: acknowledgeXujie },
};

/**
 * 获取 Agent 对应适配器
 * @param {string} agentId
 * @returns {{execute: Function, acknowledge?: Function}|null}
 */
export function getAdapter(agentId) {
  return ADAPTERS[agentId] || null;
}

/** 判断是否有可用适配器 */
export function hasAdapter(agentId) {
  return !!ADAPTERS[agentId];
}

export { AGENT_ROOT };
