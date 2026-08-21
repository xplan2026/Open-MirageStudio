#!/usr/bin/env node
/**
 * Lemong Agent — 歌词生成模块
 * 
 * 调用 DeepSeek V4 API 根据主题生成歌词。
 * 支持多轮修改，直到用户确认。
 * 
 * 用法:
 *   node scripts/generate-lyrics.js --theme "主题描述" [--previous "上一版歌词"] [--feedback "修改意见"]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat'; // DeepSeek-V4-Pro

// ============ 歌词生成系统提示 ============

const SYSTEM_PROMPT = `你是一位专业的音乐创作人，擅长为 AI 音乐生成模型创作中文歌词。

## 你的任务
根据用户提供的主题和描述，创作一首结构完整的中文歌词。

## 输出格式要求
请严格按照以下 JSON 格式输出：

{
  "title": "歌曲标题",
  "structure": "主歌A - 副歌 - 主歌B - 副歌 - 桥段 - 副歌",
  "style_suggestion": "建议的音乐风格（如：流行/古风/民谣/电子等）",
  "lyrics": "完整歌词文本（按段落标注结构）",
  "notes": "创作说明（可选，说明歌词的灵感来源和表达意图）"
}

## 歌词创作规范
1. 结构完整：必须包含主歌、副歌，建议有桥段
2. 段落标注：每段开头标注 [主歌A]、[副歌]、[主歌B]、[桥段]、[尾声] 等
3. 押韵工整：中文歌词需要注意押韵，每段保持一致的韵脚
4. 情感递进：从铺垫到高潮，情感要有层次
5. 主题突出：紧密围绕用户提供的主题
6. 字数适中：总字数建议 200-400 字，适合 2-4 分钟的歌曲

## 注意事项
- 只输出 JSON，不要输出其他内容
- JSON 必须是有效的，可以被直接解析
- lyrics 字段中的换行使用 \\n`;

const REVISION_SYSTEM_PROMPT = `你是一位专业的音乐创作人。用户对上一版歌词不满意，请根据修改意见进行修改。

## 修改要求
1. 保持歌曲的标题和整体结构不变（除非用户明确要求改）
2. 根据反馈意见针对性修改
3. 修改后仍需保证押韵、情感递进、主题突出

请严格按照以下 JSON 格式输出修改后的版本：

{
  "title": "歌曲标题",
  "structure": "歌曲结构",
  "style_suggestion": "音乐风格",
  "lyrics": "完整歌词文本",
  "notes": "修改说明（说明做了哪些改动）"
}`;

// ============ API 调用 ============

async function callDeepSeek(messages, temperature = 0.8) {
  const url = new URL('/chat/completions', DEEPSEEK_BASE_URL);
  
  const body = JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: messages,
    temperature: temperature,
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

function extractJSON(text) {
  // 尝试直接解析
  try { return JSON.parse(text); } catch (e) {}
  
  // 尝试从 markdown code block 中提取
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1].trim()); } catch (e) {}
  }
  
  // 尝试找到 { 到 } 的内容
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch (e) {}
  }
  
  throw new Error('无法从响应中解析 JSON');
}

// ============ 主流程 ============

/**
 * 解析命令行参数（支持 --key value 和 --key=value 两种格式）
 */
function parseArgs(args) {
  const params = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        // --key=value 格式
        params[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
        i++;
      } else {
        // --key value 格式
        const key = arg.slice(2);
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          params[key] = next;
          i += 2;
        } else {
          params[key] = '';
          i++;
        }
      }
    } else {
      i++;
    }
  }
  return params;
}

async function main() {
  const params = parseArgs(process.argv.slice(2));
  
  if (!params.theme) {
    console.error('用法: node generate-lyrics.js --theme "主题描述" [--previous "上一版"] [--feedback "修改意见"]');
    process.exit(1);
  }
  
  const theme = params.theme;
  const previousLyrics = params.previous || null;
  const feedback = params.feedback || null;
  
  if (!DEEPSEEK_API_KEY) {
    console.error('错误: 未设置 DEEPSEEK_API_KEY 环境变量');
    process.exit(1);
  }
  
  const isRevision = previousLyrics && feedback;
  
  let messages;
  if (isRevision) {
    messages = [
      { role: 'system', content: REVISION_SYSTEM_PROMPT },
      { role: 'user', content: `原始主题: ${theme}\n\n上一版歌词:\n${previousLyrics}\n\n修改意见: ${feedback}\n\n请输出修改后的版本。` }
    ];
  } else {
    messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `请为以下主题创作歌词：\n${theme}` }
    ];
  }
  
  console.error('🎵 正在生成歌词...');
  try {
    const response = await callDeepSeek(messages);
    const lyrics = extractJSON(response);
    
    // 格式化输出
    console.log(JSON.stringify(lyrics, null, 2));
    console.error('✅ 歌词生成完成');
  } catch (err) {
    console.error(`❌ 歌词生成失败: ${err.message}`);
    process.exit(1);
  }
}

main();
