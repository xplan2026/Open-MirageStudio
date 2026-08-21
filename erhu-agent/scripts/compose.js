#!/usr/bin/env node
/**
 * Erhu Agent — 歌曲生成（调用 lemong-agent）
 *
 * 从计划文档提取创作背景 → 调用 lemong-agent 两步流程生成歌曲
 * 注入二虎专属音色模板，将产物复制到 Erhu-data 目录。
 *
 * 用法:
 *   node erhu-agent/scripts/compose.js <作品名>
 *   node erhu-agent/scripts/compose.js <作品名> --dry-run
 *
 * 输入:  data/Erhu-data/plans/{YYYY-MM-DD}-{作品名}.md
 * 输出:  data/Erhu-data/{作品名}/{作品名}.mp3 + 歌词.txt + prompt.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const ERHU_DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'Erhu-data');
const LEMONG_DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'Lemong-data');
const PLANS_DIR = path.join(ERHU_DATA_DIR, 'plans');
const LEMONG_SCRIPTS = path.join(WORKSPACE_ROOT, 'lemong-agent', 'scripts');

// 二虎音色模板
const ERHU_VOCAL_PROFILE = {
  vocal_style: "Warm, gritty, nasal male vocal with a natural, unpolished delivery. Eagles-like warm, gritty, nasal male voice.",
  special_notes: "CRITICAL: Chinese (Mandarin) song, no English lyrics. Vocals should be rough and heartfelt, with a slightly nasal quality reminiscent of Eagles' vocal style."
};

/**
 * 查找计划文档
 */
function findPlan(songName) {
  if (!fs.existsSync(PLANS_DIR)) {
    throw new Error(`计划目录不存在: ${PLANS_DIR}`);
  }

  const files = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.md'));
  const match = files.find(f => f.includes(songName));

  if (!match) {
    throw new Error(`未找到 "${songName}" 的计划文档`);
  }

  return path.join(PLANS_DIR, match);
}

/**
 * 从计划文档提取创作背景
 */
function extractBackground(planPath) {
  const content = fs.readFileSync(planPath, 'utf-8');
  // 提取所有内容作为创作背景（跳过标题行）
  const lines = content.split('\n');
  const title = lines[0].replace(/^#\s+/, '').trim();
  const background = lines.slice(1).join('\n').trim();

  return { title, background };
}

/**
 * 注入二虎音色到 prompt.json
 */
function injectErhuProfile(promptPath) {
  const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));
  promptData.music_prompt = {
    ...promptData.music_prompt,
    ...ERHU_VOCAL_PROFILE
  };
  fs.writeFileSync(promptPath, JSON.stringify(promptData, null, 2), 'utf-8');
  return promptData;
}

/**
 * 更新索引状态
 */
