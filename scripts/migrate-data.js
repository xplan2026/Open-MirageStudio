#!/usr/bin/env node
// ============================================================
// migrate-data.js — 数据迁移：data/ → D1（文本元数据）
//
// 方案 B（2026-08-19）：媒体留 git（data/ 随仓库 push，CI 拷入 dist/data/），
//                       本脚本只负责把文本元数据一次性迁移到 D1（mirage-meta）。
//
// 用法:
//   node scripts/migrate-data.js              # 全部文本元数据 → D1
//
// 凭证（.env 或环境变量）:
//   CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / D1_DATABASE_ID (mirage-meta)
// ============================================================
const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(WORKSPACE_ROOT, 'data');

// ---------- 凭证加载 ----------
function loadEnv() {
  const envPaths = [
    path.join(WORKSPACE_ROOT, '.env'),
    path.join(WORKSPACE_ROOT, '.codebuddy', '.env.codebuddy'),
  ];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const cfg = {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    d1DbId: process.env.D1_DATABASE_ID || 'ac463a4d-61ff-42bf-a56e-aeb89d7cd82a',
  };
  if (!cfg.apiToken || !cfg.accountId) {
    console.error('❌ 缺少 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID');
    process.exit(1);
  }
  return cfg;
}

const CF = loadEnv();
const API = (path) => `https://api.cloudflare.com/client/v4${path}`;

// ---------- CF API 封装 ----------
async function cf(path, opts = {}) {
  const resp = await fetch(API(path), {
    ...opts,
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${CF.apiToken}`,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  return { status: resp.status, json: await resp.json().catch(() => null) };
}

async function d1(sql, params = []) {
  const r = await cf(`/accounts/${CF.accountId}/d1/database/${CF.d1DbId}/query`, {
    method: 'POST',
    body: JSON.stringify({ sql, params }),
  });
  if (!r.json?.success) {
    throw new Error(`D1 错误: ${JSON.stringify(r.json?.errors)}`);
  }
  return r.json.result;
}

// ---------- 工具 ----------
function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
}
function readFile(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : ''; }
function readJson(p) { try { return JSON.parse(readFile(p)); } catch { return null; } }
function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const arr = line.match(/^(\w+):\s*\[(.+)\]$/);
    if (arr) { meta[arr[1]] = arr[2].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')); continue; }
    const sc = line.match(/^(\w+):\s*(.+)$/);
    if (sc) {
      let v = sc[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      meta[sc[1]] = v;
    }
  }
  return { meta, body: m[2] };
}

// ============================================================
// Phase A: 文本 → D1
// ============================================================
async function migrateSongs() {
  const dir = path.join(DATA_DIR, 'Lemong-data');
  const dirs = listDirs(dir).filter(d => d !== 'plans');
  let count = 0;
  for (const id of dirs) {
    const songDir = path.join(dir, id);
    const prompt = readJson(path.join(songDir, 'prompt.json'));
    if (!prompt) { console.warn(`  ⚠ 跳过歌曲 "${id}"（无 prompt.json）`); continue; }
    const lyrics = readFile(path.join(songDir, '歌词.md')) || prompt.lyrics || '';
    const background = readFile(path.join(songDir, '创作背景.md'));
    // 主 mp3: {dir}.mp3，否则任意
    let audioKey = '';
    const mainMp3 = path.join(songDir, `${id}.mp3`);
    if (fs.existsSync(mainMp3)) audioKey = `Lemong-data/${id}/${id}.mp3`;
    else {
      const mp3 = fs.readdirSync(songDir).find(f => f.endsWith('.mp3'));
      if (mp3) audioKey = `Lemong-data/${id}/${mp3}`;
    }
    await d1(`INSERT OR REPLACE INTO songs (id,title,lyrics,background,music_prompt,audio_key,created_at)
              VALUES (?,?,?,?,?,?,?)`,
      [id, prompt.title || id, lyrics, background, JSON.stringify(prompt.music_prompt || {}), audioKey, prompt.created_at || '']);
    count++;
    console.log(`  ✅ 歌曲: ${id} (audio=${audioKey || '无'})`);
  }
  console.log(`[D1] songs 迁移完成: ${count} 首`);
}

async function migrateMvProjects() {
  const dir = path.join(DATA_DIR, 'Erhu-data');
  const indexContent = readFile(path.join(dir, 'INDEX.md'));
  const dirs = listDirs(dir).filter(d => d !== 'plans');
  let count = 0;
  for (const id of dirs) {
    const projDir = path.join(dir, id);
    const files = fs.readdirSync(projDir);
    const mp3 = files.find(f => f.endsWith('.mp3'));
    const mp4 = files.find(f => f.endsWith('.mp4'));
    const imagesDir = path.join(projDir, 'images');
    const imageKeys = [];
    if (fs.existsSync(imagesDir)) {
      for (const img of fs.readdirSync(imagesDir)) {
        if (/\.(jpg|jpeg|png|webp)$/i.test(img)) imageKeys.push(`Erhu-data/${id}/images/${img}`);
      }
    }
    const statusLine = indexContent.split('\n').find(l => l.includes(id));
    const status = statusLine && statusLine.includes('已完成') ? '已完成' : '已完成';
    await d1(`INSERT OR REPLACE INTO mv_projects (id,title,status,plan_date,completed_date,mp3_key,mp4_key,images,image_count)
              VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, id, status, '', '', mp3 ? `Erhu-data/${id}/${mp3}` : '', mp4 ? `Erhu-data/${id}/${mp4}` : '',
       JSON.stringify(imageKeys), imageKeys.length]);
    count++;
    console.log(`  ✅ MV: ${id} (mp4=${mp4 || '无'}, images=${imageKeys.length})`);
  }
  console.log(`[D1] mv_projects 迁移完成: ${count} 个`);
}

