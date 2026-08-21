#!/usr/bin/env node
/**
 * Lemong Agent — 音乐生成模块
 * 
 * 调用 ACE Step1.5 API (OpenAI 兼容接口) 生成音乐。
 * 支持两种输入方式：
 *   1. --prompt-json: 直接传入 generate-prompt.js 输出的 music_prompt JSON
 *   2. --style + --lyrics: 使用内置风格模板（向后兼容）
 * 
 * 用法:
 *   # 方式一：传入 music_prompt JSON（推荐，对接 generate-prompt.js）
 *   node scripts/generate-music.js --prompt-json "music_prompt.json" --title "歌曲名" --lyrics "歌词"
 *   
 *   # 方式二：使用风格模板
 *   node scripts/generate-music.js --style "中文古风" --lyrics "歌词内容" --title "歌曲名"
 *   
 *   # 指定输出文件名
 *   node scripts/generate-music.js ... --output "custom_name"
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============

const ACE_API_KEY = process.env.ACE_API_KEY || '';
const ACE_BASE_URL = 'https://api.acemusic.ai';
const ACE_MODEL = 'acemusic/acestep-v1.5-turbo';
const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const BASE_DATA_DIR = process.env.LEMONG_DATA_DIR || path.join(WORKSPACE_ROOT, 'data', 'Lemong-data');

// ============ 6 种风格模板（向后兼容） ============

const STYLE_TEMPLATES = {
  '中文古风': {
    prompt: `Generate music: Chinese ancient style (古风) music with traditional Chinese instruments - guzheng (古筝), dizi (笛子), erhu (二胡), pipa (琵琶). Elegant and flowing melody with pentatonic scale. Moderate tempo with natural breath pauses. Poetic and nostalgic atmosphere, like ink wash painting coming alive. Use Chinese vocal language.`,
    tempo: '70-90 BPM',
    instruments: 'guzheng, dizi, erhu, pipa, wooden fish, bells',
    mood: 'elegant, nostalgic, poetic'
  },
  '流行': {
    prompt: `Generate music: Modern Chinese pop (华语流行) song with catchy melody and emotional vocals. Standard pop structure with memorable verse-chorus-bridge arrangement. Warm piano and acoustic guitar foundation with subtle synth pads. Clean production with clear vocal presence. Use Chinese vocal language.`,
    tempo: '90-120 BPM',
    instruments: 'piano, acoustic guitar, synth pads, bass, drums',
    mood: 'warm, emotional, accessible'
  },
  '校园民谣': {
    prompt: `Generate music: Campus folk song (校园民谣) with fingerpicked acoustic guitar as the main instrument. Simple and sincere melody with storytelling quality. Warm and intimate atmosphere reminiscent of youth and campus memories. Light percussion (cajon or shaker) and occasional harmonica. Gentle, unhurried tempo. Use Chinese vocal language.`,
    tempo: '75-95 BPM',
    instruments: 'acoustic guitar (fingerpicking), cajon, harmonica, light strings',
    mood: 'nostalgic, sincere, warm, youthful'
  },
  '爵士': {
    prompt: `Generate music: Smooth jazz song with swing rhythm and sophisticated harmony. Mellow saxophone lead with warm piano accompaniment. Walking bass line and brushed drums. Relaxed lounge atmosphere with rich seventh chords and subtle improvisation. Use Chinese vocal language with a smooth, relaxed delivery.`,
    tempo: '80-110 BPM',
    instruments: 'saxophone, piano, double bass, brushed drums, muted trumpet',
    mood: 'sophisticated, relaxed, mellow, romantic'
  },
  '电子': {
    prompt: `Generate music: Electronic music with synthesizer-driven sound and strong rhythmic beats. Layered textures with dynamic energy - atmospheric intro, building tension, and powerful drops. Modern futuristic sound with clean production. Pulsing bass and crisp percussion. Use Chinese vocal language with processed/modern vocal delivery.`,
    tempo: '120-140 BPM',
    instruments: 'synthesizers, drum machine, bass synth, pads, arpeggiator',
    mood: 'energetic, futuristic, dynamic, modern'
  },
  '男女对唱': {
    prompt: `Generate music: Male-female duet (男女对唱) love song with two distinct vocal parts in conversational interplay. The male voice is warm and deep, the female voice is clear and sweet. They alternate verses and harmonize in the chorus. Gentle piano and string arrangement with romantic atmosphere. Balanced mix highlighting both voices equally. Use Chinese vocal language with natural emotional delivery.`,
    tempo: '75-95 BPM',
    instruments: 'piano, strings, acoustic guitar, light percussion',
    mood: 'romantic, conversational, emotional, tender'
  }
};

// ============ music_prompt 构建 ============

/**
 * 从 music_prompt JSON 构建 ACE API 的 user content
 * @param {object} mp - music_prompt 对象（来自 generate-prompt.js 输出）
 * @param {string} lyrics - 完整歌词文本
 * @param {object} [singerProfile] - 可选，歌手 Profile 对象
 * @returns {string} ACE API 的 content 字符串
 */
