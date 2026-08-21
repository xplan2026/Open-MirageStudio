#!/usr/bin/env node
/**
 * Erhu Agent — 一键全流程 MV 制作
 *
 * 扫描未处理计划 → 作曲 → 生图 → 渲染
 *
 * 用法:
 *   node erhu-agent/scripts/produce.js              # 处理所有未处理计划
 *   node erhu-agent/scripts/produce.js <作品名>      # 处理指定作品
 *   node erhu-agent/scripts/produce.js --dry-run     # 预览
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const ERHU_DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'Erhu-data');
const SCRIPTS_DIR = __dirname;

function runScript(scriptName, args = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`▶️  ${scriptName} ${args.join(' ')}`);
  console.log('='.repeat(60));

  try {
    execSync(`node "${scriptPath}" ${args.join(' ')}`, {
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit'
    });
    return true;
  } catch (err) {
    console.error(`\n❌ ${scriptName} 失败`);
    return false;
  }
}

function getUnprocessedPlans() {
  const scanScript = path.join(SCRIPTS_DIR, 'scan.js');
  try {
    const result = execSync(`node "${scanScript}" --json`, {
      cwd: WORKSPACE_ROOT,
      stdio: 'pipe'
    }).toString();
    const data = JSON.parse(result);
    return data.unprocessed || [];
  } catch (err) {
    return [];
  }
}

function extractSongName(planFile) {
  return planFile
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace('.md', '');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificName = args.find(a => !a.startsWith('--'));

  console.log('🎸 二虎 (Erhu) MV 制作流水线');
  console.log('='.repeat(60));

  let targets = [];

  if (specificName) {
    targets = [specificName];
  } else {
    const plans = getUnprocessedPlans();
    if (plans.length === 0) {
      console.log('✅ 没有待处理的计划');
      return;
    }
    targets = plans.map(extractSongName);
    console.log(`📋 待处理: ${targets.length} 个作品`);
  }

  const dryFlag = dryRun ? ' --dry-run' : '';

  for (const name of targets) {
    console.log(`\n🎯 开始处理: "${name}"`);

    // Step 1: Compose
    if (!runScript('compose.js', [`"${name}"${dryFlag}`])) {
      console.error(`   跳过 "${name}"（作曲失败）`);
      continue;
    }
    if (dryRun) continue;

    // Step 2: Visualize
    if (!runScript('visualize.js', [`"${name}"`])) {
      console.error(`   跳过 "${name}"（生图失败）`);
      continue;
    }

    // Step 3: Render
    if (!runScript('render.js', [`"${name}"`])) {
      console.error(`   "${name}" 渲染失败`);
      continue;
    }

    console.log(`\n🎉 "${name}" 制作完成！`);

    // Step 4: Publish to cloud (R2 + D1) — 失败不阻塞
    try {
      console.log(`\n📡 发布到云端 (R2 + D1)...`);
      execSync(`node scripts/publish.js mv "Erhu-data/${name}"`, {
        cwd: WORKSPACE_ROOT,
        stdio: 'inherit',
        timeout: 600000
      });
      console.log(`✅ "${name}" 已发布到云端`);
    } catch (publishErr) {
      console.error(`⚠️  云端发布失败（不阻塞）: ${String(publishErr.message || publishErr).split('\n')[0]}`);
    }
  }

  console.log('\n✨ 流水线结束');
}

main();
