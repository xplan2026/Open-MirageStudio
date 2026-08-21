#!/usr/bin/env node
/**
 * Erhu Agent — wan2.2-s2v 数字人对口型（阿里云百炼）
 *
 * 输入：1 张人物形象图 + 1 段纯人声音频 → 输出人物对口型视频。
 * 要求：音频需去除背景音乐（先用 scripts/stem.js 分离人声轨）。
 *
 * 用法:
 *   node erhu-agent/scripts/s2v.js <形象图> <人声音频> [--resolution 480P|720P] [--output out.mp4] [--dry-run]
 *
 *   示例:
 *     node erhu-agent/scripts/s2v.js erhu-agent/assets/erhu_left_15.jpg /tmp/vocals.wav --resolution 480P --output /tmp/s2v-test.mp4
 *
 * 依赖环境变量（.env）:
 *   DASHSCOPE_API_KEY      — 阿里云百炼 API Key（华北2北京地域）
 *   DASHSCOPE_WORKSPACE_ID — 百炼业务空间 ID
 *
 * 参考:
 *   erhu-agent/docs/数字人改造计划-2026-08-21.md
 *   https://help.aliyun.com/zh/model-studio/wan-s2v-api
 *   https://help.aliyun.com/zh/model-studio/get-temporary-file-url
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');

// ============ 加载 .env ============
function loadEnv() {
  const envPath = path.join(WORKSPACE_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const m = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/["']/g, '');
    });
  }
}

// ============ 配置 ============
const UPLOAD_HOST = 'https://dashscope.aliyuncs.com';
const MODEL = 'wan2.2-s2v';
const POLL_INTERVAL = 15000; // 官方建议 15s
const MAX_POLL_TIME = 30 * 60 * 1000; // 30 分钟

function getApiKey() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error('缺少 DASHSCOPE_API_KEY（请在 .env 中配置阿里云百炼华北2北京地域 API Key）');
  return key;
}

function getWorkspaceId() {
  const id = process.env.DASHSCOPE_WORKSPACE_ID;
  if (!id) throw new Error('缺少 DASHSCOPE_WORKSPACE_ID（请在 .env 中配置百炼业务空间 ID）');
  return id;
}

// ============ HTTP 工具 ============
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function urlEncode(data) {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function parseJson(result, ctx) {
  try { return JSON.parse(result.body); } catch (e) {
    throw new Error(`${ctx} 响应解析失败 (HTTP ${result.status}): ${result.body.substring(0, 300)}`);
  }
}

// ============ 步骤 1：获取上传凭证 ============
async function getUploadPolicy() {
  const url = `${UPLOAD_HOST}/api/v1/uploads?${urlEncode({ action: 'getPolicy', model: MODEL })}`;
  const result = await request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${getApiKey()}` }
  }, null);

  const json = parseJson(result, '获取上传凭证');
  if (result.status !== 200 || !json.data) {
    throw new Error(`获取上传凭证失败 (HTTP ${result.status}): ${JSON.stringify(json).substring(0, 300)}`);
  }
  return json.data;
}

// ============ 步骤 2：上传文件到临时 OSS ============
async function uploadFileToOss(policy, filePath) {
  const fileName = path.basename(filePath);
  const key = `${policy.upload_dir}/${fileName}`;
  const fileBuffer = fs.readFileSync(filePath);

  const boundary = '----ErhuS2v' + Date.now();
  const parts = [];
  const addField = (name, value) => {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
      `${value}\r\n`
    );
  };

  addField('OSSAccessKeyId', policy.oss_access_key_id);
  addField('Signature', policy.signature);
  addField('policy', policy.policy);
  addField('x-oss-object-acl', policy.x_oss_object_acl);
  addField('x-oss-forbid-overwrite', policy.x_oss_forbid_overwrite);
  addField('key', key);
  addField('success_action_status', '200');
  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`
  );
  parts.push(fileBuffer);
  parts.push(`\r\n--${boundary}--\r\n`);

  const headLength = parts.reduce((sum, p) => sum + (Buffer.isBuffer(p) ? p.length : Buffer.byteLength(p)), 0);
  const body = Buffer.concat(parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf-8')));

  console.log(`📤 上传 ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB) 到临时 OSS...`);

  const result = await request(policy.upload_host, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': headLength
    }
  }, body);

  if (result.status !== 200) {
    throw new Error(`上传失败 (HTTP ${result.status}): ${result.body.substring(0, 300)}`);
  }

  console.log(`✅ 上传成功: oss://${key}`);
  return `oss://${key}`;
}

// ============ 准备文件 URL（本地文件 → 上传，URL 直接用） ============
async function prepareFileUrl(input, policy, label) {
  if (/^(https?|oss):\/\//.test(input)) {
    console.log(`🔗 ${label} 使用直接 URL: ${input}`);
    return input;
  }
  const localPath = path.isAbsolute(input) ? input : path.resolve(WORKSPACE_ROOT, input);
  if (!fs.existsSync(localPath)) {
    throw new Error(`${label} 文件不存在: ${localPath}`);
  }
  console.log(`🖼️  ${label} 本地文件: ${localPath}`);
  return uploadFileToOss(policy, localPath);
}

// ============ 步骤 3：创建任务 ============
async function createTask(imageUrl, audioUrl, resolution) {
  const workspaceId = getWorkspaceId();
  const url = `https://${workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis`;

  const body = JSON.stringify({
    model: MODEL,
    input: { image_url: imageUrl, audio_url: audioUrl },
    parameters: { resolution }
  });

  console.log(`🎬 创建 wan2.2-s2v 对口型任务 (${resolution})...`);

  const result = await request(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
      'X-DashScope-OssResourceResolve': 'enable' // oss:// URL 必需
    }
  }, body);

  const json = parseJson(result, '创建任务');
  if (result.status !== 200) {
    throw new Error(`创建任务失败 (HTTP ${result.status}): ${JSON.stringify(json).substring(0, 500)}`);
  }
  const taskId = json.output?.task_id || json.data?.task_id;
  if (!taskId) {
    throw new Error(`创建任务失败，未返回 task_id: ${JSON.stringify(json).substring(0, 500)}`);
  }
  console.log(`✅ 任务已创建: task_id=${taskId}`);
  return taskId;
}

// ============ 步骤 4：轮询任务 ============
async function pollTask(taskId) {
  const workspaceId = getWorkspaceId();
  const url = `https://${workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/${taskId}`;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const result = await request(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'X-DashScope-OssResourceResolve': 'enable'
      }
    }, null);

    const json = parseJson(result, '查询任务');
    const status = json.output?.task_status || json.task_status;
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (status === 'SUCCEEDED') {
      console.log(`✅ 视频生成完成 (${elapsed}s)`);
      // results 可能是数组 [{video_url}] 或对象 {video_url}，两种都兼容
      const results = json.output?.results;
      let videoUrl = null;
      if (Array.isArray(results)) {
        videoUrl = results[0]?.video_url;
      } else if (results && typeof results === 'object') {
        videoUrl = results.video_url;
      }
      if (!videoUrl) {
        throw new Error(`任务成功但无输出视频: ${JSON.stringify(json.output).substring(0, 300)}`);
      }
      return videoUrl;
    }

    if (status === 'FAILED' || status === 'CANCELED') {
      throw new Error(`任务失败 (${status}): ${JSON.stringify(json.output || json).substring(0, 400)}`);
    }

    if (!status || status === 'UNKNOWN' || status === 'PENDING' || status === 'RUNNING') {
      console.log(`⏳ 生成中... (${status || 'UNKNOWN'}, ${elapsed}s)`);
    } else {
      console.log(`⏳ 状态: ${status} (${elapsed}s)`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error(`轮询超时 (${MAX_POLL_TIME / 1000}s)`);
}

// ============ 步骤 5：下载视频 ============
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        downloadFile(res.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`下载失败 HTTP ${res.statusCode}: ${url}`));
        return;
      }
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const stat = fs.statSync(outputPath);
        console.log(`📥 已下载: ${outputPath} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
        resolve(outputPath);
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

// ============ 音频切段 / 视频拼接 ============

/** 用 ffprobe 读取音频时长（秒） */
function getAudioDuration(audioPath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { stdio: 'pipe' }
    ).toString().trim();
    const d = parseFloat(out);
    if (Number.isNaN(d)) throw new Error('ffprobe 返回空时长');
    return d;
  } catch (e) {
    throw new Error(`无法读取音频时长: ${e.message}`);
  }
}

