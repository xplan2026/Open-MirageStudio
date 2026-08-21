#!/usr/bin/env node
// ============================================================
// build-data.mjs — 构建前数据准备：git data/ 基线 + D1 文本重建
//
// 用途（方案 B / 2026-08-19）：
//   1. 先把 git 仓库 data/ 完整复制到临时目录（真实媒体 + 文本兜底）
//   2. 再用 D1 中的文本元数据覆盖文本文件（D1 为文本权威源）
//   3. 媒体文件名与线上 dist/data 完全一致（均为 git data/ 拷贝）
//   媒体不依赖 KV/R2：由 CI 将 git data/ 拷贝进 dist/data/，Pages 静态托管
//
// 用法:
//   node scripts/build-data.mjs                 # 默认输出 website/.data-build/
//   DATA_BUILD_DIR=/tmp/db node scripts/build-data.mjs
//
// 凭证: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / D1_DATABASE_ID
// 降级: 无凭证或 D1 查询失败时，若仓库 data/ 存在则直接使用本地 data/
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCAL_DATA = path.join(ROOT, 'data');
const OUT_DIR = path.resolve(ROOT, process.env.DATA_BUILD_DIR || 'website/.data-build');

// ---------- 凭证 ----------
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    d1DbId: process.env.D1_DATABASE_ID || 'ac463a4d-61ff-42bf-a56e-aeb89d7cd82a',
  };
}
const CF = loadEnv();
const API = (p) => `https://api.cloudflare.com/client/v4${p}`;

async function d1Query(sql, params = []) {
  const resp = await fetch(API(`/accounts/${CF.accountId}/d1/database/${CF.d1DbId}/query`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF.apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const data = await resp.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data.result[0]?.results || [];
}

// ---------- 文件工具 ----------
function w(dir, file, content) {
  const full = path.join(OUT_DIR, dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}
function touch(dir, file) {
  const full = path.join(OUT_DIR, dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (!fs.existsSync(full)) fs.writeFileSync(full, '', 'utf-8');
}

// ---------- 各类型重建 ----------
async function rebuildSongs() {
  const rows = await d1Query('SELECT * FROM songs ORDER BY created_at');
  for (const s of rows) {
    const dir = `Lemong-data/${s.id}`;
    const prompt = { title: s.title, created_at: s.created_at || '', music_prompt: safeJson(s.music_prompt) };
    w(dir, 'prompt.json', JSON.stringify(prompt, null, 2));
    if (s.lyrics) w(dir, '歌词.md', s.lyrics);
    if (s.background) w(dir, '创作背景.md', s.background);
    touch(dir, `${s.id}.mp3`); // 占位：仅让 data.ts 生成 /data/* URL
  }
  return rows.length;
}

async function rebuildMv() {
  const rows = await d1Query('SELECT * FROM mv_projects');
  for (const m of rows) {
    const dir = `Erhu-data/${m.id}`;
    if (m.mp3_key) touch(dir, path.basename(m.mp3_key));
    if (m.mp4_key) touch(dir, path.basename(m.mp4_key));
    const images = safeJson(m.images);
    for (const k of images) touch(dir, k.replace(`Erhu-data/${m.id}/`, ''));
  }
  return rows.length;
}

async function rebuildNovel() {
  const rows = await d1Query('SELECT * FROM chapters ORDER BY volume, slug');
  const base = 'XujieWriter-data/幻觉/.novel/chapters';
  for (const c of rows) {
    const file = `${c.slug}.md`;
    w(`${base}/volume-${String(c.volume).padStart(2, '0')}`, file, c.content || '');
  }
  return rows.length;
}

async function rebuildFamilies() {
  const rows = await d1Query('SELECT * FROM families');
  for (const f of rows) {
    w(`Zhupu-data/${f.id}`, '族谱.json', f.data || '{}');
  }
  return rows.length;
}

async function rebuildBlog() {
  const rows = await d1Query('SELECT * FROM blog_posts ORDER BY date DESC');
  for (const b of rows) {
    const fm = `---\ntitle: "${esc(b.title)}"\ndate: "${esc(b.date)}"\nsummary: "${esc(b.summary)}"\ntags: ${JSON.stringify(safeJson(b.tags))}\n---\n\n`;
    w('blog-posts', `${b.slug}.md`, fm + (b.content || ''));
  }
  return rows.length;
}

function safeJson(v) {
  if (!v) return Array.isArray(v) ? v : (typeof v === 'object' ? v : {});
  try { return JSON.parse(v); } catch { return {}; }
}
function esc(s) { return String(s || '').replace(/"/g, '\\"'); }

// ---------- 主流程 ----------
async function main() {
  console.log(`[build-data] 输出目录: ${OUT_DIR}`);
  if (!CF.apiToken || !CF.accountId) {
    console.warn('[build-data] ⚠ 无 CF 凭证，降级使用本地 data/');
    if (fs.existsSync(LOCAL_DATA)) {
      fs.cpSync(LOCAL_DATA, OUT_DIR, { recursive: true });
      console.log(`[build-data] 已复制本地 data/ → ${OUT_DIR}`);
    } else {
      console.error('[build-data] ❌ 无凭证且本地无 data/，无法构建');
      process.exit(1);
    }
    return;
  }
  try {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    // 方案 B：先复制 git data/ 基线（真实媒体 + 文本兜底），随后 D1 文本覆盖
    if (fs.existsSync(LOCAL_DATA)) {
      fs.cpSync(LOCAL_DATA, OUT_DIR, { recursive: true });
      console.log(`[build-data] ✅ 已复制 git data/ 基线（真实媒体）→ ${OUT_DIR}`);
    }
    const songs = await rebuildSongs();
    const mvs = await rebuildMv();
    const chs = await rebuildNovel();
    const fams = await rebuildFamilies();
    const blogs = await rebuildBlog();
    console.log(`[build-data] ✅ D1 重建完成: 歌曲 ${songs} / MV ${mvs} / 章节 ${chs} / 家族 ${fams} / 博客 ${blogs}`);
  } catch (e) {
    console.warn(`[build-data] ⚠ D1 查询失败(${e.message})，降级使用本地 data/`);
    if (fs.existsSync(LOCAL_DATA)) {
      fs.rmSync(OUT_DIR, { recursive: true, force: true });
      fs.cpSync(LOCAL_DATA, OUT_DIR, { recursive: true });
      console.log(`[build-data] 已复制本地 data/ → ${OUT_DIR}`);
    } else {
      console.error('[build-data] ❌ 降级失败: 本地无 data/');
      process.exit(1);
    }
  }
}

main().catch(e => { console.error('[build-data] ❌', e); process.exit(1); });
