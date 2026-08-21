/**
 * Xujie Writer Skill API — 《幻觉》创作数据接口
 *
 * 将 ai-fiction-writer 的 10 个 Skill 能力封装为 REST endpoint，供工作台页面调用：
 *  - novel-character    角色档案（列表/详情/新建/时间线/影响分析）
 *  - novel-outline      大纲编排（大纲 + 卷章计划）
 *  - novel-progress     进度管理（章节树/字数/状态流转）
 *  - novel-knowledge    思想笔记（CRUD + 标签系统 + 立意演化）
 *  - novel-analyze      扫榜拆文（benchmarks 列表）
 *  - novel-worldbuilding 世界观（worldbuilding 文件列表）
 *  - novel-logic        追踪文件（tracking 列表）
 *  - novel-review       章节修改意见（反馈 + 蝴蝶效应影响分析）
 *  - novel-writing      章节正文读取
 *  - novel-humanizer    质检报告（占位，Phase 3 接入 LLM）
 *
 * 所有路由挂在 /admin/xujie 下，由 jwtAuth 保护。
 */

import { Router } from 'express';
import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.resolve(__dirname, '..', '..', '..', 'data');
const NOVEL_DIR = path.resolve(DATA_ROOT, 'XujieWriter-data', '幻觉', '.novel');
const ZHUPU_DIR = path.resolve(DATA_ROOT, 'Zhupu-data');

export const xujieRouter = Router();

// ---------- 常量与工具 ----------

/** 10 个 Skill 的元数据（供工作台展示） */
const SKILLS = [
  { id: 'novel-analyze', name: '扫榜拆文', description: '分析榜单趋势、拆解对标书，建立个人模块库' },
  { id: 'novel-character', name: '角色档案', description: '角色卡管理、言行一致性检测、关系图谱、角色弧线' },
  { id: 'novel-humanizer', name: '去AI味质检', description: '检测AI味、时代错位、角色OOC，提供评分与改写' },
  { id: 'novel-knowledge', name: '知识库管理', description: '时间线、物价锚点、流行文化、参考资料管理' },
  { id: 'novel-logic', name: '逻辑预防', description: '时间-地点双轴标注、信息边界追踪、逻辑矩阵' },
  { id: 'novel-outline', name: '大纲编排', description: '卷章结构、多线大纲、蝴蝶效应分叉、爽点设计' },
  { id: 'novel-progress', name: '进度管理', description: '章节树、字数统计、写作状态、写作日历' },
  { id: 'novel-review', name: '多视角审稿', description: '编辑/读者/平台/作者四维度审稿与毒点排查' },
  { id: 'novel-worldbuilding', name: '世界构建', description: '世界观、地图、历法、势力、规则体系管理' },
  { id: 'novel-writing', name: '写作核心', description: '整合各 Skill 的十步写作流程与上下文注入' },
];

/** 角色文件名 → 角色名（去掉 .md 与时间线后缀） */
function charNameFromFile(file) {
  return file.replace(/\.md$/, '').replace(/-主时间线$/, '');
}

