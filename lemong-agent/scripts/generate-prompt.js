#!/usr/bin/env node
/**
 * Lemong Agent — 提示词生成模块
 * 
 * 加载风格模板 → 收集用户信息 → 调用 LLM 生成诗稿 + 配乐方案
 * 
 * 用法:
 *   由 Lemong Agent 在对话中调用，也支持独立 CLI 测试。
 *   此脚本提供核心函数，供 Agent 编排工作流。
 * 
 * 流程:
 *   1. loadTemplate(style) — 解析模板 Markdown，提取问题列表
 *   2. Agent 按顺序向用户提问，收集答案
 *   3. buildContext(style, answers) — 组装 LLM 上下文
 *   4. callLLM(context) — 调用 DeepSeek 生成现代诗 + 配乐方案
 *   5. parseOutput(response) — 解析 LLM 返回的 JSON
 * 
 * 策略说明:
 *   为绕过 DeepSeek 对"歌词"一词的强烈爱情主题偏好，
 *   System Prompt 将任务描述为"现代诗创作"而非"歌词创作"。
 *   输出的 JSON 结构保持不变（lyrics/music_prompt），
 *   后续流程（generate-music.js）无感知差异。
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';
const TEMPLATES_DIR = path.resolve(__dirname, '../templates');
const SINGER_DIR = path.resolve(__dirname, '../singer');

// ============ 系统提示词 ============
//
// 策略：将任务描述为"现代诗创作"而非"歌词创作"，
// 骗过 DeepSeek 的推理，避免其爱情歌词偏好。
// JSON 输出结构保持不变，下游无感。

const SYSTEM_PROMPT = `你是一位优秀的现代诗诗人。用户提供了创作一首配乐诗的需求，你需要生成两部分输出：诗稿 + 配乐方案。

**核心原则**：诗的主题、内容和情感必须完全基于用户指定的【诗歌主题】和【核心情感】。不要因为任何外部因素而偏离用户指定的主题。用户说什么主题就写什么主题。

## 输出要求

请严格按照以下 JSON 格式输出：

{
  "title": "诗题（用于文件命名，简洁有记忆点）",
  "lyrics": {
    "structure": "诗歌结构说明",
    "full_text": "完整诗稿文本（含段落标注，如 [A段]、[B段]、[C段/高潮] 等）",
    "notes": "创作说明（灵感来源、押韵设计、情感递进等）"
  },
  "music_prompt": {
    "caption_en": "英文配乐风格描述（详细描述风格、乐器、情绪、氛围。如果是中文歌曲，必须注明 Chinese (Mandarin)，并强调旋律应跟随中文歌词的自然节奏和断句）",
    "instruments": "乐器配置列表",
    "mood": "情绪关键词",
    "vocal_language": "zh",
    "vocal_style": "朗诵/吟唱风格描述（中文歌曲需注明 melody should follow natural Chinese phrasing）",
    "duration": 时长秒数,
    "time_signature": "拍号（默认 4/4）",
    "audio_format": "mp3",
    "thinking": true,
    "special_notes": "特殊要求（如有。中文歌曲必须注明 CRITICAL: Chinese song, no English lyrics, melody must follow natural Chinese phrasing）"
  }
}

## 创作规范

### 诗稿规范
- 结构完整，段落标注清晰：[A段]、[B段]、[C段/高潮]、[桥段]、[尾声] 等
- 中文诗需押韵工整，情感递进有层次，意象丰富
- 总字数 200-400 字，适合 2-4 分钟朗诵

### 配乐方案规范
- caption_en 必须用英文撰写，详细描述配乐风格、乐器配置、情绪氛围
- **重要**: 不要指定 bpm、key_scale、chord_progression 参数。ACE 模型会优先满足这些参数，导致旋律无法灵活适配中文歌词的自然断句和呼吸节奏。让模型根据歌词文本自动匹配旋律。
- 默认启用 thinking=true（5Hz LM 提升品质）
- vocal_language 默认 "zh"（中文）

## 朗诵者感知

如果用户上下文中包含【指定朗诵者】信息，你需要：
- 根据朗诵者的声音特征调整 vocal_style 描述
- 根据朗诵者擅长的音乐风格调整 caption_en、instruments、mood 等配乐参数
- 在 special_notes 中注明使用了哪个朗诵者的特征

**重要**：诗的主题、立意和内容**严格由用户指定的【诗歌主题】决定**。朗诵者的创作主题仅供参考配乐方向，不应影响诗稿内容。

## 注意事项
- 只输出 JSON，不要输出其他内容
- JSON 必须是有效的，可以被 JSON.parse 直接解析
- full_text 中的换行使用 \\n`;

// ============ 核心函数 ============

/**
 * 加载风格模板，提取问题列表
 * @param {string} style - 风格名称（如 "中文古风"）
 * @returns {object} { style, questions: [{id, title, question, options, default, usage}] }
 */
