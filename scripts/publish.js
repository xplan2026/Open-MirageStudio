#!/usr/bin/env node
// ============================================================
// publish.js — 通用发布器：Agent 产物 → D1（文本元数据）
//
// 方案 B（2026-08-19）：媒体留 git（data/ 随仓库 push，CI 拷入 dist/data/ 由 Pages 静态托管），
//                       本脚本只负责把文本元数据发布到 D1（mirage-meta）。
//
// 用法（在仓库根目录执行）:
//   node scripts/publish.js song   <相对data/的歌曲目录>   # Lemong-data/歌名
//   node scripts/publish.js mv     <相对data/的MV目录>     # Erhu-data/作品名
//   node scripts/publish.js novel                        # 全量同步小说章节
//   node scripts/publish.js family <相对data/的家族目录>   # Zhupu-data/家族名
//   node scripts/publish.js blog   <相对data/的md文件>    # blog-posts/xxx.md
//
// 凭证（.env 或环境变量）:
//   CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / D1_DATABASE_ID (mirage-meta)
//
// 无凭证时降级：打印提示并以 0 退出（不阻塞 Agent 主流程，产物仍在 data/ 由 git 承载）
// 媒体发布：走 git 中转（git add data/ && push → CI 统一部署），本脚本不做媒体上传
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

// ---------- 凭证加载 ----------
function loadConfig() {
  const envPaths = [
    path.join(ROOT, '.env'),
    path.join(ROOT, '.codebuddy', '.env.codebuddy'),
  ];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
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

const CF = loadConfig();
const API = (p) => `https://api.cloudflare.com/client/v4${p}`;

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
  return { status: resp.status, json: await resp.json().catch(() => null), raw: await resp.text().catch(() => '') };
}

async function d1(sql, params = []) {
  const r = await cf(`/accounts/${CF.accountId}/d1/database/${CF.d1DbId}/query`, {
    method: 'POST',
    body: JSON.stringify({ sql, params }),
  });
  if (!r.json?.success) throw new Error(`D1 错误: ${JSON.stringify(r.json?.errors)}`);
  return r.json.result;
}

// ---------- 工具 ----------
const readFile = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
const readJson = (p) => { try { return JSON.parse(readFile(p)); } catch { return null; } };

// ---------- 发布动作（仅文本元数据 → D1） ----------
async function publishSong(relDir) {
  const dir = path.join(DATA_DIR, relDir);
  if (!fs.existsSync(dir)) throw new Error(`目录不存在: ${relDir}`);
  const id = path.basename(dir);
  const prompt = readJson(path.join(dir, 'prompt.json'));
  if (!prompt) throw new Error(`歌曲 "${id}" 缺少 prompt.json`);
  const lyrics = readFile(path.join(dir, '歌词.md')) || prompt.lyrics || '';
  const background = readFile(path.join(dir, '创作背景.md'));
  // 媒体留 git（方案 B）：audio_key 指向 git data/ 相对路径，供官网 /data/* 静态托管
  const mp3 = fs.existsSync(path.join(dir, `${id}.mp3`)) ? `${relDir}/${id}.mp3`
    : (() => { const f = fs.readdirSync(dir).find(n => n.endsWith('.mp3')); return f ? `${relDir}/${f}` : ''; })();
  await d1(`INSERT OR REPLACE INTO songs (id,title,lyrics,background,music_prompt,audio_key,created_at)
            VALUES (?,?,?,?,?,?,?)`,
    [id, prompt.title || id, lyrics, background, JSON.stringify(prompt.music_prompt || {}), mp3, prompt.created_at || '']);
  console.log(`✅ [song] ${id} (文本 → D1，媒体留 git: ${mp3 || '无'})`);
}

