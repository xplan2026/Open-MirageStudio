#!/usr/bin/env node
/**
 * Erhu Agent — 图片生成（百度文心一格）
 *
 * 分析歌词结构 → 为每个小节生成图片 prompt → 调用百度文心一格批量生图
 *
 * 用法:
 *   node erhu-agent/scripts/visualize.js <作品名>
 *   node erhu-agent/scripts/visualize.js <作品名> --dry-run
 *
 * 输入:  data/Erhu-data/{作品名}/歌词.txt + prompt.json
 * 输出:  data/Erhu-data/{作品名}/images/
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const ERHU_DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'Erhu-data');

// 图片风格映射（根据歌曲风格选择图片风格）
const STYLE_IMAGE_MAP = {
  '乡村': '写实',
  '民谣': '写实',
  '古风': '国画',
  '流行': '插画',
  '电子': '3D',
  '爵士': '写实',
  '摇滚': '写实',
  '旅行': '写实',
  'default': '写实'
};

// 加载 .env
function loadEnv() {
  const envPath = path.join(WORKSPACE_ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('找不到 .env 文件');
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const m = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/["']/g, '');
  });
}

/**
 * 分析歌词结构，返回段落列表
 */
function parseLyricStructure(lyricsText) {
  const sections = [];
  const lines = lyricsText.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^\s*\[(.+)\]\s*$/);
    if (sectionMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        label: sectionMatch[1],
        lines: []
      };
    } else if (currentSection && line.trim()) {
      currentSection.lines.push(line.trim());
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * 计算每个段落应生成的图片数量
 *
 * 策略：
 *   1. 基础公式: 总图片数 = ceil(歌曲时长 / 每张展示秒数)
 *      每张展示秒数默认 7s（5-10s 中位数，兼顾视觉变化和 API 成本）
 *   2. 按段落行数加权分配（行数多的段落需要更多视觉素材）
 *   3. 每个段落最少 2 张图（保证基本视觉变化）
 *   4. 副歌段（含"副歌"字样）给 0.8 权重（副歌重复出现，可适当减少）
 *
 * @param {Array} sections - 歌词段落列表 [{ label, lines }]
 * @param {number} songDurationSec - 歌曲总时长（秒）
 * @param {number} displaySecPerImage - 每张图展示时长（秒），默认 7
 * @returns {Array} [{ label, lines, imageCount }]
 */
function computeImageCounts(sections, songDurationSec, displaySecPerImage = 7) {
  // 总图片数
  const totalImages = Math.max(
    Math.ceil(songDurationSec / displaySecPerImage),
    sections.length * 2 // 最少每段 2 张
  );

  // 计算每个段落的权重
  const weights = sections.map(s => {
    let w = s.lines.length; // 基础权重 = 行数
    // 副歌段降权（重复内容可少配图）
    if (/副歌|chorus/i.test(s.label)) {
      w *= 0.8;
    }
    return w;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // 按权重分配，确保整数且总和正确
  let allocated = sections.map((s, i) => ({
    ...s,
    imageCount: Math.max(2, Math.round((weights[i] / totalWeight) * totalImages))
  }));

  // 调整使总和匹配 totalImages
  let sum = allocated.reduce((a, s) => a + s.imageCount, 0);
  while (sum !== totalImages) {
    if (sum < totalImages) {
      // 给行数最多的段 +1
      const maxIdx = allocated.reduce((max, s, i) =>
        s.lines.length > allocated[max].lines.length ? i : max, 0);
      allocated[maxIdx].imageCount++;
      sum++;
    } else {
      // 给行数最少但 > 2 的段 -1
      const minIdx = allocated.reduce((min, s, i) =>
        s.imageCount > 2 && s.imageCount < allocated[min].imageCount ? i : min, 0);
      if (allocated[minIdx].imageCount > 2) {
        allocated[minIdx].imageCount--;
        sum--;
      } else {
        break; // 无法再减
      }
    }
  }

  return allocated;
}

/**
 * 根据歌曲内容生成图片 prompt（调用 DeepSeek）
 */
async function generateImagePrompts(sections, songContext) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) {
    throw new Error('未设置 DEEPSEEK_API_KEY');
  }

  const sectionText = sections.map((s, i) =>
    `[${s.label}] (${s.imageCount}张图)\n${s.lines.join('\n')}`
  ).join('\n\n');

  const systemPrompt = `你是一位 MV 视觉设计师。根据歌词段落，为每个段落生成指定数量的图片描述 prompt。

要求:
- 每张图片一个中文 prompt（20-50字），描述画面内容、构图、色调
- 图片之间要有视觉变化（不同角度、场景、细节）
- 风格需匹配歌曲整体基调
- 输出格式: JSON 数组 [{ "section": "段落名", "prompts": ["prompt1", "prompt2", ...] }]
- 只输出 JSON，不要其他内容`;

  const userPrompt = `歌曲: ${songContext.title}
风格: ${songContext.style}
情绪: ${songContext.mood}
总时长: ${songContext.duration}秒

歌词及每段图片数量:
${sectionText}

请严格按每段标注的图片数量生成 prompt。`;

  const body = JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    max_tokens: 8000
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
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`DeepSeek API ${res.statusCode}: ${data.substring(0, 200)}`));
          return;
        }
        const result = JSON.parse(data);
        const content = result.choices[0].message.content;
        // Parse JSON from response
        try {
          resolve(JSON.parse(content));
        } catch (e) {
          const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\[[\s\S]*\]/);
          resolve(JSON.parse(match ? match[1] || match[0] : content));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * 生成纯色占位图（API 不可用时的回退方案）
 */