function updateIndex(songName, status) {
  const indexPath = path.join(ERHU_DATA_DIR, 'INDEX.md');
  if (!fs.existsSync(indexPath)) return;

  let content = fs.readFileSync(indexPath, 'utf-8');
  const statusEmoji = {
    'processing': '🟡 处理中',
    'done': '🟢 已完成',
    'failed': '❌ 失败'
  };

  // 查找作品名在索引中的行并更新
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`| ${songName} |`)) {
      const cols = lines[i].split('|');
      if (cols.length >= 4) {
        cols[3] = ` ${statusEmoji[status]} `;
        lines[i] = cols.join('|');
        break;
      }
    }
  }
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const songName = args.find(a => !a.startsWith('--'));

  if (!songName) {
    console.error('用法: node compose.js <作品名> [--dry-run]');
    process.exit(1);
  }

  try {
    // 1. 查找计划文档
    const planPath = findPlan(songName);
    const { title, background } = extractBackground(planPath);
    console.log(`📖 作品: "${title}" (${songName})`);

    // 2. 创建 lemong-agent 数据目录
    const lemongDir = path.join(LEMONG_DATA_DIR, songName);
    const erhuDir = path.join(ERHU_DATA_DIR, songName);
    const backgroundPath = path.join(lemongDir, '创作背景.md');

    if (!fs.existsSync(lemongDir)) {
      fs.mkdirSync(lemongDir, { recursive: true });
    }
    if (!fs.existsSync(erhuDir)) {
      fs.mkdirSync(erhuDir, { recursive: true });
    }

    // 写入创作背景（注入二虎音色信息）
    const fullBackground = `${background}\n\n## 歌手信息\n- 歌手: 二虎 (Erhu)\n- 音色: 沙哑随性、鼻音重，Eagles 风格\n- 要求: ${ERHU_VOCAL_PROFILE.vocal_style}`;
    fs.writeFileSync(backgroundPath, fullBackground, 'utf-8');
    console.log('📝 创作背景已写入');

    if (dryRun) {
      console.log('🔍 --dry-run 模式，跳过实际生成');
      console.log(`   将调用: node ${path.join(LEMONG_SCRIPTS, 'generate-from-background.js')} "${songName}"`);
      return;
    }

    // 3. 步骤一：生成歌词 + music_prompt
    updateIndex(songName, 'processing');
    console.log('🤖 步骤一: 调用 DeepSeek 生成歌词 + music_prompt...');
    execSync(`node ${path.join(LEMONG_SCRIPTS, 'generate-from-background.js')} "${songName}"`, {
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit'
    });

    // 4. 注入二虎音色
    const promptPath = path.join(lemongDir, 'prompt.json');
    injectErhuProfile(promptPath);
    console.log('🎤 已注入二虎音色模板');

    // 5. 步骤二：生成音乐
    console.log('🎵 步骤二: 调用 ACE API 生成音乐...');
    const lyricsPath = path.join(lemongDir, '歌词.md');
    const lyricsContent = fs.readFileSync(lyricsPath, 'utf-8');
    // 提取纯歌词（去掉 markdown 标题和元数据）
    const lyricsText = lyricsContent
      .replace(/^#.*\n/gm, '')
      .replace(/^>.*\n/gm, '')
      .replace(/^\n+/, '')
      .trim();

    // 用 execSync 传递多行歌词：将歌词写入临时文件，通过环境变量传递
    const lyricsFile = path.join(lemongDir, '.lyrics_tmp.txt');
    fs.writeFileSync(lyricsFile, lyricsText, 'utf-8');
    const env = { ...process.env, LYRICS_FILE: lyricsFile };
    execSync(
      `node ${path.join(LEMONG_SCRIPTS, 'generate-music.js')} --prompt-json "${promptPath}" --lyrics-file "${lyricsFile}" --title "${title}"`,
      { cwd: WORKSPACE_ROOT, stdio: 'inherit', env }
    );

    // 6. 复制产物到 Erhu-data
    console.log('📦 复制产物到 Erhu-data...');
    const mp3Src = path.join(lemongDir, `${title}.mp3`);
    if (fs.existsSync(mp3Src)) {
      fs.copyFileSync(mp3Src, path.join(erhuDir, `${songName}.mp3`));
      console.log(`   ✅ ${songName}.mp3`);
    }
    fs.copyFileSync(lyricsPath, path.join(erhuDir, '歌词.txt'));
    console.log('   ✅ 歌词.txt');
    fs.copyFileSync(promptPath, path.join(erhuDir, 'prompt.json'));
    console.log('   ✅ prompt.json');
    fs.copyFileSync(backgroundPath, path.join(erhuDir, '创作背景.md'));
    console.log('   ✅ 创作背景.md');

    // 7. 更新索引
    updateIndex(songName, 'done');
    console.log(`\n✅ 完成: "${title}" → ${erhuDir}`);

  } catch (err) {
    updateIndex(songName, 'failed');
    console.error(`❌ 失败: ${err.message}`);
    process.exit(1);
  }
}

main();