function buildPromptFromMusicPrompt(mp, lyrics, singerProfile) {
  const parts = [];

  // 核心风格描述（英文 caption）
  if (mp.caption_en) {
    parts.push(`Generate a Chinese (Mandarin) song: ${mp.caption_en}`);
  } else {
    parts.push('Generate a Chinese (Mandarin) song.');
  }

  // 注入歌手声音特征（如果有指定歌手）
  if (singerProfile && singerProfile.usage_in_prompt?.vocal_style_injection) {
    parts.push(`\nSinger vocal characteristics: ${singerProfile.usage_in_prompt.vocal_style_injection}`);
  }

  // 音乐参数（有意排除 bpm/key_scale/chord_progression：
  // 这些参数会限制 ACE 旋律灵活性，导致中文歌词断句不匹配）
  const params = [];
  if (mp.instruments) params.push(`Instruments: ${typeof mp.instruments === 'string' ? mp.instruments : mp.instruments.join(', ')}`);
  if (mp.mood) params.push(`Mood: ${typeof mp.mood === 'string' ? mp.mood : mp.mood.join(', ')}`);
  if (mp.vocal_style) params.push(`Vocal Style: ${mp.vocal_style}`);
  if (mp.time_signature) params.push(`Time Signature: ${mp.time_signature}`);
  if (mp.special_notes) params.push(`Special Notes: ${mp.special_notes}`);

  if (params.length > 0) {
    parts.push(`\n${params.join('\n')}`);
  }

  // 强约束：vocal_language 和 instrumental 写入 content 中（Chat Completions 接口不支持顶层字段）
  parts.push('\nvocal_language: zh');
  parts.push('instrumental: false');

  // 前奏时长约束：防止 ACE 生成过长的前奏
  parts.push('\nArrangement constraint: The intro section MUST be 15-20 seconds long, no more than 20 seconds. Start vocals promptly after the intro.');

  // 歌词 — 放在最后，使用强约束防止 LM 改写
  // 经实测验证 (test_N): 此格式 + 足够长的中文歌词可以成功让 ACE 用中文演唱
  if (lyrics) {
    parts.push(`\nLYRICS (Chinese, MUST sing exactly these in Mandarin, do NOT translate):\n${lyrics}`);
  }

  return parts.join('\n');
}

// ============ 音乐元数据解析 ============

