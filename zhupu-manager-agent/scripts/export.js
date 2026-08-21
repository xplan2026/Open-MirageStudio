#!/usr/bin/env node
/**
 * export.js — 导出族谱 + 设置家训
 * 用法: node scripts/export.js <家族名> [--format json|markdown|text]
 *        node scripts/export.js <家族名> --motto "家训内容"
 */
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'Zhupu-data');

function readFamily(n) {
  const p = path.join(DATA_DIR, n, '族谱.json');
  if (!fs.existsSync(p)) { console.error(`家族「${n}」不存在`); process.exit(1); }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveFamily(n, data) {
  const p = path.join(DATA_DIR, n, '族谱.json');
  data.updated_at = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

function exportToMarkdown(data) {
  let md = `# ${data.family_name} 族谱\n\n`;
  md += `> ${data.description || ''}\n\n`;
  if (data.culture?.motto) md += `**家训**: ${data.culture.motto}\n\n`;
  if (data.culture?.emblem) md += `**族徽**: ${data.culture.emblem}\n\n`;
  if (data.culture?.origin) md += `**渊源**: ${data.culture.origin}\n\n`;

  const members = Object.values(data.members).sort((a,b) => a.generation - b.generation);
  let curGen = 0;
  for (const m of members) {
    if (m.generation !== curGen) {
      const n = data.generation_names?.[String(m.generation)] || `${m.generation}世`;
      md += `\n## ${n}\n\n`;
      curGen = m.generation;
    }
    const nameDisplay = m.style_name ? `**${m.name}**（${m.style_name}）` : `**${m.name}**`;
    const father = m.father && data.members[m.father] ? `父: ${data.members[m.father].name}` : '';
    const spouse = m.spouse?.length ? ` 配: ${m.spouse.map(s=>data.members[s]?.name||s).join(',')}` : '';
    const achievements = m.achievements?.length
      ? ` 🏆 ${m.achievements.map(a => `${a.title}${a.year ? `(${a.year})` : ''}`).join('、')}`
      : '';
    md += `- ${nameDisplay}${father ? ` (${father})` : ''}${spouse}${achievements}${m.notes ? ` — ${m.notes}` : ''}\n`;
  }

  md += `\n---\n📊 共 ${members.length} 人, ${new Set(members.map(m=>m.generation)).size} 代\n`;
  return md;
}

function exportToText(data) {
  let txt = `${data.family_name} 族谱\n${'='.repeat(30)}\n`;
  if (data.culture?.motto) txt += `\n家训: ${data.culture.motto}\n`;
  if (data.culture?.emblem) txt += `族徽: ${data.culture.emblem}\n`;

  const members = Object.values(data.members).sort((a,b) => a.generation - b.generation);
  for (const m of members) {
    const gen = data.generation_names?.[String(m.generation)] || `${m.generation}世`;
    const nameDisplay = m.style_name ? `${m.name}（${m.style_name}）` : m.name;
    const achievements = m.achievements?.length ? ` 🏆${m.achievements.map(a => a.title).join('、')}` : '';
    txt += `\n[${gen}] ${nameDisplay}${achievements}`;
    if (m.spouse?.length) txt += ` (配: ${m.spouse.map(s=>data.members[s]?.name||s).join(',')})`;
  }
  txt += `\n\n共 ${members.length} 人`;
  return txt;
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('用法: node scripts/export.js <家族名> [--format json|markdown|text] [--motto "内容"]'); process.exit(1); }

  if (args.includes('--motto')) {
    const idx = args.indexOf('--motto');
    const familyName = args[0];
    const motto = args[idx + 1];
    const data = readFamily(familyName);
    data.culture.motto = motto;
    saveFamily(familyName, data);
    console.log(`✅ 家训已更新: ${motto}`);
    return;
  }

  if (args.includes('--emblem')) {
    const idx = args.indexOf('--emblem');
    const familyName = args[0];
    const emblem = args[idx + 1];
    const data = readFamily(familyName);
    data.culture.emblem = emblem;
    saveFamily(familyName, data);
    console.log(`✅ 族徽已设置: ${emblem}`);
    return;
  }

  const familyName = args[0];
  const data = readFamily(familyName);
  let format = 'markdown';
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--format') format = args[++i];
  }

  const exportDir = path.join(DATA_DIR, familyName, 'export');
  fs.mkdirSync(exportDir, { recursive: true });

  let content, ext, outputPath;
  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      ext = '.json';
      break;
    case 'text':
      content = exportToText(data);
      ext = '.txt';
      break;
    default:
      content = exportToMarkdown(data);
      ext = '.md';
  }

  outputPath = path.join(exportDir, `${familyName}${ext}`);
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`✅ 导出完成: ${outputPath}`);
  console.log(`   格式: ${format}, 大小: ${(Buffer.byteLength(content)/1024).toFixed(1)} KB`);
}

main();
