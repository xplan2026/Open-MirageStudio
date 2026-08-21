/**
 * 调度链路本地验证脚本（TODO-调度链路.md S1-S3）
 *
 * 用法: cd coordinator-agent && node scripts/verify-scheduler.mjs
 *
 * 验证项:
 *   a. AGENT_ROOT 解析正确（仓库根，本地 /workspace / 服务器 /opt/mirage-studio）
 *   b. 三个 Agent CLI 入口文件存在（路径修复生效）
 *   c. zhupu 端到端真实执行（query 米家族谱，无 API key 依赖）
 *   d. lemong 路径与参数构造正确（无 ACE_API_KEY 时失败信息应指向该变量，而非 ENOENT）
 *   e. xujie 人控任务：落盘 → WAITING → 人工回写 SUCCESS（S3 选项 A）
 *      - 验证落盘文件生成、状态机流转、pending→done 移动
 *
 * 注意: 若本地存在 lemong-agent/.env 且含 ACE_API_KEY，d 场景会真实调用
 *       ACE API（付费），脚本将自动跳过该场景。
 */

import fs from 'fs';
import path from 'path';
import { AGENT_ROOT, cliPath } from '../src/adapters/paths.js';
import { createTask, getTask, TASK_STATES } from '../src/state/task-state.js';
import { executeTask, acknowledgeTask } from '../src/coordinator.js';

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

function summarize(prefix, task) {
  const status = task?.status ?? 'unknown';
  const err = (task?.error || '').slice(0, 200);
  const out = (task?.result?.output || '').slice(0, 300);
  console.log(`     → status=${status}`);
  if (err) console.log(`     → error: ${err}`);
  if (out) console.log(`     → output(前300字): ${out.replace(/\n/g, ' ')}`);
}

console.log('=== a. AGENT_ROOT 路径解析 ===');
check(`AGENT_ROOT = ${AGENT_ROOT}`, AGENT_ROOT && fs.existsSync(path.join(AGENT_ROOT, 'coordinator-agent')));
check('仓库根包含 coordinator-agent 目录', fs.existsSync(path.join(AGENT_ROOT, 'coordinator-agent')));

console.log('\n=== b. 三个 Agent CLI 入口存在 ===');
for (const id of ['lemong', 'erhu', 'zhupu']) {
  const p = cliPath(id);
  check(`CLI 存在: ${id} → ${p}`, !!p && fs.existsSync(p));
}

console.log('\n=== c. zhupu 端到端真实执行 ===');
try {
  const zhupuTask = createTask({ agentId: 'zhupu', intent: '查询米家族谱', input: { action: 'query', family: '米家' } });
  const zhupuDone = await executeTask(zhupuTask.id);
  summarize('zhupu/query 米家', zhupuDone);
  const output = zhupuDone?.result?.output || '';
  check('zhupu 任务成功 (SUCCESS)', zhupuDone?.status === TASK_STATES.SUCCESS);
  check('zhupu 输出包含家族信息', output.length > 0, `(output 为空)`);
} catch (err) {
  failed += 1;
  console.log(`  ❌ zhupu 端到端执行抛异常: ${err.message}`);
}

console.log('\n=== d. lemong 路径与参数构造 ===');
const lemongEnvExists = fs.existsSync(path.join(AGENT_ROOT, 'lemong-agent', '.env'));
if (lemongEnvExists) {
  console.log(`  ℹ️ 检测到 lemong-agent/.env，跳过真实调用（避免付费 API 消耗）`);
  check('lemong CLI 入口存在（路径修复生效）', fs.existsSync(cliPath('lemong')));
} else {
  try {
    const lemongTask = createTask({
      agentId: 'lemong',
      intent: '生成测试歌曲',
      input: { style: '流行', lyrics: '这是本地调度链路验证的测试歌词', title: '链路验证测试' },
    });
    const lemongDone = await executeTask(lemongTask.id);
    summarize('lemong/generate 测试', lemongDone);
    const errText = `${lemongDone?.error || ''} ${lemongDone?.stdout || ''} ${lemongDone?.stderr || ''}`;
    // 期望: FAILED 且原因指向 ACE_API_KEY（证明 CLI 找到、参数正确，而非路径 ENOENT）
    check(
      'lemong 失败原因为缺失 ACE_API_KEY（而非 ENOENT）',
      lemongDone?.status === TASK_STATES.FAILED && /ACE_API_KEY/.test(errText),
      `(status=${lemongDone?.status}, error=${lemongDone?.error})`,
    );
  } catch (err) {
    failed += 1;
    console.log(`  ❌ lemong 执行抛异常: ${err.message}`);
  }
}

console.log('\n=== e. xujie 人控任务：落盘 → WAITING → 人工回写 SUCCESS (S3) ===');
try {
  const xujieTask = createTask({ agentId: 'xujie', intent: '写《幻觉》第 5 章', input: { action: 'write_chapter', chapter: 5 } });
  const xujieDone = await executeTask(xujieTask.id);
  summarize('xujie 执行（落盘）', xujieDone);

  // 1) 落盘成功 → 状态应为 WAITING（等待人工确认），而非 SUCCESS/FAILED
  check('xujie 任务状态为 WAITING', xujieDone?.status === TASK_STATES.WAITING, `(status=${xujieDone?.status})`);

  // 2) 落盘文件存在于 data/XujieWriter-data/tasks/pending/
  const pendingFile = path.join(AGENT_ROOT, 'data', 'XujieWriter-data', 'tasks', 'pending', `${xujieTask.id}.json`);
  check('pending 落盘文件存在', fs.existsSync(pendingFile), `(${pendingFile})`);
  if (fs.existsSync(pendingFile)) {
    const record = JSON.parse(fs.readFileSync(pendingFile, 'utf-8'));
    check('落盘记录 status=waiting', record.status === 'waiting', `(status=${record.status})`);
    check('落盘记录含任务输入', record.input?.action === 'write_chapter', `(input=${JSON.stringify(record.input)})`);
  }

  // 3) 人工回写 SUCCESS → 状态机流转 WAITING → SUCCESS，pending 文件移至 done/
  const acked = await acknowledgeTask(xujieTask.id, {
    success: true,
    result: { chapterFile: 'data/XujieWriter-data/幻觉/章节/第5章.md' },
  });
  check('回写后状态为 SUCCESS', acked?.status === TASK_STATES.SUCCESS, `(status=${acked?.status})`);
  check('回写结果已保存', acked?.result?.chapterFile === 'data/XujieWriter-data/幻觉/章节/第5章.md');
  check('pending 文件已移至 done/', !fs.existsSync(pendingFile) && fs.existsSync(
    path.join(AGENT_ROOT, 'data', 'XujieWriter-data', 'tasks', 'done', `${xujieTask.id}.json`),
  ));
} catch (err) {
  failed += 1;
  console.log(`  ❌ xujie 执行抛异常: ${err.message}`);
}

console.log('\n============================');
console.log(`结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
