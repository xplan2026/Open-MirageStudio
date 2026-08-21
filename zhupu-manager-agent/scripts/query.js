#!/usr/bin/env node
/**
 * query.js — 查询家族成员与列表
 * 用法: node scripts/query.js <家族名> [--name "姓名"|--generation <数字>|--list]
 *        node scripts/query.js --list-all
 */
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'Zhupu-data');

function readFamily(n) { const p = path.join(DATA_DIR, n, '族谱.json'); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf-8')) : null; }

function listAll() {
  if (!fs.existsSync(DATA_DIR)) { console.log('暂无家族数据'); return; }
  const dirs = fs.readdirSync(DATA_DIR,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
  if (!dirs.length) { console.log('暂无家族数据'); return; }
  console.log('🏛️  已注册的家族:\n');
  for (const n of dirs) {
    const d = readFamily(n);
    if (d) {
      const emblemInfo = d.culture?.emblem ? ' 🏛️' : '';
      console.log(`  ${n}  —  ${Object.keys(d.members||{}).length} 人, ${Object.keys(d.generation_names||{}).length} 代${emblemInfo}  |  ${d.description||''}`);
    }
  }
  console.log(`\n共 ${dirs.length} 个家族`);
}

function formatMember(m, data) {
  const spouse = m.spouse?.length ? m.spouse.map(s=>data.members[s]?.name||s).join(', ') : '无';
  const father = m.father && data.members[m.father] ? data.members[m.father].name : '无';
  const mother = m.mother && data.members[m.mother] ? data.members[m.mother].name : '无';
  const children = m.children?.length ? m.children.map(c=>data.members[c]?.name||c).join(', ') : '无';
  const genName = data.generation_names?.[String(m.generation)] || `${m.generation}世`;
  console.log(`  ┌─ ID: ${m.id}`);
  const nameDisplay = m.style_name ? `${m.name}（${m.style_name}）` : m.name;
  console.log(`  ├─ 姓名: ${nameDisplay}`);
  console.log(`  ├─ 辈分: ${genName}`);
  console.log(`  ├─ 性别: ${m.gender||'未填'}`);
  if (m.avatar) console.log(`  ├─ 头像: ${m.avatar}`);
  if (m.birth) console.log(`  ├─ 出生: ${m.birth}`);
  if (m.death) console.log(`  ├─ 去世: ${m.death}`);
  console.log(`  ├─ 父亲: ${father}`);
  console.log(`  ├─ 母亲: ${mother}`);
  console.log(`  ├─ 配偶: ${spouse}`);
  console.log(`  ├─ 子女: ${children}`);
  if (m.achievements?.length) {
    console.log(`  ├─ 成就/荣誉:`);
    for (const a of m.achievements) {
      const yearInfo = a.year ? ` (${a.year})` : '';
      const detailInfo = a.detail ? ` — ${a.detail}` : '';
      console.log(`  │   • [${a.type}] ${a.title}${yearInfo}${detailInfo}`);
    }
  }
  if (m.notes) console.log(`  └─ 备注: ${m.notes}`);
  else console.log(`  └─ 备注: 无`);
}

function queryByName(data, name) {
  const matches = Object.values(data.members).filter(m => m.name.includes(name));
  if (!matches.length) { console.log(`未找到包含「${name}」的成员`); return; }
  console.log(`\n找到 ${matches.length} 位成员:\n`);
  for (const m of matches) formatMember(m, data);
}

function queryByGeneration(data, gen) {
  const matches = Object.values(data.members).filter(m => m.generation === gen);
  if (!matches.length) { console.log(`没有第 ${gen} 世的成员`); return; }
  const genName = data.generation_names?.[String(gen)] || `${gen}世`;
  console.log(`\n${genName} (共 ${matches.length} 人):\n`);
  for (const m of matches) {
    const spouse = m.spouse?.length ? ` 配: ${m.spouse.map(s=>data.members[s]?.name||s).join(',')}` : '';
    console.log(`  ${m.id}  ${m.name}${spouse}${m.notes ? `  — ${m.notes}` : ''}`);
  }
}

function listMembers(data) {
  const members = Object.values(data.members).sort((a,b)=>a.generation-b.generation);
  if (!members.length) { console.log('暂无成员数据'); return; }
  console.log(`\n共 ${members.length} 位成员:\n`);
  for (const m of members) {
    const nameDisplay = m.style_name ? `${m.name}（${m.style_name}）` : m.name;
    const achievementBadge = m.achievements?.length ? ` 🏆${m.achievements.length}项` : '';
    console.log(`  [${m.generation}世] ${m.id}  ${nameDisplay}${achievementBadge}  (${m.gender})`);
  }
}

function queryByAchievementType(data, type) {
  const matches = Object.values(data.members).filter(m => m.achievements?.some(a => a.type.includes(type)));
  if (!matches.length) { console.log(`没有「${type}」类成就的成员`); return; }
  console.log(`\n有「${type}」类成就的成员 (共 ${matches.length} 人):\n`);
  for (const m of matches) formatMember(m, data);
}

function queryHasAchievement(data) {
  const matches = Object.values(data.members).filter(m => m.achievements?.length);
  if (!matches.length) { console.log('没有成员有成就记录'); return; }
  console.log(`\n有成就记录的成员 (共 ${matches.length} 人):\n`);
  for (const m of matches) {
    const nameDisplay = m.style_name ? `${m.name}（${m.style_name}）` : m.name;
    const types = [...new Set(m.achievements.map(a => a.type))].join(', ');
    console.log(`  [${m.generation}世] ${m.id}  ${nameDisplay}  🏆 ${types}`);
  }
}

function queryByMemberId(data, id) {
  const m = data.members[id];
  if (!m) { console.log(`未找到 ID 为「${id}」的成员`); return; }
  formatMember(m, data);
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('用法: node scripts/query.js <家族名> [--name|--generation|--list|--id]'); process.exit(1); }

  if (args[0] === '--list-all') { listAll(); return; }

  const familyName = args[0];
  const data = readFamily(familyName);
  if (!data) { console.error(`家族「${familyName}」不存在`); process.exit(1); }

  const remaining = args.slice(1);
  if (!remaining.length) { listMembers(data); return; }

  for (let i = 0; i < remaining.length; i++) {
    switch (remaining[i]) {
      case '--name': queryByName(data, remaining[++i]); break;
      case '--generation': queryByGeneration(data, parseInt(remaining[++i],10)); break;
      case '--list': listMembers(data); break;
      case '--id': queryByMemberId(data, remaining[++i]); break;
      case '--has-achievement': queryHasAchievement(data); break;
      case '--achievement-type': queryByAchievementType(data, remaining[++i]); break;
      default: console.error(`未知参数: ${remaining[i]}`);
    }
  }
}

main();