/** 解析角色卡基本信息（标题 + 基本信息列表） */
function parseCharacter(relPath, content) {
  const name = path.basename(relPath, '.md');
  const title = (content.match(/^#\s+(.+)$/m) || [])[1] || name;
  const info = {};
  const infoSection = content.match(/## 基本信息\s*\n([\s\S]*?)(?=\n## |$)/);
  if (infoSection) {
    for (const line of infoSection[1].split('\n')) {
      const m = line.match(/^-\s*\*\*([^*]+)\*\*[:：]\s*(.+)$/);
      if (m) info[m[1].trim()] = m[2].trim();
    }
  }
  return { name, title, info, content };
}

/** 列出目录下 .md 文件（忽略隐藏与 README） */
async function listMarkdown(dir) {
  const entries = await fs.readdir(dir).catch(() => []);
  return entries.filter((f) => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('.'));
}

/** 读取文本文件（不存在返回 null） */
async function readText(abs) {
  if (!existsSync(abs)) return null;
  return fs.readFile(abs, 'utf-8');
}

function safeResolve(relPath, root = NOVEL_DIR) {
  const abs = path.resolve(root, relPath || '.');
  const normalized = path.normalize(abs);
  if (normalized !== root && !normalized.startsWith(root + path.sep)) {
    const err = new Error(`路径越界: ${relPath}`);
    err.status = 400;
    throw err;
  }
  return normalized;
}

/** 从 progress.json 读取章节元数据（状态/字数/日期） */
async function loadProgress() {
  const content = await readText(path.join(NOVEL_DIR, 'progress', 'progress.json'));
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ---------- Skill 元数据 ----------

xujieRouter.get('/skills', (_req, res) => {
  res.json({ skills: SKILLS });
});

// ---------- 角色档案 (novel-character) ----------

// 角色列表
xujieRouter.get('/characters', async (_req, res) => {
  try {
    const dir = path.join(NOVEL_DIR, 'characters');
    const files = await listMarkdown(dir);
    const characters = [];
    for (const file of files) {
      const content = await readText(path.join(dir, file));
      if (!content) continue;
      const { name, title, info } = parseCharacter(file, content);
      const hasTimeline = existsSync(path.join(dir, `${name}-主时间线.md`));
      characters.push({ name, title, info, hasTimeline });
    }
    res.json({ characters });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 角色详情（含正文 + 主时间线）
xujieRouter.get('/characters/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const abs = safeResolve(path.join('characters', `${name}.md`));
    if (!existsSync(abs)) return res.status(404).json({ error: `角色 "${name}" 不存在` });
    const content = await fs.readFile(abs, 'utf-8');
    const timelineAbs = path.join(NOVEL_DIR, 'characters', `${name}-主时间线.md`);
    const timeline = existsSync(timelineAbs) ? await fs.readFile(timelineAbs, 'utf-8') : null;
    res.json({ name, ...parseCharacter(`${name}.md`, content), timeline });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 创建/更新角色卡
xujieRouter.post('/characters', async (req, res) => {
  try {
    const { name, title, content } = req.body || {};
    if (!name || typeof content !== 'string') {
      return res.status(400).json({ error: '缺少 name 或 content 字段' });
    }
    const safe = name.replace(/[\/\\:*?"<>|]/g, '_');
    const abs = safeResolve(path.join('characters', `${safe}.md`));
    const finalContent = title && !content.startsWith(`# ${title}`)
      ? `# ${title}\n\n${content}`
      : content;
    await fs.writeFile(abs, finalContent, 'utf-8');
    res.json({ ok: true, name: safe, path: path.relative(NOVEL_DIR, abs) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 角色主时间线
xujieRouter.get('/characters/:name/timeline', async (req, res) => {
  try {
    const name = req.params.name;
    const abs = safeResolve(path.join('characters', `${name}-主时间线.md`));
    if (!existsSync(abs)) return res.status(404).json({ error: `角色 "${name}" 无主时间线` });
    const content = await fs.readFile(abs, 'utf-8');
    res.json({ name, content });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- 大纲编排 (novel-outline) ----------

// 大纲 + 卷章计划
xujieRouter.get('/outline', async (_req, res) => {
  try {
    const outline = await readText(path.join(NOVEL_DIR, 'outline', 'outline.md'));
    const plan = await readText(path.join(NOVEL_DIR, 'outline', 'volume-01-chapter-plan.md'));
    res.json({ outline: outline || '', plan: plan || '' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 保存大纲
xujieRouter.post('/outline', async (req, res) => {
  try {
    const { outline, plan } = req.body || {};
    if (typeof outline !== 'string' || typeof plan !== 'string') {
      return res.status(400).json({ error: '缺少 outline 或 plan 字段' });
    }
    await fs.mkdir(path.join(NOVEL_DIR, 'outline'), { recursive: true });
    await fs.writeFile(path.join(NOVEL_DIR, 'outline', 'outline.md'), outline, 'utf-8');
    await fs.writeFile(path.join(NOVEL_DIR, 'outline', 'volume-01-chapter-plan.md'), plan, 'utf-8');
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- 进度与章节 (novel-progress / novel-writing) ----------

// 章节树：progress.json 元数据 + 实际文件扫描合并
xujieRouter.get('/chapters', async (_req, res) => {
  try {
    const progress = await loadProgress();
    const chapterDir = path.join(NOVEL_DIR, 'chapters');
    const files = await fs.readdir(chapterDir).catch(() => []);
    const list = [];

    for (const volName of files) {
      const volDir = path.join(chapterDir, volName);
      if (!statSync(volDir).isDirectory()) continue;
      const chapters = (await fs.readdir(volDir).catch(() => []))
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .sort((a, b) => a.localeCompare(b, 'zh-CN'));

      for (const file of chapters) {
        const idMatch = file.match(/^ch(\d+)/);
        const id = idMatch ? parseInt(idMatch[1], 10) : null;
        const title = file.replace(/\.md$/, '').replace(/^ch\d+-\s*/, '');
        const abs = path.join(volDir, file);
        let words = 0;
        let status = 'draft';
        const content = await readText(abs).catch(() => '');
        if (content) words = content.replace(/\s/g, '').length;
        if (id && progress?.volumes?.length) {
          for (const vol of progress.volumes) {
            const meta = (vol.chapters || []).find((c) => c.id === id);
            if (meta) {
              status = meta.status || 'draft';
              break;
            }
          }
        }
        list.push({
          id,
          file,
          title,
          volume: volName,
          words,
          status,
          path: path.relative(NOVEL_DIR, abs),
        });
      }
    }

    res.json({ chapters: list, progress });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 章节正文
xujieRouter.get('/chapters/:file', async (req, res) => {
  try {
    const file = path.basename(req.params.file);
    const dir = path.join(NOVEL_DIR, 'chapters');
    let abs = null;
    for (const vol of (await fs.readdir(dir).catch(() => []))) {
      const candidate = path.join(dir, vol, file);
      if (existsSync(candidate)) { abs = candidate; break; }
    }
    if (!abs) return res.status(404).json({ error: `章节 "${file}" 不存在` });
    const content = await fs.readFile(abs, 'utf-8');
    const stat = statSync(abs);
    res.json({
      file,
      path: path.relative(NOVEL_DIR, abs),
      size: stat.size,
      words: content.replace(/\s/g, '').length,
      content,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- 思想笔记 (novel-knowledge) ----------

const NOTES_DIR = path.join(NOVEL_DIR, 'knowledge', 'reflections');

/** 解析笔记 frontmatter（title / date / tags） */
function parseNote(file, content) {
  const fm = {};
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
    }
  }
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
  return {
    name: path.basename(file, '.md'),
    title: fm.title || path.basename(file, '.md'),
    date: fm.date || '',
    tags: fm.tags ? fm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    content,
    body,
  };
}

// 思想笔记列表（含标签）
xujieRouter.get('/notes', async (_req, res) => {
  try {
    const files = await listMarkdown(NOTES_DIR);
    const notes = [];
    for (const file of files) {
      const content = await readText(path.join(NOTES_DIR, file));
      if (!content) continue;
      notes.push(parseNote(file, content));
    }
    // 标签云
    const tagCount = {};
    for (const n of notes) for (const t of n.tags) tagCount[t] = (tagCount[t] || 0) + 1;
    res.json({ notes, tags: tagCount });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 保存思想笔记（新建/更新）
xujieRouter.post('/notes', async (req, res) => {
  try {
    const { name, title, content, tags } = req.body || {};
    if (!name || typeof content !== 'string') {
      return res.status(400).json({ error: '缺少 name 或 content 字段' });
    }
    const safe = name.replace(/[\/\\:*?"<>|]/g, '_');
    const tagList = Array.isArray(tags) ? tags.filter(Boolean) : [];
    const hasFrontmatter = content.startsWith('---\n');
    let finalContent = content;
    if (!hasFrontmatter) {
      const fm = ['---', `title: ${title || safe}`, `date: ${new Date().toISOString().slice(0, 10)}`];
      if (tagList.length) fm.push(`tags: ${tagList.join(',')}`);
      finalContent = `${fm.join('\n')}\n---\n\n${content}`;
    }
    await fs.mkdir(NOTES_DIR, { recursive: true });
    const abs = safeResolve(path.join('knowledge', 'reflections', `${safe}.md`));
    await fs.writeFile(abs, finalContent, 'utf-8');
    res.json({ ok: true, name: safe });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 删除思想笔记
xujieRouter.delete('/notes/:name', async (req, res) => {
  try {
    const name = path.basename(req.params.name);
    const abs = safeResolve(path.join('knowledge', 'reflections', `${name}.md`));
    if (!existsSync(abs)) return res.status(404).json({ error: `笔记 "${name}" 不存在` });
    await fs.unlink(abs);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- 扫榜拆文 (novel-analyze) ----------

xujieRouter.get('/benchmarks', async (_req, res) => {
  try {
    const dir = path.join(NOVEL_DIR, 'benchmarks');
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    const benchmarks = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const bDir = path.join(dir, entry.name);
      const files = await fs.readdir(bDir).catch(() => []);
      benchmarks.push({ name: entry.name, files });
    }
    res.json({ benchmarks });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- 世界观 (novel-worldbuilding) ----------

xujieRouter.get('/worldbuilding', async (_req, res) => {
  try {
    const dir = path.join(NOVEL_DIR, 'worldbuilding');
    const files = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    const world = await readText(path.join(dir, 'world.md'));
    res.json({ world: world || '', entries: files.map((f) => ({ name: f.name, isDir: f.isDirectory() })) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- 追踪文件 (novel-logic) ----------

xujieRouter.get('/tracking', async (_req, res) => {
  try {
    const dir = path.join(NOVEL_DIR, 'tracking');
    const files = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    const list = [];
    for (const f of files) {
      const abs = path.join(dir, f.name);
      let size = 0;
      try { size = f.isFile() ? statSync(abs).size : 0; } catch { /* 忽略 */ }
      list.push({ name: f.name, isDir: f.isDirectory(), size });
    }
    res.json({ tracking: list });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 读取 tracking 下任意文本文件
xujieRouter.get('/tracking/file', async (req, res) => {
  try {
    const rel = req.query.path;
    const abs = safeResolve(path.join('tracking', rel || ''));
    if (!existsSync(abs)) return res.status(404).json({ error: '文件不存在' });
    const content = await fs.readFile(abs, 'utf-8');
    res.json({ path: path.relative(NOVEL_DIR, abs), content });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- 章节修改意见与蝴蝶效应 (novel-review / novel-outline) ----------

const FEEDBACK_FILE = path.join(NOVEL_DIR, 'tracking', 'feedback.json');

/** 读取修改意见库 */
async function loadFeedback() {
  const content = await readText(FEEDBACK_FILE);
  if (!content) return { items: [] };
  try {
    const parsed = JSON.parse(content);
    return { items: Array.isArray(parsed) ? parsed : parsed.items || [] };
  } catch {
    return { items: [] };
  }
}

async function saveFeedback(data) {
  await fs.mkdir(path.dirname(FEEDBACK_FILE), { recursive: true });
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 修改意见列表（可按章节过滤）
xujieRouter.get('/feedback', async (req, res) => {
  try {
    const { items } = await loadFeedback();
    const chapter = req.query.chapter;
    const filtered = chapter ? items.filter((i) => i.chapter === chapter) : items;
    res.json({ items: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 提交修改意见（pending）
xujieRouter.post('/feedback', async (req, res) => {
  try {
    const { chapter, content, dimension } = req.body || {};
    if (!chapter || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: '缺少 chapter 或 content 字段' });
    }
    const { items } = await loadFeedback();
    const item = {
      id: `fb-${Date.now()}`,
      chapter,
      dimension: dimension || 'general',
      content: content.trim(),
      status: 'pending', // pending → executed → confirmed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.unshift(item);
    await saveFeedback({ items });
    res.json({ ok: true, item });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 意见状态流转
xujieRouter.post('/feedback/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    const ALLOWED = ['pending', 'executed', 'confirmed'];
    if (!ALLOWED.includes(status)) return res.status(400).json({ error: `非法状态: ${status}` });
    const { items } = await loadFeedback();
    const item = items.find((i) => i.id === id);
    if (!item) return res.status(404).json({ error: `意见 ${id} 不存在` });
    item.status = status;
    item.updatedAt = new Date().toISOString();
    await saveFeedback({ items });
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 蝴蝶效应影响分析：角色/关键词 → 受影响章节 + Zhupu 族谱联动提示
xujieRouter.get('/impact', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ keyword: '', affectedChapters: [], zhupu: [], notes: [] });

    // 1. 扫描章节正文，找出包含关键词的章节
    const chapterDir = path.join(NOVEL_DIR, 'chapters');
    const affectedChapters = [];
    for (const vol of (await fs.readdir(chapterDir).catch(() => []))) {
      const volDir = path.join(chapterDir, vol);
      if (!statSync(volDir).isDirectory()) continue;
      for (const file of (await fs.readdir(volDir).catch(() => [])).filter((f) => f.endsWith('.md'))) {
        const content = await readText(path.join(volDir, file));
        if (!content || !content.includes(q)) continue;
        const count = content.split(q).length - 1;
        affectedChapters.push({ file, volume: vol, hits: count });
      }
    }

    // 2. Zhupu 族谱联动：在族谱 JSON 中检索同名成员
    const zhupu = [];
    const zhupuRoot = ZHUPU_DIR;
    if (existsSync(zhupuRoot)) {
      const families = (await fs.readdir(zhupuRoot, { withFileTypes: true }).catch(() => []))
        .filter((f) => f.isDirectory());
      for (const fam of families) {
        const tree = path.join(zhupuRoot, fam.name, '族谱.json');
        if (!existsSync(tree)) continue;
        try {
          const json = JSON.parse(await fs.readFile(tree, 'utf-8'));
          const members = json.members || {};
          for (const [id, m] of Object.entries(members)) {
            if ((m.name || '').includes(q) || (m.note || '').includes(q)) {
              zhupu.push({ family: fam.name, memberId: id, member: m.name, relation: m.relation || '' });
            }
          }
        } catch { /* 忽略损坏 JSON */ }
      }
    }

    // 3. 思想笔记中引用
    const notes = [];
    for (const file of (await listMarkdown(NOTES_DIR))) {
      const content = await readText(path.join(NOTES_DIR, file));
      if (content && content.includes(q)) notes.push(path.basename(file, '.md'));
    }

    res.json({ keyword: q, affectedChapters, zhupu, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 质检报告 (novel-humanizer) 占位 ----------

xujieRouter.get('/quality', async (_req, res) => {
  try {
    const reportsDir = path.join(NOVEL_DIR, 'humanizer', 'reports');
    const files = existsSync(reportsDir)
      ? (await fs.readdir(reportsDir).catch(() => [])).filter((f) => f.endsWith('.json'))
      : [];
    res.json({ reports: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