function parseMetadata(content) {
  const metadata = {};
  
  // 检查是否是有歌词的简化响应
  if (!content || content.includes('Music generated successfully')) {
    return metadata;
  }
  
  const bpmMatch = content.match(/\*\*BPM:\*\*\s*(\d+)/);
  if (bpmMatch) metadata.bpm = parseInt(bpmMatch[1]);
  
  const durationMatch = content.match(/\*\*Duration:\*\*\s*(\d+)s/);
  if (durationMatch) metadata.duration = parseInt(durationMatch[1]);
  
  const keyMatch = content.match(/\*\*Key:\*\*\s*(.+)/);
  if (keyMatch) metadata.key = keyMatch[1].trim();
  
  const captionMatch = content.match(/\*\*Caption:\*\*\s*(.+)/);
  if (captionMatch) metadata.caption = captionMatch[1].trim();
  
  const timeMatch = content.match(/\*\*Time Signature:\*\*\s*(.+)/);
  if (timeMatch) metadata.time_signature = timeMatch[1].trim();
  
  const langMatch = content.match(/\*\*Language:\*\*\s*(.+)/);
  if (langMatch) metadata.language = langMatch[1].trim();
  
  return metadata;
}

// ============ API 调用 ============

/**
 * 生成音乐（统一入口）
 * 
 * @param {object} options
 * @param {string} [options.style] - 风格名称（方式二：风格模板模式）
 * @param {object} [options.musicPrompt] - music_prompt JSON 对象（方式一：prompt-json 模式）
 * @param {string} options.lyrics - 完整歌词文本
 * @param {string} options.title - 歌曲标题
 * @param {object} [options.singerProfile] - 可选，歌手 Profile 对象
 */