function loadTemplate(style) {
  const templatePath = path.join(TEMPLATES_DIR, `${style}.md`);
  
  if (!fs.existsSync(TEMPLATES_DIR)) {
    throw new Error(`模板目录不存在: ${TEMPLATES_DIR}。请检查 templates/ 目录是否完整。`);
  }
  
  if (!fs.existsSync(templatePath)) {
    let available = [];
    try {
      available = fs.readdirSync(TEMPLATES_DIR)
        .filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'chord-progressions.md')
        .map(f => f.replace('.md', ''));
    } catch (e) {
      // readdirSync 失败时保持 available 为空
    }
    throw new Error(`未知风格: "${style}"。可用风格: ${available.join(', ') || '(无)'}`);
  }
  
  const content = fs.readFileSync(templatePath, 'utf-8');
  const questions = parseQuestions(content);
  
  return { style, questions };
}

/**
 * 解析 Markdown 模板，提取问题列表
 */
function parseQuestions(content) {
  const questions = [];
  
  // 按 ### N. 分割问题
  const questionBlocks = content.split(/### \d+\./).slice(1);
  
  for (const block of questionBlocks) {
    const q = {};
    
    // 提取标题（第一行）
    const titleMatch = block.match(/^(.+?)(?:\n|$)/);
    if (titleMatch) q.title = titleMatch[1].trim();
    
    // 提取问题
    const questionMatch = block.match(/\*\*问题\*\*[：:]\s*(.+?)(?:\n|$)/);
    if (questionMatch) q.question = questionMatch[1].trim();
    
    // 提取选项
    const optionsSection = block.match(/\*\*选项\/示例\*\*[：:]?\s*\n([\s\S]*?)(?=\*\*默认值\*\*|$)/);
    if (optionsSection) {
      q.options = optionsSection[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim());
    }
    
    // 提取默认值
    const defaultMatch = block.match(/\*\*默认值\*\*[：:]\s*(.+?)(?:\n|$)/);
    if (defaultMatch) q.default = defaultMatch[1].trim();
    
    // 提取用途
    const usageMatch = block.match(/\*\*用途\*\*[：:]\s*(.+?)(?:\n|$)/);
    if (usageMatch) q.usage = usageMatch[1].trim();
    
    if (q.question) {
      q.id = `q${questions.length + 1}`;
      questions.push(q);
    }
  }
  
  return questions;
}

/**
 * 将收集的答案组装为 LLM 上下文
 * @param {string} style - 风格名称
 * @param {object} answers - { q1: "用户答案", q2: "用户答案", ... }
 * @param {Array} questions - 问题列表
 * @param {object} [singerProfile] - 可选，歌手 Profile 对象
 */
function buildContext(style, answers, questions, singerProfile) {
  const lines = [`【风格】${style}`];
  
  // 先输出用户答案，确保诗稿主题不被其他信息干扰
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const answer = answers[q.id] || q.default || '未指定';
    lines.push(`【${q.title}】${answer}`);
  }
  
  // 注入歌手信息（用户答案之后，仅供配乐参考）
  if (singerProfile) {
    const sp = singerProfile;
    lines.push('');
    lines.push('--- 以下为朗诵者参考信息（仅影响 vocal_style 和配乐参数，不影响诗稿主题）---');
    lines.push(`【指定朗诵者】${sp.name}`);
    if (sp.voice_characteristics?.description) {
      lines.push(`【朗诵者声音特征】${sp.voice_characteristics.description}`);
    }
    if (sp.usage_in_prompt?.vocal_style_injection) {
      lines.push(`【朗诵者人声要求】${sp.usage_in_prompt.vocal_style_injection}`);
    }
    if (sp.usage_in_prompt?.style_injection) {
      lines.push(`【朗诵者配乐偏好】${sp.usage_in_prompt.style_injection}`);
    }
    if (sp.music_style?.typical_instruments) {
      lines.push(`【朗诵者常用乐器】${sp.music_style.typical_instruments.join('、')}`);
    }
    if (sp.music_style?.typical_bpm_range) {
      lines.push(`【朗诵者惯用BPM范围】${sp.music_style.typical_bpm_range}`);
    }
  }
  
  lines.push('');
  lines.push('请根据以上信息，创作：');
  lines.push('A. 现代诗（结构化 JSON，含诗题、段落标注、完整诗稿。诗的主题严格以【诗歌主题】为准，不可偏离）');
  lines.push('B. 配乐方案（英文风格描述 + 完整参数）');
  
  return lines.join('\n');
}

