#!/usr/bin/env node
/**
 * 文生图脚本
 * 支持: 智谱 CogView-3-Flash（主力） | 百度千帆 Qwen-Image（备用）
 * 自动检测已配置的 API，优先使用智谱
 *
 * 用法:
 *   node scripts/generate-image.js "prompt" [size] [output] [provider]
 *   node scripts/generate-image.js "一只橘猫" 1024x1024 cat.png
 *   node scripts/generate-image.js "prompt" 1024x1024 out.png zhipu
 *   node scripts/generate-image.js "prompt" 1024x1024 out.png baidu
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 加载 .env
const homedir = require('os').homedir();
const envCandidates = [
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '.env')
];
const envPath = envCandidates.find(p => fs.existsSync(p));
if (!envPath) {
  console.error('错误: 找不到 .env 文件');
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/["']/g, '');
});

// ============ 智谱 CogView ============
async function zhipuGenerate(prompt, size = '1024x1024', n = 1) {
  const apiKey = process.env.ZHIPU_API_KEY;
  const baseUrl = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
  const model = process.env.ZHIPU_TEXT2IMAGE_MODEL || 'CogView-3-Flash';

  const url = new URL(`${baseUrl}/images/generations`);
  const body = JSON.stringify({ model, prompt, size, n });

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.data && parsed.data.length > 0 && parsed.data[0].url) {
            resolve({ data: [{ url: parsed.data[0].url }] });
          } else {
            reject(new Error(`智谱返回异常: ${data.slice(0, 200)}`));
          }
        } catch(e) {
          reject(new Error(`智谱解析失败: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============ 百度文心一格（ERNIE-ViLG）============
async function baiduWenxinGenerate(prompt, size = '1024x1024', n = 1) {
  const apiKey = process.env.BAIDU_AK;
  const secretKey = process.env.BAIDU_SK;
  if (!apiKey || !secretKey) {
    throw new Error('BAIDU_AK / BAIDU_SK 未配置');
  }

  // 获取 access_token
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
  const tokenData = await new Promise((resolve, reject) => {
    https.get(tokenUrl, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error(`百度 token 获取失败: ${JSON.stringify(tokenData)}`);
  }

  const [w, h] = size.split('x').map(Number);
  const body = JSON.stringify({
    prompt,
    width: w || 1024,
    height: h || 1024,
    image_num: n
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'aip.baidubce.com',
      path: `/rpc/2.0/ernievilg/v1/txt2imgv2?access_token=${accessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 120000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error_code) {
            reject(new Error(`百度文心一格错误 (${parsed.error_code}): ${parsed.error_msg}`));
          } else if (parsed.data && parsed.data.sub_task_result_list) {
            const images = parsed.data.sub_task_result_list
              .filter(r => r.final_image_list && r.final_image_list.length > 0)
              .map(r => ({ url: r.final_image_list[0].img_url || r.final_image_list[0].img_approve_conclusion }));
            if (images.length > 0) {
              resolve({ data: images });
            } else {
              reject(new Error(`百度返回无图片: ${data.slice(0, 300)}`));
            }
          } else {
            reject(new Error(`百度返回异常: ${data.slice(0, 300)}`));
          }
        } catch(e) {
          reject(new Error(`百度解析失败: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============ 下载图片 ============
async function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, res => {
      const file = fs.createWriteStream(outputPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(outputPath); });
      file.on('error', reject);
    }).on('error', reject);
  });
}

// ============ 主流程 ============
async function main() {
  const prompt = process.argv[2];
  const size = process.argv[3] || '1024x1024';
  const output = process.argv[4] || `output-${Date.now()}.jpg`;
  const provider = (process.argv[5] || '').toLowerCase();

  if (!prompt) {
    console.error('用法: node scripts/generate-image.js "prompt" [size] [output] [provider]');
    console.error('  provider: zhipu（默认）| baidu');
    process.exit(1);
  }

  // 自动选择 provider
  let useProvider = provider;
  if (!useProvider) {
    if (process.env.ZHIPU_API_KEY) {
      useProvider = 'zhipu';
    } else if (process.env.BAIDU_AK && process.env.BAIDU_SK) {
      useProvider = 'baidu';
    } else {
      console.error('错误: 未配置任何图片生成 API (ZHIPU_API_KEY 或 BAIDU_AK/BAIDU_SK)');
      process.exit(1);
    }
  }

  let result;
  console.log(`🎨 [${useProvider}] 生成中: "${prompt}" (${size})`);

  if (useProvider === 'zhipu') {
    result = await zhipuGenerate(prompt, size);
  } else if (useProvider === 'baidu') {
    result = await baiduWenxinGenerate(prompt, size);
  } else {
    console.error(`错误: 不支持的 provider "${useProvider}"，支持: zhipu, baidu`);
    process.exit(1);
  }

  if (result.data && result.data.length > 0) {
    const imgUrl = result.data[0].url;
    if (!imgUrl) {
      console.error('返回中没有图片URL:', JSON.stringify(result));
      process.exit(1);
    }
    console.log(`⬇️  下载图片...`);
    await downloadImage(imgUrl, output);
    console.log(`✅ 已保存: ${output}`);
  } else {
    console.error('生成失败:', JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

main().catch(e => {
  console.error('错误:', e.message);
  process.exit(1);
});
