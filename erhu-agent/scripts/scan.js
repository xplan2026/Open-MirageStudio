#!/usr/bin/env node
/**
 * Erhu Agent — 扫描作品计划索引
 *
 * 扫描 data/Erhu-data/plans/ 目录，读取 INDEX.md，
 * 列出所有未处理的作品计划。
 *
 * 用法:
 *   node erhu-agent/scripts/scan.js
 *   node erhu-agent/scripts/scan.js --json   # JSON 输出
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const ERHU_DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'Erhu-data');
const PLANS_DIR = path.join(ERHU_DATA_DIR, 'plans');
const INDEX_PATH = path.join(ERHU_DATA_DIR, 'INDEX.md');

function parseIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    return { plans: [] };
  }

  const content = fs.readFileSync(INDEX_PATH, 'utf-8');
  const plans = [];
  let inTable = false;

  for (const line of content.split('\n')) {
    if (line.includes('| 序号 | 作品名 |')) {
      inTable = true;
      continue;
    }
    if (line.includes('|------|')) continue;
    if (!inTable) continue;
    if (line.trim() === '' || line.includes('> ')) continue;
    if (line.includes('— | — |')) continue;

    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 7) {
      plans.push({
        number: cols[0],
        name: cols[1],
        planFile: cols[2],
        status: cols[3],
        createdDate: cols[4],
        completedDate: cols[5] !== '—' ? cols[5] : null,
        notes: cols[6]
      });
    }
  }

  return { plans };
}

function scanPlansDir() {
  if (!fs.existsSync(PLANS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(PLANS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  return files;
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');

  const index = parseIndex();
  const planFiles = scanPlansDir();

  // Find unprocessed plans
  const unprocessed = planFiles.filter(file => {
    const plan = index.plans.find(p => p.planFile === file);
    return !plan || plan.status === '🔴 未处理';
  });

  if (jsonOutput) {
    console.log(JSON.stringify({
      totalPlans: planFiles.length,
      unprocessed: unprocessed,
      index: index.plans
    }, null, 2));
    return;
  }

  console.log('📋 二虎作品计划扫描');
  console.log('=' .repeat(50));
  console.log(`  计划目录: ${PLANS_DIR}`);
  console.log(`  计划总数: ${planFiles.length}`);
  console.log(`  未处理:   ${unprocessed.length}`);
  console.log('=' .repeat(50));

  if (unprocessed.length > 0) {
    console.log('\n🔴 待处理计划:');
    unprocessed.forEach(f => {
      const filePath = path.join(PLANS_DIR, f);
      const content = fs.readFileSync(filePath, 'utf-8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '');
      console.log(`   📄 ${f} — "${title}"`);
    });
  } else {
    console.log('\n✅ 没有待处理的计划');
  }
}

main();
