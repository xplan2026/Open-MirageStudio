/**
 * DAG 任务编排器
 *
 * 支持:
 * - 顺序编排: Lemong → Erhu (歌曲生成 → MV 制作)
 * - 并行编排: 多个独立任务同时执行
 * - 依赖管理: Task B 依赖 Task A 的结果
 *
 * DAG 结构:
 *   nodes: [{ id, agentId, input, status }]
 *   edges: [{ from, to }]  // to 依赖 from 完成
 */

import { getAgentCard } from '../agents/registry.js';
import { createTask, updateTaskStatus, getTask, TASK_STATES } from '../state/task-state.js';

/**
 * 执行 DAG 编排计划
 * @param {Object} dag
 * @param {Array<{id: string, agentId: string, input: Object}>} dag.nodes
 * @param {Array<{from: string, to: string}>} dag.edges
 * @returns {Promise<Object>} 编排结果
 */
export async function executeDAG(dag) {
  const { nodes, edges = [] } = dag;

  // 构建依赖图
  const dependsOn = new Map(); // id → [依赖的 id]
  const provides = new Map();  // id → [依赖它的 id]
  for (const edge of edges) {
    if (!dependsOn.has(edge.to)) dependsOn.set(edge.to, []);
    dependsOn.get(edge.to).push(edge.from);

    if (!provides.has(edge.from)) provides.set(edge.from, []);
    provides.get(edge.from).push(edge.to);
  }

  // 拓扑排序确定执行顺序
  const order = topologicalSort(nodes, dependsOn);

  // 按顺序执行
  const results = new Map();
  for (const nodeId of order) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;

    // 解析依赖的输入
    const deps = dependsOn.get(nodeId) || [];
    let resolvedInput = { ...node.input };

    for (const depId of deps) {
      const depResult = results.get(depId);
      if (depResult) {
        resolvedInput = { ...resolvedInput, ...depResult };
      }
    }

    // 创建并执行任务
    const task = createTask({
      agentId: node.agentId,
      intent: `DAG node: ${nodeId}`,
      input: resolvedInput,
    });

    updateTaskStatus(task.id, TASK_STATES.RUNNING);

    try {
      // TODO: 实际调用适配器执行
      updateTaskStatus(task.id, TASK_STATES.SUCCESS, {
        result: { nodeId, agentId: node.agentId },
      });
      results.set(nodeId, getTask(task.id).result);
    } catch (err) {
      updateTaskStatus(task.id, TASK_STATES.FAILED, { error: err.message });

      // 失败时，标记所有后续依赖为 cancelled
      const downstream = getAllDownstream(nodeId, provides);
      for (const dsId of downstream) {
        // 找到对应的 task 并取消
      }

      return {
        success: false,
        error: `节点 ${nodeId} 执行失败: ${err.message}`,
        results: Object.fromEntries(results),
      };
    }
  }

  return {
    success: true,
    results: Object.fromEntries(results),
  };
}

/**
 * 拓扑排序
 */
function topologicalSort(nodes, dependsOn) {
  const sorted = [];
  const visited = new Set();
  const temp = new Set();

  function visit(nodeId) {
    if (temp.has(nodeId)) throw new Error(`循环依赖: ${nodeId}`);
    if (visited.has(nodeId)) return;

    temp.add(nodeId);
    const deps = dependsOn.get(nodeId) || [];
    for (const dep of deps) visit(dep);
    temp.delete(nodeId);
    visited.add(nodeId);
    sorted.push(nodeId);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) visit(node.id);
  }

  return sorted;
}

/**
 * 获取某个节点的所有下游节点
 */
function getAllDownstream(nodeId, provides, result = []) {
  const children = provides.get(nodeId) || [];
  for (const child of children) {
    result.push(child);
    getAllDownstream(child, provides, result);
  }
  return result;
}
