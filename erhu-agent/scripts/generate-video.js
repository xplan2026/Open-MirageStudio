#!/usr/bin/env node
/**
 * Erhu Agent — CogVideoX 图生视频 (i2v)
 *
 * 用二虎形象图 + 动作描述 → 生成动态视频片段
 *
 * 用法:
 *   node erhu-agent/scripts/generate-video.js <image-url> "prompt" [output.mp4]
 *   node erhu-agent/scripts/generate-video.js erhu_front_test.jpg "人物轻微晃动唱歌"
 *
 * API: POST /api/paas/v4/videos/generations (创建任务)
 *       GET /api/paas/v4/async-result/{id}  (轮询结果)
 *
 * 基于智谱 SDK v4 源码逆向确认
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const ERHU_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ERHU_DIR, 'assets');
const OUTPUT_DIR = path.join(ERHU_DIR, 'output', 'videos');

// 默认参数（基于智谱 API 文档确认）
// CogVideoX-Flash: 无 duration 参数（固定 5s），fps 只支持 30/60
const DEFAULTS = {
  model: 'cogvideox-flash',
  size: '720x480',
  fps: 30,
  quality: 'speed',
  pollInterval: 10000,  // 轮询间隔 10s
  maxPollTime: 600000   // 最大等待 10 分钟
};

// ============ 加载 .env ============
function loadEnv() {
  const envPath = path.join(WORKSPACE_ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('找不到 .env 文件: ' + envPath);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const m = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/["']/g, '');
  });
}

function getApiConfig() {
  const apiKey = process.env.ZHIPU_API_KEY;
  const baseUrl = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  if (!apiKey) throw new Error('未配置 ZHIPU_API_KEY');
  return { apiKey, baseUrl };
}

// ============ HTTP 请求封装 ============
function httpsRequest(urlObj, method, headers, body) {
  return new Promise((resolve, reject) => {
    const proto = urlObj.protocol === 'https:' ? https : http;
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + (urlObj.search || ''),
      method,
      headers
    };
    const req = proto.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { reject(new Error(`JSON 解析失败: ${data.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ============ 创建视频生成任务 ============
async function createVideoTask(config, params) {
  const { apiKey, baseUrl } = config;
  const url = new URL(`${baseUrl}/videos/generations`);
  const body = JSON.stringify({
    model: params.model || DEFAULTS.model,
    image_url: params.imageUrl,
    prompt: params.prompt || '',
    quality: params.quality || DEFAULTS.quality,
    with_audio: false,
    size: params.size || DEFAULTS.size,
    fps: params.fps || DEFAULTS.fps
  });

  console.log(`🎬 提交 CogVideoX 任务...`);
  console.log(`   模型: ${params.model || DEFAULTS.model}`);
  console.log(`   分辨率: ${params.size || DEFAULTS.size}`);
  console.log(`   帧率: ${params.fps || DEFAULTS.fps}fps`);
  console.log(`   Prompt: "${params.prompt}"`);

  const result = await httpsRequest(url, 'POST', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': Buffer.byteLength(body)
  }, body);

  if (result.status >= 400 || (result.body && result.body.error)) {
    throw new Error(`API 错误: ${JSON.stringify(result.body)}`);
  }

  const taskId = result.body.id;
  console.log(`✅ 任务已创建: ${taskId}`);
  return taskId;
}

// ============ 轮询任务结果 ============
async function pollTaskResult(config, taskId, options = {}) {
  const { apiKey, baseUrl } = config;
  const pollInterval = options.pollInterval || DEFAULTS.pollInterval;
  const maxPollTime = options.maxPollTime || DEFAULTS.maxPollTime;
  const startTime = Date.now();

  const url = new URL(`${baseUrl}/async-result/${taskId}`);

  while (Date.now() - startTime < maxPollTime) {
    const result = await httpsRequest(url, 'GET', {
      'Authorization': `Bearer ${apiKey}`
    }, null);

    const status = result.body.task_status;
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (status === 'SUCCESS') {
      const videoResult = result.body.video_result;
      if (videoResult && videoResult.length > 0 && videoResult[0].url) {
        console.log(`✅ 视频生成完成 (${elapsed}s)`);
        return videoResult[0].url;
      }
      throw new Error('任务成功但无视频 URL');
    }

    if (status === 'FAIL') {
      throw new Error(`视频生成失败: ${JSON.stringify(result.body)}`);
    }

    console.log(`⏳ 等待中... (${status}, ${elapsed}s 已过)`);
    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error(`轮询超时 (${maxPollTime / 1000}s)`);
}

// ============ 下载视频 ============
async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    proto.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        // 跟随重定向
        file.close();
        fs.unlinkSync(outputPath);
        downloadFile(res.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const stat = fs.statSync(outputPath);
        console.log(`📥 已下载: ${outputPath} (${(stat.size / 1024).toFixed(1)} KB)`);
        resolve(outputPath);
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

// ============ 本地图片转 Base64 ============
// CogVideoX 的 image_url 支持 Base64 编码（data:image/xxx;base64,...）
// 最大 5MB，格式 png/jpeg/jpg
function imageToBase64(imagePath) {
  // 如果已经是 URL 或 Base64，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // 解析本地路径
  const resolvedPath = path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(ASSETS_DIR, imagePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`图片不存在: ${resolvedPath}`);
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  const ext = path.extname(resolvedPath).toLowerCase().replace('.', '');
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  if (fileBuffer.length > 5 * 1024 * 1024) {
    throw new Error(`图片过大 (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)，超过 5MB 限制`);
  }

  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  console.log(`📷 编码图片: ${path.basename(resolvedPath)} → Base64 (${(base64.length / 1024).toFixed(0)} KB)`);
  return dataUri;
}

// ============ 从 profile 加载 prompt ============
function loadProfile() {
  const profilePath = path.join(ASSETS_DIR, 'erhu_profile.json');
  if (fs.existsSync(profilePath)) {
    return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  }
  return null;
}

// ============ 主流程 ============
async function main() {
  loadEnv();
  const config = getApiConfig();

  const args = process.argv.slice(2);

  // 交互模式：列出预设 prompt
  if (args.length === 0 || args[0] === '--list') {
    const profile = loadProfile();
    console.log('🎭 二虎数字人 — CogVideoX 图生视频\n');
    console.log('用法:');
    console.log('  node scripts/generate-video.js <image-url> "prompt" [output.mp4]');
    console.log('  node scripts/generate-video.js erhu_front_test.jpg basic_sing');
    console.log('  node scripts/generate-video.js --list\n');

    if (profile && profile.video_prompts) {
      console.log('📋 预设动作描述:');
      for (const [key, prompt] of Object.entries(profile.video_prompts)) {
        console.log(`  ${key}: "${prompt}"`);
      }
      console.log('\n💡 可直接使用预设名: node scripts/generate-video.js erhu_front_test.jpg basic_sing');
    }

    console.log(`\n📁 输出目录: ${OUTPUT_DIR}/`);
    return;
  }

  const imagePath = args[0];
  let prompt = args[1] || '';
  const outputName = args[2] || `erhu-video-${Date.now()}.mp4`;

  // 如果 prompt 是预设名，从 profile 加载
  const profile = loadProfile();
  if (profile && profile.video_prompts && profile.video_prompts[prompt]) {
    prompt = profile.video_prompts[prompt];
    console.log(`📋 使用预设: "${args[1]}" → "${prompt}"`);
  }

  if (!prompt) {
    console.error('错误: 缺少 prompt（动作描述）');
    process.exit(1);
  }

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // Step 1: 本地图片 → Base64
    const imageUrl = imageToBase64(imagePath);

    // Step 2: 创建视频生成任务
    const taskId = await createVideoTask(config, { imageUrl, prompt });

    // Step 3: 轮询结果
    const videoUrl = await pollTaskResult(config, taskId);

    // Step 4: 下载视频
    const outputPath = path.join(OUTPUT_DIR, outputName);
    await downloadFile(videoUrl, outputPath);

    console.log(`\n🎉 完成! 视频已保存: ${outputPath}`);
    console.log(`   任务 ID: ${taskId}`);
    console.log(`   可用以下命令测试: ffplay ${outputPath}`);

  } catch (e) {
    console.error(`❌ 错误: ${e.message}`);
    process.exit(1);
  }
}

main();