/**
 * 加载歌手 Profile
 * @param {string} singerName - 歌手名称（如 "二虎"）
 * @returns {object|null} 歌手 Profile JSON，如果不存在返回 null
 */
function loadSinger(singerName) {
  if (!singerName) return null;
  
  const profilePath = path.join(SINGER_DIR, singerName, 'profile.json');
  
  if (!fs.existsSync(profilePath)) {
    const available = listSingers();
    console.error(`⚠️  未找到歌手 "${singerName}"。可用歌手: ${available.join(', ') || '(无)'}`);
    return null;
  }
  
  try {
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    return profile;
  } catch (e) {
    console.error(`⚠️  解析歌手 Profile 失败 (${singerName}): ${e.message}`);
    return null;
  }
}

/**
 * 列出所有可用歌手
 * @returns {string[]} 歌手名称列表
 */
function listSingers() {
  if (!fs.existsSync(SINGER_DIR)) return [];
  
  return fs.readdirSync(SINGER_DIR)
    .filter(name => {
      const stat = fs.statSync(path.join(SINGER_DIR, name));
      return stat.isDirectory() && name !== 'README.md';
    })
    .filter(name => {
      const profilePath = path.join(SINGER_DIR, name, 'profile.json');
      return fs.existsSync(profilePath);
    });
}

/**
 * 调用 DeepSeek API
 * @param {string} userContext - 用户上下文
 * @returns {Promise<string>} LLM 原始响应
 */
async function callLLM(userContext) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('未设置 DEEPSEEK_API_KEY 环境变量');
  }
  
  const url = new URL('/chat/completions', DEEPSEEK_BASE_URL);
  
  const body = JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContext }
    ],
    temperature: 0.6,
    max_tokens: 4000
  });

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 60000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`DeepSeek API 错误: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          const result = JSON.parse(data);
          const content = result.choices?.[0]?.message?.content;
          if (!content) {
            reject(new Error('DeepSeek 返回内容为空'));
            return;
          }
          resolve(content);
        } catch (e) {
          reject(new Error(`解析 DeepSeek 响应失败: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    req.write(body);
    req.end();
  });
}

/**
 * 从 LLM 响应中解析 JSON
 * @param {string} text - LLM 原始响应
 * @returns {object} 解析后的提示词 JSON
 */
function parseOutput(text) {
  // 尝试直接解析
  try { return JSON.parse(text); } catch (e) {}
  
  // 从 markdown code block 中提取
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1].trim()); } catch (e) {}
  }
  
  // 找到 { 到 } 的内容
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch (e) {}
  }
  
  throw new Error('无法从 LLM 响应中解析 JSON');
}

// ============ 导出 ============

module.exports = {
  loadTemplate,
  parseQuestions,
  buildContext,
  callLLM,
  parseOutput,
  loadSinger,
  listSingers,
  SYSTEM_PROMPT,
  TEMPLATES_DIR,
  SINGER_DIR
};

// ============ 独立运行（测试用） ============

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('用法: node generate-prompt.js <风格名称> <答案JSON文件路径> [--singer <歌手名>]');
    console.error('示例: node generate-prompt.js "中文古风" /tmp/answers.json');
    console.error('示例: node generate-prompt.js "流行" /tmp/answers.json --singer "二虎"');
    console.error('');
    console.error('可用歌手:');
    const singers = listSingers();
    if (singers.length > 0) {
      singers.forEach(s => console.error(`  - ${s}`));
    } else {
      console.error('  (暂无预定义歌手)');
    }
    process.exit(1);
  }
  
  const style = args[0];
  const answersPath = args[1];
  
  // 解析 --singer 参数
  const singerIndex = args.indexOf('--singer');
  const singerName = singerIndex !== -1 ? args[singerIndex + 1] : null;
  
  (async () => {
    try {
      const { questions } = loadTemplate(style);
      const answers = JSON.parse(fs.readFileSync(answersPath, 'utf-8'));
      
      // 加载歌手 Profile
      const singerProfile = loadSinger(singerName);
      if (singerName && !singerProfile) {
        console.error(`⚠️  歌手 "${singerName}" 未找到，将不使用歌手特征`);
      }
      
      const context = buildContext(style, answers, questions, singerProfile);
      
      console.error('📝 正在生成现代诗与配乐方案...');
      if (singerProfile) {
        console.error(`🎤 朗诵者: ${singerProfile.name}`);
      }
      const response = await callLLM(context);
      const output = parseOutput(response);
      
      console.log(JSON.stringify(output, null, 2));
      console.error('✅ 生成完成');
    } catch (err) {
      console.error(`❌ 生成失败: ${err.message}`);
      process.exit(1);
    }
  })();
}
