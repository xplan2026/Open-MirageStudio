#!/usr/bin/env node
/**
 * add-member.js — 添加家族成员
 * 用法: node scripts/add-member.js <家族名> [--name "姓名"] [--generation <数字>] ...
 *        node scripts/add-member.js <家族名> --interactive
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'Zhupu-data');

function readFamily(familyName) {
  const jsonPath = path.join(DATA_DIR, familyName, '族谱.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`错误: 家族「${familyName}」不存在。请先运行 init 命令创建`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

function saveFamily(familyName, data) {
  const jsonPath = path.join(DATA_DIR, familyName, '族谱.json');
  data.updated_at = new Date().toISOString();
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId(data) {
  const ids = Object.keys(data.members);
  let maxNum = 0;
  for (const id of ids) {
    const match = id.match(/^member_(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `member_${String(maxNum + 1).padStart(3, '0')}`;
}

function addMember(data, memberInfo) {
  const id = memberInfo.id || generateId(data);

  const member = {
    id,
    name: memberInfo.name,
    style_name: memberInfo.style_name || '',
    generation: memberInfo.generation,
    gender: memberInfo.gender || '男',
    avatar: memberInfo.avatar || '',
    birth: memberInfo.birth || '',
    death: memberInfo.death || '',
    father: memberInfo.father || '',
    mother: memberInfo.mother || '',
    spouse: memberInfo.spouse || [],
    children: memberInfo.children || [],
    achievements: memberInfo.achievements || [],
    notes: memberInfo.notes || ''
  };

  data.members[id] = member;

  // 更新父子关系
  if (member.father && data.members[member.father]) {
    if (!data.members[member.father].children.includes(id)) {
      data.members[member.father].children.push(id);
    }
  }
  if (member.mother && data.members[member.mother]) {
    if (!data.members[member.mother].children.includes(id)) {
      data.members[member.mother].children.push(id);
    }
  }

  // 更新配偶关系
  for (const spouseId of member.spouse) {
    if (data.members[spouseId]) {
      if (!data.members[spouseId].spouse.includes(id)) {
        data.members[spouseId].spouse.push(id);
      }
    }
  }

  // 自动更新 generation_names
  const gen = String(member.generation);
  if (!data.generation_names[gen]) {
    const suffix = ['世', '世', '世', '世', '世'];
    const prefix = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    const genName = prefix[parseInt(gen) - 1] ? prefix[parseInt(gen) - 1] + '世' : `第${gen}代`;
    data.generation_names[gen] = genName;
  }

  return id;
}

function interactiveAdd(familyName) {
  const data = readFamily(familyName);

  console.log(`\n🏛️  为「${familyName}」添加新成员（直接回车跳过可选字段）\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (q) => new Promise((r) => rl.question(q, r));

  (async () => {
    try {
      const name = await prompt(`姓名 (必填): `);
      if (!name.trim()) {
        console.error('错误: 姓名不能为空');
        rl.close();
        process.exit(1);
      }

      const generationStr = await prompt(`辈分 (必填, 数字): `);
      const generation = parseInt(generationStr, 10);
      if (isNaN(generation) || generation < 1) {
        console.error('错误: 辈分必须为大于0的数字');
        rl.close();
        process.exit(1);
      }

      const style_name = await prompt(`表字/笔名 (可选): `);
      const gender = await prompt(`性别 (男/女, 默认 男): `) || '男';
      const avatar = await prompt(`头像路径 (可选, 本地路径或URL): `);
      const birth = await prompt(`出生年月 (可选): `);
      const death = await prompt(`去世年月 (可选): `);

      // 列出已有成员供选择
      const memberIds = Object.keys(data.members);
      let father = '', mother = '';

      if (memberIds.length > 0) {
        console.log('\n已有成员列表:');
        for (const id of memberIds) {
          const m = data.members[id];
          console.log(`  ${id}: ${m.name} (${m.generation}世, ${m.gender})`);
        }
        console.log('');
        father = await prompt(`父亲 ID (可选): `);
        mother = await prompt(`母亲 ID (可选): `);
      }

      const spouse = await prompt(`配偶 ID (可选, 多个用逗号分隔): `);

      // 成就录入
      const achievements = [];
      const addAchievement = async () => {
        const yn = await prompt(`\n添加成就/荣誉? (y/N): `);
        if (yn.toLowerCase() !== 'y') return;
        while (true) {
          const type = await prompt(`  成就类型 (科举/官职/军功/荣誉/著作/贡献 等, 必填): `);
          if (!type.trim()) { console.log('  取消添加成就'); break; }
          const title = await prompt(`  成就名称 (必填): `);
          if (!title.trim()) { console.log('  取消添加成就'); break; }
          const year = await prompt(`  年份 (可选): `);
          const detail = await prompt(`  详情 (可选): `);
          achievements.push({ type: type.trim(), title: title.trim(), year: year.trim(), detail: detail.trim() });
          const again = await prompt(`  再添加一个? (y/N): `);
          if (again.toLowerCase() !== 'y') break;
        }
      };
      await addAchievement();

      const notes = await prompt(`备注 (可选): `);

      const result = addMember(data, {
        name: name.trim(),
        generation,
        style_name: style_name.trim(),
        gender: gender.trim(),
        avatar: avatar.trim(),
        birth: birth.trim(),
        death: death.trim(),
        father: father.trim(),
        mother: mother.trim(),
        spouse: spouse.trim() ? spouse.trim().split(/[,，]/).map(s => s.trim()) : [],
        achievements,
        notes: notes.trim()
      });

      saveFamily(familyName, data);

      console.log(`\n✅ 成员「${name}」添加成功 (ID: ${result})`);
      console.log(`   辈分: ${generation}世`);

    } finally {
      rl.close();
    }
  })();
}

function cliAdd(familyName, args) {
  const data = readFamily(familyName);

  const memberInfo = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name': memberInfo.name = args[++i]; break;
      case '--generation': memberInfo.generation = parseInt(args[++i], 10); break;
      case '--gender': memberInfo.gender = args[++i]; break;
      case '--father': memberInfo.father = args[++i]; break;
      case '--mother': memberInfo.mother = args[++i]; break;
      case '--style-name': memberInfo.style_name = args[++i]; break;
      case '--avatar': memberInfo.avatar = args[++i]; break;
      case '--spouse': memberInfo.spouse = args[++i].split(/[,，]/).map(s => s.trim()); break;
      case '--birth': memberInfo.birth = args[++i]; break;
      case '--death': memberInfo.death = args[++i]; break;
      case '--notes': memberInfo.notes = args[++i]; break;
      case '--achievement': {
        const parts = args[++i].split('|');
        if (!memberInfo.achievements) memberInfo.achievements = [];
        memberInfo.achievements.push({ type: parts[0]||'', title: parts[1]||'', year: parts[2]||'', detail: parts[3]||'' });
        break;
      }
    }
  }

  if (!memberInfo.name || !memberInfo.generation) {
    console.error('错误: --name 和 --generation 为必填参数');
    process.exit(1);
  }

  const id = addMember(data, memberInfo);
  saveFamily(familyName, data);
  console.log(`✅ 成员「${memberInfo.name}」添加成功 (ID: ${id})`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('错误: 用法: node scripts/add-member.js <家族名> [参数...]');
    process.exit(1);
  }

  const familyName = args[0];
  const remaining = args.slice(1);

  if (remaining.includes('--interactive')) {
    interactiveAdd(familyName);
  } else {
    cliAdd(familyName, remaining);
  }
}

main();
