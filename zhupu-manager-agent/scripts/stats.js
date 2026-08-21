#!/usr/bin/env node
/**
 * stats.js — 家族统计分析
 * 用法: node scripts/stats.js <家族名>
 */
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'Zhupu-data');

function readFamily(n) {
  const p = path.join(DATA_DIR, n, '族谱.json');
  if (!fs.existsSync(p)) { console.error(`家族「${n}」不存在`); process.exit(1); }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('用法: node scripts/stats.js <家族名>'); process.exit(1); }

  const familyName = args[0];
  const data = readFamily(familyName);
  const members = Object.values(data.members);

  if (!members.length) {
    console.log(`「${familyName}」暂无成员数据`);
    return;
  }

  const total = members.length;
  const gens = new Set(members.map(m => m.generation));
  const maxGen = Math.max(...gens);
  const males = members.filter(m => m.gender === '男').length;
  const females = members.filter(m => m.gender === '女').length;
  const withChildren = members.filter(m => m.children?.length > 0).length;
  const avgChildrenPerFamily = total > 0 ? (withChildren / total * 100).toFixed(1) : 0;

  const genDistribution = {};
  for (const m of members) {
    const gn = data.generation_names?.[String(m.generation)] || `${m.generation}世`;
    genDistribution[gn] = (genDistribution[gn] || 0) + 1;
  }

  console.log(`\n📊 家族统计: ${data.family_name}\n`);
  console.log(`  ${'─'.repeat(30)}`);
  console.log(`  总人数:     ${total} 人`);
  console.log(`  男性:       ${males} 人`);
  console.log(`  女性:       ${females} 人`);
  console.log(`  总代数:     ${gens.size} 代 (1~${maxGen} 世)`);
  console.log(`  有子女者:   ${withChildren} 人 (${avgChildrenPerFamily}%)`);

  if (data.culture?.motto) console.log(`  家训:       ${data.culture.motto}`);
  if (data.culture?.origin) console.log(`  渊源:       ${data.culture.origin}`);

  console.log(`\n  ${'─'.repeat(30)}`);
  console.log('  各代人数:\n');
  const sortedGens = Object.entries(genDistribution).sort((a, b) => {
    const ga = parseInt(Object.keys(data.generation_names).find(k=>data.generation_names[k]===a[0]));
    const gb = parseInt(Object.keys(data.generation_names).find(k=>data.generation_names[k]===b[0]));
    return (ga || 0) - (gb || 0);
  });
  for (const [gen, count] of sortedGens) {
    const bar = '█'.repeat(Math.min(count, 40));
    console.log(`  ${gen.padEnd(8)} ${String(count).padStart(3)} ${bar}`);
  }

  console.log(`\n  创建时间: ${data.created_at ? new Date(data.created_at).toLocaleDateString('zh-CN') : '未知'}`);
  console.log(`  更新时间: ${new Date(data.updated_at).toLocaleString('zh-CN')}`);
  console.log('');
}

main();
