#!/usr/bin/env node
/**
 * 测试副本：两步流程 v2 — 歌词保存为 .txt 文件
 * 
 * 步骤一：generate_lyrics_txt.js
 *   读取 创作背景.md → DeepSeek 生成歌词 → 保存 {歌名}.txt（含结构标注）
 *   等待用户确认
 * 
 * 步骤二：generate_music_from_txt.js
 *   读取 {歌名}.txt + prompt.json → ACE Chat Completions → 保存 {歌名}.mp3
 * 
 * 用法:
 *   node test_lyrics_flow.js step1 <歌名>    # 生成歌词 .txt
 *   node test_lyrics_flow.js step2 <歌名>    # 从 .txt 生成音乐
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 加载 .env 文件
const WORKSPACE_ROOT = '/workspace';
const envPath = path.join(WORKSPACE_ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  });
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const ACE_API_KEY = process.env.ACE_API_KEY || '';
const DEEPSEEK_MODEL = 'deepseek-chat';
const ACE_MODEL = 'acemusic/acestep-v1.5-turbo';
const DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'Lemong-data');

// ============ 步骤一：生成歌词 .txt ============

const SYSTEM_PROMPT = `你是一位优秀的作词人。用户提供歌曲创作背景，你需要生成歌词（中文，带结构标注）。

## 输出格式

严格按以下 JSON 格式输出：

{
  "title": "歌曲名称",
  "structure": "结构说明（如：Verse 1 → Chorus → Verse 2 → Chorus → Bridge → Outro）",
  "lyrics": "完整歌词，使用标准结构标注 [Verse 1] [Chorus] [Verse 2] [Bridge] [Outro] 等。\n押韵工整，意象丰富，适合演唱。200-400字。",
  "music_prompt": {
    "caption_en": "英文风格描述。简洁扼要（≤100字符），只描述风格+乐器+人声",
    "instruments": "乐器列表",
    "mood": "情绪关键词",
    "vocal_style": "人声风格（简洁，≤50字符）",
    "vocal_language": "zh",
    "duration": 180,
    "time_signature": "4/4",
    "audio_format": "mp3",
    "thinking": true,
    "special_notes": "CRITICAL: Chinese (Mandarin) song, no English lyrics"
  }
}

## 约束

- 不要指定 bpm、key_scale、chord_progression
- caption_en 必须简洁（≤100字符），不描述微观旋律
- 歌词押韵工整，200-400字
- 只输出 JSON，不要其他内容`;

async function callDeepSeek(context) {
  if (!DEEPSEEK_API_KEY) throw new Error('未设置 DEEPSEEK_API_KEY');

  const body = JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `根据以下创作背景，生成歌词和配乐方案：\n\n${context}\n\n请输出 JSON（只输出 JSON）。` }
    ],
    temperature: 0.6,
    max_tokens: 4000
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 60000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`DeepSeek ${res.statusCode}: ${data.substring(0, 300)}`));
          return;
        }
        resolve(JSON.parse(data).choices[0].message.content);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) {}
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) { try { return JSON.parse(codeMatch[1].trim()); } catch (e) {} }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch (e) {} }
  throw new Error('无法解析 JSON');
}

async function step1_generateLyrics(songName) {
  const songDir = path.join(DATA_DIR, songName);
  const backgroundPath = path.join(songDir, '创作背景.md');

  if (!fs.existsSync(backgroundPath)) {
    console.error(`❌ 未找到创作背景: ${backgroundPath}`);
    process.exit(1);
  }

  // 读取创作背景
  const background = fs.readFileSync(backgroundPath, 'utf-8');
  console.error(`📖 已读取创作背景: ${songName}`);

  // 调用 DeepSeek
  console.error('🤖 调用 DeepSeek 生成歌词...');
  const response = await callDeepSeek(background);
  const output = parseJSON(response);

  if (!output.lyrics) {
    console.error('❌ DeepSeek 未生成歌词');
    process.exit(1);
  }

  // 确保目录存在
  if (!fs.existsSync(songDir)) fs.mkdirSync(songDir, { recursive: true });

  // 保存 {歌名}.txt（纯歌词 + 结构标注）
  const txtPath = path.join(songDir, `${songName}.txt`);
  const txtContent = `# ${output.title}

# 结构: ${output.structure || '未指定'}

${output.lyrics}
`;
  fs.writeFileSync(txtPath, txtContent, 'utf-8');
  console.error(`📝 歌词已保存: ${path.relative(WORKSPACE_ROOT, txtPath)}`);
  console.error(`   结构: ${output.structure}`);
  console.error(`   歌词长度: ${output.lyrics.length} 字符`);

  // 保存 prompt.json（music_prompt，不含歌词，歌词从 .txt 读取）
  const promptPath = path.join(songDir, 'prompt.json');
  const promptData = {
    title: output.title,
    created_at: new Date().toISOString(),
    music_prompt: output.music_prompt || {}
  };
  fs.writeFileSync(promptPath, JSON.stringify(promptData, null, 2), 'utf-8');
  console.error(`📋 prompt.json 已保存: ${path.relative(WORKSPACE_ROOT, promptPath)}`);

  // 输出结果
  console.log(JSON.stringify({
    success: true,
    song_name: songName,
    title: output.title,
    structure: output.structure,
    lyrics_preview: output.lyrics.substring(0, 100) + '...',
    files: {
      lyrics_txt: path.relative(WORKSPACE_ROOT, txtPath),
      prompt_json: path.relative(WORKSPACE_ROOT, promptPath)
    },
    next_step: `请审阅歌词后，运行: node test_lyrics_flow.js step2 "${songName}"`
  }, null, 2));

  console.error('\n⚠️  请审阅歌词内容，确认后执行步骤二。');
}

// ============ 步骤二：从 .txt 生成音乐 ============

async function callACE(prompt, lyrics) {
  if (!ACE_API_KEY) throw new Error('未设置 ACE_API_KEY');

  const content = `${prompt}

vocal_language: zh
instrumental: false

LYRICS (Chinese, MUST sing exactly these in Mandarin, do NOT translate):
${lyrics}`;

  const body = JSON.stringify({
    model: ACE_MODEL,
    messages: [{ role: 'user', content }],
    max_tokens: 4000
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.acemusic.ai',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACE_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 360000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`ACE ${res.statusCode}: ${data.substring(0, 300)}`));
          return;
        }
        const result = JSON.parse(data);
        const msg = result.choices?.[0]?.message;
        const audioUrl = msg?.audio?.[0]?.audio_url?.url;
        if (!audioUrl) {
          reject(new Error('ACE 未生成音频'));
          return;
        }
        const base64Data = audioUrl.replace(/^data:audio\/[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        resolve(buffer);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function buildPromptFromMusicPrompt(mp) {
  const parts = [];
  if (mp.caption_en) {
    parts.push(`Generate a Chinese (Mandarin) song: ${mp.caption_en}`);
  } else {
    parts.push('Generate a Chinese (Mandarin) song.');
  }
  const params = [];
  if (mp.instruments) params.push(`Instruments: ${typeof mp.instruments === 'string' ? mp.instruments : mp.instruments.join(', ')}`);
  if (mp.mood) params.push(`Mood: ${typeof mp.mood === 'string' ? mp.mood : mp.mood.join(', ')}`);
  if (mp.vocal_style) params.push(`Vocal Style: ${mp.vocal_style}`);
  if (mp.time_signature) params.push(`Time Signature: ${mp.time_signature}`);
  if (mp.special_notes) params.push(`Special Notes: ${mp.special_notes}`);
  if (params.length > 0) parts.push(params.join('\n'));
  return parts.join('\n');
}

async function step2_generateMusic(songName) {
  const songDir = path.join(DATA_DIR, songName);
  const txtPath = path.join(songDir, `${songName}.txt`);
  const promptPath = path.join(songDir, 'prompt.json');

  // 检查必要文件
  if (!fs.existsSync(txtPath)) {
    console.error(`❌ 未找到歌词文件: ${txtPath}`);
    console.error('   请先运行步骤一生成歌词');
    process.exit(1);
  }
  if (!fs.existsSync(promptPath)) {
    console.error(`❌ 未找到 prompt.json: ${promptPath}`);
    process.exit(1);
  }

  // 从 .txt 读取歌词（去掉标题和结构注释行）
  const txtContent = fs.readFileSync(txtPath, 'utf-8');
  const lyrics = txtContent
    .replace(/^#.*\n/gm, '')    // 去掉所有 # 开头的行（标题和结构注释）
    .replace(/^\n+/, '')         // 去掉开头空行
    .trim();

  // 读取 music_prompt
  const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));
  const musicPrompt = promptData.music_prompt || {};

  console.error(`🎵 生成音乐: ${songName}`);
  console.error(`   歌词来源: ${path.relative(WORKSPACE_ROOT, txtPath)}`);
  console.error(`   歌词行数: ${lyrics.split('\n').filter(l => l.trim()).length}`);
  console.error(`   歌词字符: ${lyrics.length}`);

  // 构建 prompt
  const prompt = buildPromptFromMusicPrompt(musicPrompt);
  console.error(`   Prompt 长度: ${prompt.length} 字符`);

  // 调用 ACE
  console.error('🎧 调用 ACE API...');
  const audioBuffer = await callACE(prompt, lyrics);

  // 保存 MP3
  const mp3Path = path.join(songDir, `${songName}.mp3`);
  fs.writeFileSync(mp3Path, audioBuffer);

  // 更新 prompt.json 加入元数据
  promptData.lyrics_source = `${songName}.txt`;
  promptData.lyrics = lyrics;
  promptData.audio = {
    file: `${songName}.mp3`,
    file_size: audioBuffer.length,
    created_at: new Date().toISOString()
  };
  fs.writeFileSync(promptPath, JSON.stringify(promptData, null, 2), 'utf-8');

  console.log(JSON.stringify({
    success: true,
    song_name: songName,
    file: `${songName}.mp3`,
    file_path: path.relative(WORKSPACE_ROOT, mp3Path),
    file_size: audioBuffer.length,
    file_size_kb: (audioBuffer.length / 1024).toFixed(1)
  }, null, 2));

  console.error(`✅ 音乐生成完成: ${songName}.mp3 (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
}

// ============ 主入口 ============

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const songName = args[1];

  if (!cmd || !songName) {
    console.error('用法:');
    console.error('  node test_lyrics_flow.js step1 <歌名>    # 生成歌词 .txt');
    console.error('  node test_lyrics_flow.js step2 <歌名>    # 从 .txt 生成音乐');
    process.exit(1);
  }

  try {
    if (cmd === 'step1') {
      await step1_generateLyrics(songName);
    } else if (cmd === 'step2') {
      await step2_generateMusic(songName);
    } else {
      console.error(`未知命令: ${cmd}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ 失败: ${err.message}`);
    process.exit(1);
  }
}

main();