async function publishMv(relDir) {
  const dir = path.join(DATA_DIR, relDir);
  if (!fs.existsSync(dir)) throw new Error(`目录不存在: ${relDir}`);
  const id = path.basename(dir);
  const mediaFiles = fs.readdirSync(dir);
  const mp3 = mediaFiles.find(n => n.endsWith('.mp3'));
  const mp4 = mediaFiles.find(n => n.endsWith('.mp4'));
  const images = mediaFiles.filter(n => !n.endsWith('.mp3') && !n.endsWith('.mp4') && /\.(jpg|jpeg|png|webp)$/i.test(n))
    .map(n => `${relDir}/${n}`);
  await d1(`INSERT OR REPLACE INTO mv_projects (id,title,status,plan_date,completed_date,mp3_key,mp4_key,images,image_count)
            VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, id, '已完成', '', '', mp3 ? `${relDir}/${mp3}` : '',
     mp4 ? `${relDir}/${mp4}` : '', JSON.stringify(images), images.length]);
  console.log(`✅ [mv] ${id} (文本 → D1，媒体留 git)`);
}

async function publishNovel() {
  const novelDir = path.join(DATA_DIR, 'XujieWriter-data', '幻觉', '.novel');
  const chaptersDir = path.join(novelDir, 'chapters');
  if (!fs.existsSync(chaptersDir)) throw new Error('未找到小说章节目录');
  await d1(`INSERT OR REPLACE INTO novels (id,title) VALUES (?,?)`, ['幻觉', '幻觉']);
  let count = 0;
  for (const volDir of fs.readdirSync(chaptersDir, { withFileTypes: true }).filter(d => d.isDirectory() && d.name.startsWith('volume-')).map(d => d.name).sort()) {
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
  console.log(`✅ [novel] 章节同步 ${count} 章`);
}

async function publishFamily(relDir) {
  const dir = path.join(DATA_DIR, relDir);
  if (!fs.existsSync(dir)) throw new Error(`目录不存在: ${relDir}`);
  const id = path.basename(dir);
  const data = readJson(path.join(dir, '族谱.json'));
  if (!data) throw new Error(`家族 "${id}" 缺少族谱.json`);
  await d1(`INSERT OR REPLACE INTO families (id,name,description,data) VALUES (?,?,?,?)`,
    [id, data.family_name || id, data.description || '', JSON.stringify(data)]);
  console.log(`✅ [family] ${id}`);
}

async function publishBlog(file) {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) throw new Error(`文件不存在: ${file}`);
  const raw = readFile(full);
  const { meta, body } = parseFrontmatter(raw);
  if (!meta.title) throw new Error(`博客 "${file}" 缺少 title`);
  await d1(`INSERT OR REPLACE INTO blog_posts (slug,title,date,summary,tags,content) VALUES (?,?,?,?,?,?)`,
    [file.replace('.md', '').replace(/^blog-posts\//, ''), meta.title, meta.date || '', meta.summary || '',
     JSON.stringify(Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : [])), body]);
  console.log(`✅ [blog] ${file}`);
}

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

// ---------- 触发官网重新部署（workflow_dispatch） ----------
async function triggerDeploy() {
  const token = process.env.GITHUB_API_TOKEN;
  if (!token) {
    console.warn('ℹ 未配置 GITHUB_API_TOKEN，跳过触发官网重新部署（可手动触发 CI）');
    return;
  }
  const repo = process.env.GITHUB_REPO || 'xplan2026/mirage-studio';
  try {
    const resp = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/deploy-website.yml/dispatches`, {
      method: 'POST',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (resp.ok) console.log('✅ 已触发官网重新部署（GitHub Actions）');
    else console.warn(`⚠ 触发部署失败 HTTP ${resp.status}（可手动触发 CI）`);
  } catch (e) {
    console.warn(`⚠ 触发部署失败: ${e.message}`);
  }
}

// ---------- 主流程 ----------
(async () => {
  const args = process.argv.slice(2);
  const type = args[0];
  const target = args[1];
  const noDeploy = args.includes('--no-deploy');
  if (!type) {
    console.error('用法: node scripts/publish.js <song|mv|novel|family|blog> <相对data/路径> [--no-deploy]');
    process.exit(1);
  }
  // 无凭证降级：媒体走 git 中转，服务器可只 push 仓库（无 CF 凭证时产物经 git+CI 上线）
  if (!CF.apiToken || !CF.accountId) {
    console.warn('⚠ publish.js: 未配置 CLOUDFLARE_API_TOKEN/ACCOUNT_ID，跳过 D1 文本发布（媒体走 git 中转，产物已保存在 data/ 本地）');
    process.exit(0);
  }
  try {
    switch (type) {
      case 'song': await publishSong(target); break;
      case 'mv': await publishMv(target); break;
      case 'novel': await publishNovel(); break;
      case 'family': await publishFamily(target); break;
      case 'blog': await publishBlog(target); break;
      default: throw new Error(`未知类型: ${type}`);
    }
    console.log('发布完成 ✅');
    if (!noDeploy) await triggerDeploy();
  } catch (e) {
    console.error('❌ 发布失败:', e.message);
    process.exit(1);
  }
})();