/**
 * 将音频按 segmentSeconds 切成多段（wav/mp3 通用，-c copy 保持无损）。
 * @returns {string[]} 切分后的音频文件绝对路径（按时间顺序）
 */
function splitAudio(audioPath, outDir, segmentSeconds) {
  const ext = path.extname(audioPath) || '.wav';
  const base = path.basename(audioPath, ext);
  const pattern = path.join(outDir, `${base}_seg_%03d${ext}`);
  execSync(
    `ffmpeg -y -i "${audioPath}" -f segment -segment_time ${segmentSeconds} -c copy "${pattern}" 2>/dev/null`,
    { stdio: 'pipe', timeout: 120000 }
  );
  const files = fs.readdirSync(outDir)
    .filter((f) => f.includes('_seg_') && f.endsWith(ext))
    .sort();
  if (files.length === 0) throw new Error('音频切段失败，未生成任何片段');
  return files.map((f) => path.join(outDir, f));
}

/** 用 ffmpeg concat demuxer 拼接多个视频段（重编码保证兼容性） */
function concatVideos(videoPaths, outputPath) {
  const listPath = `${outputPath}.concat.txt`;
  const listContent = videoPaths.map((p) => `file '${p}'`).join('\n');
  fs.writeFileSync(listPath, listContent, 'utf-8');
  try {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k "${outputPath}" 2>/dev/null`,
      { stdio: 'pipe', timeout: 600000 }
    );
  } finally {
    fs.rmSync(listPath, { force: true });
  }
}

// ============ 主流程 ============
async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // 解析参数
  let resolution = '480P';
  let output = null;
  let segmentSeconds = 20; // wan2.2-s2v 单段音频上限（秒）
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--resolution') {
      resolution = (args[++i] || '480P').toUpperCase();
      if (!['480P', '720P'].includes(resolution)) {
        console.error('❌ --resolution 仅支持 480P / 720P');
        process.exit(1);
      }
    } else if (a === '--output') {
      output = args[++i];
    } else if (a === '--segment') {
      segmentSeconds = parseFloat(args[++i]);
      if (Number.isNaN(segmentSeconds) || segmentSeconds <= 0) {
        console.error(`❌ 无效的切段时长: ${args[i]}`);
        process.exit(1);
      }
    } else if (a === '--dry-run') {
      // 已标记
    } else if (!a.startsWith('--')) {
      positional.push(a);
    }
  }

  const [imageInput, audioInput] = positional;
  if (!imageInput || !audioInput) {
    console.error('用法: node s2v.js <形象图> <人声音频> [--resolution 480P|720P] [--output out.mp4] [--segment <秒>] [--dry-run]');
    process.exit(1);
  }

  // 输出路径默认 /tmp/s2v-{时间戳}.mp4
  if (!output) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    output = path.join('/tmp', `s2v-${ts}.mp4`);
  }
  const outputPath = path.isAbsolute(output) ? output : path.resolve(WORKSPACE_ROOT, output);

  console.log(`🎤 wan2.2-s2v 数字人对口型`);
  console.log(`   模型: ${MODEL}`);
  console.log(`   分辨率: ${resolution}`);

  if (dryRun) {
    console.log(`🔍 --dry-run: 将上传图片+音频，创建任务并轮询，最终输出到 ${outputPath}`);
    try { getApiKey(); getWorkspaceId(); console.log('✅ 凭证检查通过'); }
    catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }
    return;
  }

  try {
    // 1. 上传形象图一次（所有音频段复用同一形象 URL）
    const imageUrl = await prepareFileUrl(imageInput, await getUploadPolicy(), '形象图');

    // 2. 读取音频时长，判断是否需要切段（wan2.2-s2v 单段有上限）
    const audioAbs = path.isAbsolute(audioInput) ? audioInput : path.resolve(WORKSPACE_ROOT, audioInput);
    const duration = getAudioDuration(audioAbs);
    console.log(`   音频时长: ${duration.toFixed(1)}s`);

    let audioChunks;
    let chunkDir = null;
    if (duration > segmentSeconds) {
      console.log(`✂️  音频超过 ${segmentSeconds}s，切分为多段处理…`);
      chunkDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2v-seg-'));
      audioChunks = splitAudio(audioAbs, chunkDir, segmentSeconds);
      console.log(`   切分为 ${audioChunks.length} 段`);
    } else {
      audioChunks = [audioAbs];
    }

    // 3. 逐段生成对口型视频（每段独立上传音频 + 创建任务）
    const segVideos = [];
    for (let i = 0; i < audioChunks.length; i++) {
      const segOut = audioChunks.length === 1
        ? outputPath
        : path.join(chunkDir, `seg_${String(i).padStart(3, '0')}.mp4`);
      console.log(`\n[段 ${i + 1}/${audioChunks.length}] ${path.basename(audioChunks[i])}`);
      const audioUrl = await prepareFileUrl(audioChunks[i], await getUploadPolicy(), '人声音频');
      const taskId = await createTask(imageUrl, audioUrl, resolution);
      const videoUrl = await pollTask(taskId);
      await downloadFile(videoUrl, segOut);
      segVideos.push(segOut);
    }

    // 4. 拼接（多段时）
    if (segVideos.length === 1) {
      console.log(`\n🎉 完成! 对口型视频: ${outputPath}`);
    } else {
      console.log(`\n🔗 拼接 ${segVideos.length} 个片段…`);
      concatVideos(segVideos, outputPath);
      fs.rmSync(chunkDir, { recursive: true, force: true });
      console.log(`\n🎉 完成! 对口型视频: ${outputPath}`);
    }
  } catch (err) {
    console.error(`❌ 失败: ${err.message}`);
    process.exit(1);
  }
}

main();