function generatePlaceholderImage(outputPath, prompt) {
  const { execSync: exec } = require('child_process');
  // 用 FFmpeg 生成一张纯色+文字占位图
  const safePrompt = (prompt || 'placeholder').substring(0, 60);
  exec(
    `ffmpeg -y -f lavfi -i "color=c=0x1a1a2e:size=1280x720:d=0.1" ` +
    `-vf "drawtext=text='${safePrompt.replace(/'/g, '')}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" ` +
    `-frames:v 1 "${outputPath}" 2>/dev/null`,
    { timeout: 10000 }
  );
}

/**
 * 调用百度文心一格生成单张图片
 * 复用 scripts/generate-image.js（已从 captain/ 迁移至本目录）
 */
function generateImage(prompt, outputPath, imageStyle) {
  try {
    // 自动选择 provider：优先智谱，其次百度
    const provider = process.env.ZHIPU_API_KEY ? 'zhipu' : 'baidu';
    const style = STYLE_IMAGE_MAP[imageStyle] || '写实';
    execSync(
      `node ${__dirname}/generate-image.js "${prompt}" 1280x720 "${outputPath}" ${provider}`,
      { cwd: WORKSPACE_ROOT, stdio: 'pipe', timeout: 120000 }
    );
    return true;
  } catch (err) {
    // API 不可用时回退到占位图
    const stderr = err.stderr ? err.stderr.toString().substring(0, 200) : '';
    console.error(`   ⚠️ API生成失败: ${stderr || err.message}`);
    console.log(`   ↳ 回退: 生成占位图`);
    try {
      generatePlaceholderImage(outputPath, prompt);
      return true;
    } catch (e2) {
      console.error(`   ❌ 占位图也失败: ${e2.message}`);
      return false;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const songName = args.find(a => !a.startsWith('--'));

  if (!songName) {
    console.error('用法: node visualize.js <作品名> [--dry-run]');
    process.exit(1);
  }

  try {
    loadEnv();

    const songDir = path.join(ERHU_DATA_DIR, songName);
    const lyricsPath = path.join(songDir, '歌词.txt');
    const promptPath = path.join(songDir, 'prompt.json');
    const imagesDir = path.join(songDir, 'images');

    if (!fs.existsSync(lyricsPath)) {
      throw new Error(`未找到歌词: ${lyricsPath}`);
    }
    if (!fs.existsSync(promptPath)) {
      throw new Error(`未找到 prompt.json: ${promptPath}`);
    }

    // 1. 读取歌词和元数据
    const lyricsText = fs.readFileSync(lyricsPath, 'utf-8');
    const promptData = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));

    console.log(`🎨 为 "${songName}" 生成图片`);
    console.log(`   风格: ${promptData.music_prompt?.caption_en || '未知'}`);

    // 2. 解析歌词结构
    const sections = parseLyricStructure(lyricsText);
    console.log(`   段落: ${sections.length} 个 (${sections.map(s => s.label).join(', ')})`);

    // 2.5 获取歌曲时长（从 mp3 文件）
    // 优先选择与作品名完全匹配的 mp3，否则选第一个
    let songDurationSec = 180; // 默认 3 分钟
    const mp3Files = fs.readdirSync(songDir).filter(f => f.endsWith('.mp3'));
    const exactMatch = mp3Files.find(f => f === `${songName}.mp3`);
    const mainMp3 = exactMatch || (mp3Files.length > 0 ? mp3Files[0] : null);
    if (mainMp3) {
      try {
        const result = execSync(
          `ffprobe -v error -show_entries format=duration -of csv=p=0 "${path.join(songDir, mainMp3)}"`,
          { stdio: 'pipe' }
        ).toString().trim();
        songDurationSec = parseFloat(result);
        console.log(`   歌曲时长: ${songDurationSec.toFixed(1)}s (${mainMp3})`);
      } catch (e) {
        console.log(`   ⚠️ 无法读取音频时长，使用默认 ${songDurationSec}s`);
      }
    }

    // 2.6 计算每段图片数量
    const DISPLAY_SEC_PER_IMAGE = 7; // 每张图展示 7 秒（5-10s 中位数）
    const sectionsWithCounts = computeImageCounts(sections, songDurationSec, DISPLAY_SEC_PER_IMAGE);
    const totalNeeded = sectionsWithCounts.reduce((s, sec) => s + sec.imageCount, 0);
    console.log(`   图片分配: ${sectionsWithCounts.map(s => `${s.label}×${s.imageCount}`).join(', ')} (共 ${totalNeeded} 张, 每张约 ${DISPLAY_SEC_PER_IMAGE}s)`);

    // 3. 生成图片 prompt
    console.log('🤖 生成图片 prompt...');
    const imagePrompts = await generateImagePrompts(sectionsWithCounts, {
      title: songName,
      style: promptData.music_prompt?.caption_en || '',
      mood: promptData.music_prompt?.mood || '',
      duration: songDurationSec
    });

    if (dryRun) {
      console.log(`🔍 --dry-run: 将生成 ${imagePrompts.reduce((sum, s) => sum + s.prompts.length, 0)} 张图片`);
      console.log(JSON.stringify(imagePrompts, null, 2));
      return;
    }

    // 4. 创建图片目录
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // 5. 批量生成图片（带速率限制，避免 API 限流）
    let totalImages = 0;
    let successImages = 0;
    const DELAY_MS = 5000; // 每张图间隔 5 秒，避免智谱免费 Key 的 QPM 限制

    for (const section of imagePrompts) {
      const sectionName = section.section.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      console.log(`\n📷 [${section.section}]`);

      for (let i = 0; i < section.prompts.length; i++) {
        const prompt = section.prompts[i];
        const filename = `${String(i + 1).padStart(2, '0')}_${sectionName}.jpg`;
        const outputPath = path.join(imagesDir, filename);

        // 确定图片风格
        const captionEn = (promptData.music_prompt?.caption_en || '').toLowerCase();
        let imageStyle = 'default';
        for (const [key, val] of Object.entries(STYLE_IMAGE_MAP)) {
          if (captionEn.includes(key.toLowerCase())) {
            imageStyle = key;
            break;
          }
        }

        console.log(`   [${i + 1}/${section.prompts.length}] ${prompt.substring(0, 40)}...`);
        totalImages++;
        if (generateImage(prompt, outputPath, imageStyle)) {
          successImages++;
        }

        // 速率限制：等待后再请求下一张
        if (totalImages < imagePrompts.reduce((sum, s) => sum + s.prompts.length, 0)) {
          await new Promise(r => setTimeout(r, DELAY_MS));
        }
      }
    }

    // 6. 保存元数据
    const meta = {
      totalSections: sections.length,
      totalImages,
      successImages,
      imagePrompts,
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(imagesDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

    console.log(`\n✅ 图片生成完成: ${successImages}/${totalImages}`);
    console.log(`   ${imagesDir}/`);

  } catch (err) {
    console.error(`❌ 失败: ${err.message}`);
    process.exit(1);
  }
}

main();
