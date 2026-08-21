#!/usr/bin/env node
/**
 * Erhu Agent — 音轨分离（mvsep 在线服务）
 *
 * 从歌曲中提取纯人声轨（vocal），供 wan2.2-s2v 对口型模型驱动口型。
 * wan2.2-s2v 要求音频去除背景音乐、仅留清晰人声。
 *
 * 用法:
 *   node erhu-agent/scripts/stem.js <输入mp3> [输出目录] [--sep-type 40] [--dry-run]
 *
 *   示例:
 *     node erhu-agent/scripts/stem.js data/Erhu-data/此身长在画图间/此身长在画图间.mp3
 *     node erhu-agent/scripts/stem.js xxx.mp3 /tmp/stem --sep-type 25
 *
 * API: POST https://mvsep.com/api/separation/create (创建任务, form-data)
 *       GET  https://mvsep.com/api/separation/get?hash=xxx (轮询结果)
 * 参考: docs/reference/mvsep操作指南.md
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

// mvsep API Token：优先 .env，回退到参考文档中的已配置 token
function getApiToken() {
  return process.env.MVSEP_API_TOKEN || 'EWyT1L3yAWlEWTcjYuoqCKmEH4G7or';
}

// 默认分离类型：BS Roformer (vocals, instrumental)，SDR 高、人声干净
const DEFAULT_SEP_TYPE = 40;
const DEFAULT_OUTPUT_FORMAT = 1; // wav (uncompressed, 16 bit) — wan2.2-s2v 要求 wav/mp3
const POLL_INTERVAL = 5000;      // 轮询间隔 5s
const MAX_POLL_TIME = 30 * 60 * 1000; // 最大等待 30 分钟

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

// ============ 创建分离任务 ============
async function createSeparation(audioPath, sepType, outputFormat, isDemo) {
  const boundary = '----ErhuStem' + Date.now();
  const token = getApiToken();

  const fileBuffer = fs.readFileSync(audioPath);
  const fileName = path.basename(audioPath);

  // 构建 multipart/form-data
  const parts = [];
  const addField = (name, value) => {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
      `${value}\r\n`
    );
  };
  const addFile = (name, filename, buffer) => {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
    );
    parts.push(buffer);
    parts.push('\r\n');
  };

  addField('api_token', token);
  addField('sep_type', String(sepType));
  addField('output_format', String(outputFormat));
  addField('is_demo', String(isDemo));
  addFile('audiofile', fileName, fileBuffer);
  parts.push(`--${boundary}--\r\n`);

  // 计算总长度
  const headLength = parts.reduce((sum, p) => sum + (Buffer.isBuffer(p) ? p.length : Buffer.byteLength(p)), 0);

  const body = Buffer.concat(
    parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf-8'))
  );

  console.log(`🎤 提交音轨分离任务...`);
  console.log(`   文件: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`   类型: sep_type=${sepType} (${getSepTypeName(sepType)})`);
  console.log(`   格式: output_format=${outputFormat} (${outputFormat === 1 ? 'wav 16bit' : 'mp3'})`);

  const url = new URL('https://mvsep.com/api/separation/create');
  const result = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': headLength
    }
  }, body);

  let json;
  try { json = JSON.parse(result.body); } catch (e) { throw new Error(`响应解析失败 (HTTP ${result.status}): ${result.body.substring(0, 300)}`); }

  if (result.status !== 200 || !json.success) {
    throw new Error(`创建任务失败 (HTTP ${result.status}): ${json.data?.message || result.body.substring(0, 300)}`);
  }

  console.log(`✅ 任务已创建: hash=${json.data.hash}`);
  return json.data.hash;
}

// ============ 轮询结果 ============
async function pollResult(hash) {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const url = new URL(`https://mvsep.com/api/separation/get?${urlEncode({ hash })}`);
    const result = await request(url, { method: 'GET' }, null);

    let json;
    try { json = JSON.parse(result.body); } catch (e) { throw new Error(`响应解析失败: ${result.body.substring(0, 300)}`); }

    const status = json.status;
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (status === 'done') {
      console.log(`✅ 分离完成 (${elapsed}s)`);
      return json.data;
    }

    if (status === 'failed' || status === 'not_found') {
      throw new Error(`分离失败: ${json.data?.message || json.status}`);
    }

    // waiting / processing / distributing / merging
    const detail = status === 'waiting' && json.data?.current_order
      ? ` (队列位置 ${json.data.current_order})`
      : '';
    console.log(`⏳ ${status}... (${elapsed}s)${detail}`);
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error(`轮询超时 (${MAX_POLL_TIME / 1000}s)`);
}

// ============ 下载文件 ============
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : require('http');
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

// ============ 工具 ============
function getSepTypeName(sepType) {
  const names = {
    40: 'BS Roformer (vocals, instrumental)',
    25: 'MDX23C (vocals, instrumental)',
    9: 'Ultimate Vocal Remover VR (vocals, music)',
    48: 'MelBand Roformer (vocals, instrumental)',
    11: 'Demucs3 Model B (人声，鼓声，贝斯，其他)',
    123: 'BS PolarFormer (vocals, instrumental)',
    33: 'Vit Large 23 (vocals, instrum)'
  };
  return names[sepType] || '未知';
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
}

// ============ 主流程 ============
async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // 解析参数（支持 --sep-type N，位置参数: <输入mp3> [输出目录]）
  let sepType = DEFAULT_SEP_TYPE;
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--sep-type') {
      sepType = parseInt(args[++i], 10);
      if (isNaN(sepType)) { console.error('❌ --sep-type 后需跟数字'); process.exit(1); }
    } else if (a === '--dry-run') {
      // 已标记
    } else if (!a.startsWith('--')) {
      positional.push(a);
    }
  }

  const inputPath = positional[0];
  if (!inputPath) {
    console.error('用法: node stem.js <输入mp3> [输出目录] [--sep-type 40] [--dry-run]');
    process.exit(1);
  }

  const resolvedInput = path.isAbsolute(inputPath) ? inputPath : path.resolve(WORKSPACE_ROOT, inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`❌ 输入文件不存在: ${resolvedInput}`);
    process.exit(1);
  }

  // 输出目录：默认在输入文件同目录下创建 .stem/ 子目录
  const inputDir = path.dirname(resolvedInput);
  const inputBase = path.basename(resolvedInput, path.extname(resolvedInput));
  const outputDir = positional[1]
    ? path.resolve(WORKSPACE_ROOT, positional[1])
    : path.join(inputDir, '.stem');

  console.log(`🎚️  音轨分离: "${inputBase}"`);
  console.log(`   输入: ${resolvedInput}`);
  console.log(`   输出: ${outputDir}`);

  if (dryRun) {
    console.log(`🔍 --dry-run: 将调用 mvsep sep_type=${sepType} 分离人声轨`);
    return;
  }

  try {
    // 1. 创建分离任务
    const hash = await createSeparation(resolvedInput, sepType, DEFAULT_OUTPUT_FORMAT, false);

    // 2. 轮询结果
    const data = await pollResult(hash);

    // 3. 下载 vocals（和 instrumental）
    if (!data.files || data.files.length === 0) {
      throw new Error('分离成功但无输出文件');
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const file of data.files) {
      const url = file.url || file.link;
      if (!url) continue;
      const safeName = sanitizeFilename(file.name || path.basename(url));
      const outputPath = path.join(outputDir, safeName);
      await downloadFile(url, outputPath);
    }

    // 4. 输出摘要
    const files = fs.readdirSync(outputDir).filter(f => !f.endsWith('.json'));
    console.log(`\n✅ 音轨分离完成:`);
    for (const f of files) {
      console.log(`   ${outputDir}/${f}`);
    }

  } catch (err) {
    console.error(`❌ 失败: ${err.message}`);
    process.exit(1);
  }
}

main();
