#!/usr/bin/env node
/**
 * init-family.js — 初始化新家族
 * 用法: node scripts/init-family.js <家族名> [--description "描述"]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'Zhupu-data');

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('错误: 用法: node scripts/init-family.js <家族名> [--description "描述"]');
    process.exit(1);
  }

  const familyName = args[0];
  let description = '';
  let emblem = '';

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--description' && i + 1 < args.length) {
      description = args[i + 1];
      i++;
    } else if (args[i] === '--emblem' && i + 1 < args.length) {
      emblem = args[i + 1];
      i++;
    }
  }

  const familyDir = path.join(DATA_DIR, familyName);
  const jsonPath = path.join(familyDir, '族谱.json');

  if (fs.existsSync(jsonPath)) {
    console.error(`错误: 家族「${familyName}」已存在 (${jsonPath})`);
    process.exit(1);
  }

  // 创建初始族谱数据
  const familyData = {
    family_name: familyName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: description || `${familyName} 族谱`,
    culture: {
      motto: '',
      emblem: emblem,
      origin: '',
      notes: ''
    },
    generation_names: {},
    members: {}
  };

  // 创建目录
  fs.mkdirSync(familyDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(familyData, null, 2), 'utf-8');

  console.log(`✅ 家族「${familyName}」初始化完成`);
  console.log(`   路径: ${jsonPath}`);
  console.log(`   描述: ${description || '(未设置)'}`);
  if (emblem) console.log(`   族徽: ${emblem}`);
  console.log(`\n下一步: 使用 add 命令添加家族成员`);
  console.log(`   ./zhupu-manager-agent/zhupu-manager-agent add "${familyName}" --interactive`);
}

main();
