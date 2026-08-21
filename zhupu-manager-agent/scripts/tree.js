#!/usr/bin/env node
/**
 * tree.js — 家族关系树可视化
 * 用法: node scripts/tree.js <家族名>
 */
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'Zhupu-data');

function readFamily(n) {
  const p = path.join(DATA_DIR, n, '族谱.json');
  if (!fs.existsSync(p)) { console.error(`家族「${n}」不存在`); process.exit(1); }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/** 递归打印子树 */
function printTree(data, rootId, indent, visited) {
  const member = data.members[rootId];
  if (!member || visited.has(rootId)) return;
  visited.add(rootId);

  const prefix = indent ? indent + '└─ ' : '';
  const genName = data.generation_names?.[String(member.generation)] || `${member.generation}世`;
  const nameDisplay = member.style_name ? `${member.name}（${member.style_name}）` : member.name;
  const spouse = member.spouse?.length
    ? ` 配: ${member.spouse.map(s => data.members[s]?.name || s).join(', ')}`
    : '';
  const achievementBadge = member.achievements?.length ? ` 🏆` : '';
  console.log(`${prefix}${nameDisplay} [${genName}]${spouse}${achievementBadge}`);

  if (member.children?.length) {
    const childIndent = indent ? indent + '   ' : '   ';
    for (const cid of member.children) {
      printTree(data, cid, childIndent, visited);
    }
  }
}

/** 按世代阶层排列输出 */
function printByGenerations(data) {
  const maxGen = Math.max(...Object.values(data.members).map(m => m.generation), 0);
  console.log(`\n🏛️  「${data.family_name}」家族关系树\n`);

  for (let g = 1; g <= maxGen; g++) {
    const genMembers = Object.values(data.members).filter(m => m.generation === g);
    if (!genMembers.length) continue;

    const genName = data.generation_names?.[String(g)] || `${g}世`;
    console.log(`┌─ ${genName} (${genMembers.length} 人)`);

    for (const m of genMembers) {
      const nameDisplay = m.style_name ? `${m.name}（${m.style_name}）` : m.name;
      const spouse = m.spouse?.length
        ? ` 配: ${m.spouse.map(s => data.members[s]?.name || s).join(',')}`
        : '';
      const children = m.children?.length
        ? ` 子: ${m.children.map(c => data.members[c]?.name || c).join(',')}`
        : '';
      const achievementBadge = m.achievements?.length ? ` 🏆` : '';
      console.log(`│  ${nameDisplay}${spouse}${children}${achievementBadge}`);
    }
    console.log('');
  }
}

function printFlatTree(data) {
  console.log(`\n🏛️  「${data.family_name}」成员列表（按辈分）\n`);

  const members = Object.values(data.members).sort((a, b) => a.generation - b.generation);
  let genPrinted = false;

  for (const m of members) {
    const gen = m.generation;
    if (genPrinted !== gen) {
      if (genPrinted !== false) console.log('');
      const genName = data.generation_names?.[String(gen)] || `${gen}世`;
      console.log(`═══ ${genName} ═══`);
      genPrinted = gen;
    }
    const nameDisplay = m.style_name ? `${m.name}（${m.style_name}）` : m.name;
    const spouse = m.spouse?.length
      ? ` (${m.spouse.map(s => data.members[s]?.name || s).join(',')})`
      : '';
    const achievementBadge = m.achievements?.length ? ` 🏆` : '';
    console.log(`  ${nameDisplay}${spouse}${achievementBadge}`);
  }
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('用法: node scripts/tree.js <家族名> [--flat]'); process.exit(1); }

  const familyName = args[0];
  const data = readFamily(familyName);

  if (Object.keys(data.members).length === 0) {
    console.log(`「${familyName}」暂无成员数据`);
    return;
  }

  if (args.includes('--flat')) {
    printFlatTree(data);
    return;
  }

  printByGenerations(data);

  // 统计
  const total = Object.keys(data.members).length;
  const gens = new Set(Object.values(data.members).map(m => m.generation)).size;
  console.log(`📊 总计: ${total} 人, ${gens} 代`);
}

main();