async function generateMusic({ style, musicPrompt, lyrics, title, singerProfile }) {
  if (!ACE_API_KEY) {
    throw new Error('未设置 ACE_API_KEY 环境变量');
  }

  let fullPrompt;

  if (musicPrompt) {
    // 方式一：使用 music_prompt JSON
    fullPrompt = buildPromptFromMusicPrompt(musicPrompt, lyrics, singerProfile);
    console.error(`🎵 使用自定义 music_prompt 生成音乐...`);
  } else if (style) {
    // 方式二：使用内置风格模板
    const template = STYLE_TEMPLATES[style];
    if (!template) {
      throw new Error(`未知风格: "${style}"。可用风格: ${Object.keys(STYLE_TEMPLATES).join(', ')}`);
    }
    let stylePrompt = template.prompt;

    // 注入歌手声音特征（如果有指定歌手）
    if (singerProfile && singerProfile.usage_in_prompt?.vocal_style_injection) {
      stylePrompt += `\nSinger vocal characteristics: ${singerProfile.usage_in_prompt.vocal_style_injection}`;
    }

    // 强约束：vocal_language 和 instrumental 写入 content 中
    const vocalConstraint = '\nvocal_language: zh\ninstrumental: false';

    fullPrompt = `${stylePrompt}${vocalConstraint}

LYRICS (Chinese, MUST sing exactly these in Mandarin, do NOT translate):
${lyrics}

Tempo: ${template.tempo}
Instruments: ${template.instruments}
Mood: ${template.mood}`;
    console.error(`🎵 使用风格模板 "${style}" 生成音乐...`);
    if (singerProfile) {
      console.error(`🎤 歌手特征已注入: ${singerProfile.name}`);
    }
  } else {
    throw new Error('必须指定 --style 或 --prompt-json 参数');
  }

  // 构建 API 请求体
  // 关键: 歌词和语言约束都必须放在 content 文本中，Chat Completions 接口
  // 不支持顶层的 lyrics/vocal_language 字段（这些是原生 /release_task API 的参数）。
  // 经实测验证 (test_N): 当歌词足够长（>8行中文），加上强约束指令
  // "LYRICS (Chinese, MUST sing exactly these in Mandarin, do NOT translate)"
  // 可以成功让 ACE 用中文演唱原始歌词。
  const requestBody = {
    model: ACE_MODEL,
    messages: [
      {
        role: 'user',
        content: fullPrompt
      }
    ],
    max_tokens: 4000
  };

  const body = JSON.stringify(requestBody);

  const url = new URL('/v1/chat/completions', ACE_BASE_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACE_API_KEY}`,
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 360000 // 6 分钟超时（中文长歌词实际需要 3-4 分钟）
  };

  console.error(`   标题: ${title}`);
  console.error(`   歌词长度: ${lyrics.length} 字符`);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          let errorMsg;
          switch (res.statusCode) {
            case 401: case 403:
              errorMsg = 'ACE Music API Key 无效或已过期';
              break;
            case 429:
              errorMsg = 'ACE Music API 请求过于频繁，请稍后重试';
              break;
            case 404:
              errorMsg = 'ACE Music API 端点不存在';
              break;
            case 500:
              errorMsg = 'ACE Music 服务器内部错误';
              break;
            default:
              errorMsg = `ACE Music API 错误 (${res.statusCode})`;
          }
          reject(new Error(errorMsg));
          return;
        }
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(new Error(`解析 ACE 响应失败: ${e.message}`));
        }
      });
    });
    req.on('error', (e) => {
      reject(new Error(`ACE Music 服务暂时不可用: ${e.message}`));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('ACE Music API 请求超时（6分钟）'));
    });
    req.write(body);
    req.end();
  });
}

// ============ 主流程 ============

async function main() {
  const args = process.argv.slice(2);
  
  const styleIndex = args.indexOf('--style');
  const lyricsIndex = args.indexOf('--lyrics');
  const lyricsFileIndex = args.indexOf('--lyrics-file');
  const titleIndex = args.indexOf('--title');
  const outputIndex = args.indexOf('--output');
  const promptJsonIndex = args.indexOf('--prompt-json');
  
  // 验证必需参数
  const hasLyrics = lyricsIndex !== -1 || lyricsFileIndex !== -1;
  if (!hasLyrics || titleIndex === -1) {
    console.error('用法:');
    console.error('  方式一（推荐）: node generate-music.js --prompt-json "path/to/music_prompt.json" --lyrics "歌词" --title "标题"');
    console.error('  方式一（文件）: node generate-music.js --prompt-json "path/to/music_prompt.json" --lyrics-file "path/to/lyrics.txt" --title "标题"');
    console.error('  方式二（兼容）: node generate-music.js --style "风格" --lyrics "歌词" --title "标题"');
    console.error(`  可用风格: ${Object.keys(STYLE_TEMPLATES).join(', ')}`);
    process.exit(1);
  }

  if (styleIndex === -1 && promptJsonIndex === -1) {
    console.error('错误: 必须指定 --style 或 --prompt-json');
    process.exit(1);
  }
  
  // 支持从文件读取歌词（解决 shell 命令行传参时换行符被转义的问题）
  let lyrics;
  if (lyricsFileIndex !== -1) {
    const lyricsFilePath = args[lyricsFileIndex + 1];
    lyrics = fs.readFileSync(lyricsFilePath, 'utf-8').trim();
    console.error(`📄 已从文件读取歌词: ${lyricsFilePath} (${lyrics.length} 字符)`);
  } else {
    lyrics = args[lyricsIndex + 1];
  }
  const title = args[titleIndex + 1];

  // 解析 music_prompt（方式一）
  let musicPrompt = null;
  let style = null;

  if (promptJsonIndex !== -1) {
    const promptPath = args[promptJsonIndex + 1];
    if (!promptPath) {
      console.error('错误: --prompt-json 需要指定文件路径');
      process.exit(1);
    }
    try {
      const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));
      // 支持完整输出（含 lyrics + music_prompt）或纯 music_prompt
      musicPrompt = promptData.music_prompt || promptData;
      console.error(`📄 已加载 music_prompt: ${promptPath}`);
    } catch (err) {
      console.error(`错误: 无法读取 music_prompt JSON 文件: ${err.message}`);
      process.exit(1);
    }
  } else {
    style = args[styleIndex + 1];
  }
  
  try {
    const result = await generateMusic({ style, musicPrompt, lyrics, title });
    
    // 提取音频
    const choices = result.choices;
    if (!choices || choices.length === 0) {
      throw new Error('ACE Music 返回数据为空');
    }
    
    const message = choices[0].message;
    if (!message || !message.audio || message.audio.length === 0) {
      throw new Error('ACE Music 未生成音频');
    }
    
    const audioUrl = message.audio[0].audio_url?.url;
    if (!audioUrl) {
      throw new Error('ACE Music 音频 URL 为空');
    }
    
    // 解码 base64 → MP3（兼容多种 MIME type）
    const base64Data = audioUrl.replace(/^data:audio\/[^;]+;base64,/, '');
    if (!base64Data) {
      throw new Error('音频 base64 数据为空');
    }
    
    const audioBuffer = Buffer.from(base64Data, 'base64');
    
    // 生成文件名（固定歌名.mp3，不再带时间戳）
    const now = new Date();
    const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_').slice(0, 30);
    const filename = `${safeTitle}.mp3`;

    // 输出目录: data/Lemong-data/{歌名}/
    const songDir = path.join(BASE_DATA_DIR, safeTitle);
    if (!fs.existsSync(songDir)) {
      fs.mkdirSync(songDir, { recursive: true });
    }

    // 1. 保存 MP3
    const mp3Path = path.join(songDir, filename);
    fs.writeFileSync(mp3Path, audioBuffer);

    // 解析元数据
    const metadata = parseMetadata(message.content || '');

    // 2. 保存歌词.md
    const lyricsMdPath = path.join(songDir, '歌词.md');
    const lyricsMdContent = `# ${title}

> 创作时间: ${now.toISOString()}

${lyrics}
`;
    fs.writeFileSync(lyricsMdPath, lyricsMdContent, 'utf-8');
    console.error(`📝 歌词已保存: ${lyricsMdPath}`);

    // 3. 保存 prompt.json
    const promptJsonPath = path.join(songDir, 'prompt.json');
    const promptData = {
      title: title,
      style: style || '',
      created_at: now.toISOString(),
      music_prompt: musicPrompt || null,
      lyrics: lyrics,
      audio: {
        file: filename,
        file_size: audioBuffer.length,
        ...metadata
      }
    };
    fs.writeFileSync(promptJsonPath, JSON.stringify(promptData, null, 2), 'utf-8');
    console.error(`📋 Prompt 已保存: ${promptJsonPath}`);

    // 4. 发布到云端（R2 + D1）——失败不阻塞生成流程
    try {
      const { execSync } = require('child_process');
      const relDir = path.relative(path.join(WORKSPACE_ROOT, 'data'), songDir);
      execSync(`node scripts/publish.js song "${relDir}"`, {
        cwd: WORKSPACE_ROOT,
        stdio: 'pipe',
        timeout: 180000
      });
      console.error(`🚀 已发布到云端: ${relDir}`);
    } catch (publishErr) {
      console.error(`⚠️  云端发布跳过: ${String(publishErr.message || publishErr).split('\n')[0]}`);
    }

    // 输出结果
    const output = {
      success: true,
      title: title,
      file: filename,
      file_path: mp3Path,
      file_size: audioBuffer.length,
      song_dir: path.relative(WORKSPACE_ROOT, songDir),
      lyrics_file: path.relative(WORKSPACE_ROOT, lyricsMdPath),
      prompt_file: path.relative(WORKSPACE_ROOT, promptJsonPath),
      metadata: metadata,
      raw_content: message.content
    };
    if (style) output.style = style;
    if (musicPrompt) output.music_prompt_used = true;

    console.log(JSON.stringify(output, null, 2));
    console.error(`✅ 音乐生成完成: ${filename} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`❌ 音乐生成失败: ${err.message}`);
    process.exit(1);
  }
}

// ============ 导出 ============

module.exports = {
  generateMusic,
  buildPromptFromMusicPrompt,
  STYLE_TEMPLATES,
  BASE_DATA_DIR
};

// ============ 独立运行 ============

if (require.main === module) {
  main();
}