async function migrateNovel() {
  const novelDir = path.join(DATA_DIR, 'XujieWriter-data', '幻觉', '.novel');
  const chaptersDir = path.join(novelDir, 'chapters');
  if (!fs.existsSync(chaptersDir)) { console.warn('  ⚠ 未找到小说章节目录'); return; }
  await d1(`INSERT OR REPLACE INTO novels (id,title) VALUES (?,?)`, ['幻觉', '幻觉']);
  let count = 0;
  for (const volDir of listDirs(chaptersDir).filter(d => d.startsWith('volume-')).sort()) {
    const volNum = parseInt(volDir.replace('volume-', ''), 10);
    const volPath = path.join(chaptersDir, volDir);
    for (const f of fs.readdirSync(volPath).filter(f => f.endsWith('.md') && f !== 'README.md').sort()) {
      const content = readFile(path.join(volPath, f));
      const match = f.match(/^ch(\d+)-(.+)\.md$/);
      const title = match ? match[2] : f.replace('.md', '');
      await d1(`INSERT OR REPLACE INTO chapters (novel_id,slug,volume,title,content,word_count)
                VALUES (?,?,?,?,?,?)`,
        ['幻觉', f.replace('.md', ''), volNum, title, content, content.length]);
      count++;
    }
  }
  console.log(`[D1] chapters 迁移完成: ${count} 章`);
}

async function migrateFamilies() {
  const dir = path.join(DATA_DIR, 'Zhupu-data');
  const dirs = listDirs(dir).filter(d => d !== 'graph');
  let count = 0;
  for (const id of dirs) {
    const data = readJson(path.join(dir, id, '族谱.json'));
    if (!data) { console.warn(`  ⚠ 跳过家族 "${id}"（无族谱.json）`); continue; }
    await d1(`INSERT OR REPLACE INTO families (id,name,description,data) VALUES (?,?,?,?)`,
      [id, data.family_name || id, data.description || '', JSON.stringify(data)]);
    count++;
    console.log(`  ✅ 家族: ${id}（${data.family_name}）`);
  }
  console.log(`[D1] families 迁移完成: ${count} 家`);
}

async function migrateBlog() {
  const dir = path.join(DATA_DIR, 'blog-posts');
  if (!fs.existsSync(dir)) { console.warn('  ⚠ 无 blog-posts 目录'); return; }
  let count = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'INDEX.md').sort()) {
    const raw = readFile(path.join(dir, f));
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.title) { console.warn(`  ⚠ 跳过博客 "${f}"（无 title）`); continue; }
    await d1(`INSERT OR REPLACE INTO blog_posts (slug,title,date,summary,tags,content) VALUES (?,?,?,?,?,?)`,
      [f.replace('.md', ''), meta.title, meta.date || '', meta.summary || '',
       JSON.stringify(Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : [])), body]);
    count++;
  }
  console.log(`[D1] blog_posts 迁移完成: ${count} 篇`);
}

// ---------- 主流程 ----------
(async () => {
  console.log('=== 数据迁移开始（D1 文本元数据）===');
  console.log('\n--- [1/5] 歌曲 ---'); await migrateSongs();
  console.log('\n--- [2/5] MV 作品 ---'); await migrateMvProjects();
  console.log('\n--- [3/5] 小说章节 ---'); await migrateNovel();
  console.log('\n--- [4/5] 家族族谱 ---'); await migrateFamilies();
  console.log('\n--- [5/5] 博客 ---'); await migrateBlog();
  console.log('\n=== 数据迁移结束 ✅（媒体留 git，无需迁移）===');
})().catch(e => { console.error('\n❌ 迁移失败:', e.message); process.exit(1); });
