#!/usr/bin/env node
/**
 * Lemong Agent — 从创作背景生成歌词 + music_prompt
 * 
 * 用途：读取 data/Lemong-data/{歌名}/创作背景.md，调用 DeepSeek 生成歌词 + 配乐方案。
 * 这是两步流程的第一步（生成歌词），第二步由 generate-music.js 完成（生成音乐）。
 * 
 * 用法:
 *   node scripts/generate-from-background.js "歌名"
 * 
 * 输入:  data/Lemong-data/{歌名}/创作背景.md
 * 输出:  data/Lemong-data/{歌名}/歌词.md + prompt.json（含 lyrics + music_prompt）
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = 'deepseek-chat';
const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'Lemong-data');

// ============ 系统提示词 ============

const SYSTEM_PROMPT = `你是一位优秀的现代诗诗人。用户提供歌曲创作背景，你需要生成诗稿（歌词）+ 配乐方案。

**核心原则**：诗的主题、内容和情感必须完全基于用户指定的创作背景。不要偏离。

## 输出格式

严格按以下 JSON 格式输出：

{
  "title": "歌曲名称",
  "lyrics": {
    "structure": "结构说明（A段→副歌→B段→副歌→C段 等）",
    "full_text": "完整歌词（含段落标注如 [A段][副歌][B段][C段]），押韵工整，适合吟唱",
    "notes": "创作说明"
  },
  "music_prompt": {
    "caption_en": "英文风格描述。简洁扼要（不超过3句话），只描述风格+乐器+人声，不给微观旋律指令",
    "instruments": "乐器列表",
    "mood": "情绪关键词",
    "vocal_language": "zh",
    "vocal_style": "人声风格（简洁，1-2句话）",
    "duration": 180,
    "time_signature": "4/4",
    "audio_format": "mp3",
    "thinking": true,
    "special_notes": "CRITICAL: Chinese (Mandarin) song, no English lyrics"
  }
}

## 约束

- 不要指定 bpm、key_scale、chord_progression
- caption_en 必须简洁（≤100字符），不要描述微观旋律走向
- vocal_style 简洁（≤50字符）
- 歌词押韵工整，意象丰富，200-400字
- special_notes 中必须包含前奏约束：\"前奏(intro)时长控制在15-20秒，不要超过20秒\"
- 只输出 JSON，不要其他内容`;

// ============ 核心函数 ============

/**
 * 从创作背景构建 LLM 上下文
 */
function buildContext(background) {
  return `根据以下创作背景，生成歌词和配乐方案：

${background}

请输出 JSON（只输出 JSON，不要其他内容）。`;
}

/**
 * 调用 DeepSeek API
 */
async function callLLM(userContext) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('未设置 DEEPSEEK_API_KEY 环境变量');
  }

  const body = JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContext }
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
          reject(new Error(`DeepSeek API ${res.statusCode}: ${data.substring(0, 300)}`));
          return;
        }
        const result = JSON.parse(data);
        resolve(result.choices[0].message.content);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * 从 LLM 响应中解析 JSON
 */
function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) {}
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) { try { return JSON.parse(codeMatch[1].trim()); } catch (e) {} }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch (e) {} }
  throw new Error('无法解析 JSON');
}

// ============ 主流程 ============

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法: node generate-from-background.js <歌名>');
    console.error('示例: node generate-from-background.js 幻觉');
    process.exit(1);
  }

  const songName = args[0];
  const songDir = path.join(DATA_DIR, songName);
  const backgroundPath = path.join(songDir, '创作背景.md');

  // 1. 检查创作背景是否存在
  if (!fs.existsSync(backgroundPath)) {
    console.error(`❌ 未找到创作背景: ${backgroundPath}`);
    console.error('   请先在 data/Lemong-data/{歌名}/ 下创建 创作背景.md');
    process.exit(1);
  }

  try {
    // 2. 读取创作背景
    const background = fs.readFileSync(backgroundPath, 'utf-8');
    console.error(`📖 已读取创作背景: ${songName}`);

    // 3. 调用 DeepSeek 生成歌词 + music_prompt
    console.error('🤖 调用 DeepSeek 生成歌词 + music_prompt...');
    const context = buildContext(background);
    const response = await callLLM(context);
    const output = parseJSON(response);
    console.error(`✅ 生成完成: "${output.title}"`);
    console.error(`   歌词: ${output.lyrics?.full_text?.length || 0} 字`);

    // 4. 确保输出目录存在
    if (!fs.existsSync(songDir)) {
      fs.mkdirSync(songDir, { recursive: true });
    }

    // 5. 保存歌词.md
    const lyricsMd = `# ${output.title}\n\n> 生成时间: ${new Date().toISOString()}\n\n${output.lyrics.full_text}\n`;
    fs.writeFileSync(path.join(songDir, '歌词.md'), lyricsMd, 'utf-8');
    console.error('📝 歌词已保存: 歌词.md');

    // 6. 保存 prompt.json（含 music_prompt，待 generate-music.js 使用）
    const promptData = {
      title: output.title,
      created_at: new Date().toISOString(),
      music_prompt: output.music_prompt,
      lyrics: output.lyrics.full_text
    };
    fs.writeFileSync(path.join(songDir, 'prompt.json'), JSON.stringify(promptData, null, 2), 'utf-8');
    console.error('📋 prompt.json 已保存');

    // 7. 输出 JSON 结果（供脚本链式调用）
    console.log(JSON.stringify({
      success: true,
      song_name: songName,
      title: output.title,
      lyrics_length: output.lyrics.full_text.length,
      files: {
        lyrics: path.join(songDir, '歌词.md'),
        prompt: path.join(songDir, 'prompt.json')
      }
    }, null, 2));

    console.error('\n💡 下一步: 运行 generate-music.js 生成音乐');
    console.error(`   node scripts/generate-music.js --prompt-json "${path.join(songDir, 'prompt.json')}" --lyrics "${output.lyrics.full_text.replace(/"/g, '\\"').substring(0, 50)}..." --title "${output.title}"`);

  } catch (err) {
    console.error(`❌ 失败: ${err.message}`);
    process.exit(1);
  }
}

// ============ 导出 ============

module.exports = {
  buildContext,
  callLLM,
  parseJSON,
  DATA_DIR
};

// ============ 独立运行 ============

if (require.main === module) {
  main();
}
