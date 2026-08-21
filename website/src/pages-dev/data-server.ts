// Dev/preview 模式下的媒体文件 serve 端点
// 生产环境由 Nginx 直接 serve /data/ 目录，不进入 Astro 路由
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false; // 静态模式下跳过预渲染

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../../..');
const DATA_DIR = path.join(WORKSPACE_ROOT, 'data');

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export async function GET({ params }: { params: { path: string } }) {
  const filePath = path.join(DATA_DIR, params.path || '');

  if (!filePath.startsWith(DATA_DIR)) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return new Response('Not Found', { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(fileBuffer.length),
    },
  });
}
