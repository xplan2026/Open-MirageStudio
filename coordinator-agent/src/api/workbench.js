/**
 * Workbench API — Admin-UI 工作台数据接口
 *
 * 覆盖：
 *  - data 目录：文件树 / 文件内容 / 媒体流 / 文本保存 / 全文搜索
 *  - 对话：SSE 流式聊天（意图解析 → 建任务 → 执行 → 完成）
 *
 * 所有路由均挂在 /admin 下，由 jwtAuth 保护（媒体流可通过 ?token= 认证）。
 */

import { Router } from 'express';
import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleRequest, executeTask } from '../coordinator.js';
import { parseIntent } from '../intent/parser.js';
import { generateChatReply } from '../intent/reply.js';
import { getAgentCard } from '../agents/registry.js';
import { createTask, updateTaskStatus, getTask, TASK_STATES } from '../state/task-state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.resolve(__dirname, '..', '..', '..', 'data');

export const workbenchRouter = Router();

// ---------- 常量与工具 ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TEXT_EXTS = new Set([
  '.md', '.markdown', '.txt', '.json', '.js', '.jsx', '.mjs', '.cjs',
  '.ts', '.tsx', '.css', '.scss', '.html', '.htm', '.xml', '.yaml', '.yml',
  '.csv', '.log', '.toml', '.ini', '.env', '.gitignore', '.sh', '.py', '.sql',
]);

const MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
};

const IGNORED_DIRS = new Set(['node_modules', '.git', '.DS_Store', '.codebuddy']);

function safeResolve(relPath) {
  const abs = path.resolve(DATA_ROOT, relPath || '.');
  const normalized = path.normalize(abs);
  if (normalized !== DATA_ROOT && !normalized.startsWith(DATA_ROOT + path.sep)) {
    const err = new Error(`路径越界: ${relPath}`);
    err.status = 400;
    throw err;
  }
  return normalized;
}

/** 递归构建文件树 */
async function buildTree(absDir, relDir, depth, maxDepth) {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const abs = path.join(absDir, entry.name);
    const rel = path.join(relDir, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const node = { name: entry.name, path: rel, type: 'dir' };
      if (depth < maxDepth) {
        node.children = await buildTree(abs, rel, depth + 1, maxDepth);
      } else {
        node.hasMore = true;
      }
      nodes.push(node);
    } else if (entry.isFile()) {
      try {
        const stat = statSync(abs);
        nodes.push({
          name: entry.name,
          path: rel,
          type: 'file',
          size: stat.size,
          mtime: stat.mtimeMs,
          ext: path.extname(entry.name).toLowerCase(),
        });
      } catch {
        // 无法 stat 的文件跳过
      }
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });

  return nodes;
}

// ---------- Data 目录接口 ----------

// 文件树
workbenchRouter.get('/data/tree', async (req, res) => {
  try {
    const root = req.query.root || '';
    const maxDepth = Math.min(parseInt(req.query.depth, 10) || 6, 10);
    const abs = safeResolve(root);
    const stat = statSync(abs);
    if (!stat.isDirectory()) return res.status(400).json({ error: '不是目录' });

    const relRoot = path.relative(DATA_ROOT, abs).replace(/\\/g, '/');
    const tree = await buildTree(abs, relRoot === '.' ? '' : relRoot, 0, maxDepth);
    res.json({ root: relRoot || '/', tree, dataRoot: DATA_ROOT });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 文件内容（文本）或元信息（二进制）
workbenchRouter.get('/data/file', async (req, res) => {
  try {
    const rel = req.query.path;
    const abs = safeResolve(rel);
    if (!existsSync(abs)) return res.status(404).json({ error: '文件不存在' });
    const stat = statSync(abs);
    if (stat.isDirectory()) return res.status(400).json({ error: '是目录' });

    const ext = path.extname(abs).toLowerCase();
    const base = {
      name: path.basename(abs),
      path: rel,
      size: stat.size,
      mtime: stat.mtimeMs,
      ext,
    };

    if (TEXT_EXTS.has(ext)) {
      const content = await fs.readFile(abs, 'utf-8');
      return res.json({ ...base, type: 'text', content });
    }

    return res.json({
      ...base,
      type: 'binary',
      mime: MIME_TYPES[ext] || 'application/octet-stream',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 媒体流（支持 Range，供 <audio>/<video> 播放）
workbenchRouter.get('/data/raw', (req, res) => {
  try {
    const rel = req.query.path;
    const abs = safeResolve(rel);
    if (!existsSync(abs)) return res.status(404).json({ error: '文件不存在' });
    const stat = statSync(abs);
    if (stat.isDirectory()) return res.status(400).json({ error: '是目录' });

    const ext = path.extname(abs).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(abs);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 保存文本文件（新建/覆盖）
workbenchRouter.put('/data/file', async (req, res) => {
  try {
    const rel = req.query.path;
    const { content } = req.body || {};
    if (typeof content !== 'string') {
      return res.status(400).json({ error: '缺少 content 字段' });
    }
    const abs = safeResolve(rel);
    const ext = path.extname(abs).toLowerCase();
    if (!TEXT_EXTS.has(ext)) {
      return res.status(400).json({ error: `仅支持文本文件保存，不支持 ${ext} 格式` });
    }
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
    res.json({ ok: true, path: rel });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 全文搜索
workbenchRouter.get('/data/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ q, results: [] });

    const results = [];
    const MAX_RESULTS = 100;

    const walk = async (dir) => {
      if (results.length >= MAX_RESULTS) return;
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) return;
        if (IGNORED_DIRS.has(entry.name)) continue;
        const abs = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(abs);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!TEXT_EXTS.has(ext)) continue;
          try {
            const content = await fs.readFile(abs, 'utf-8');
            if (content.length > 500_000) continue;
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(q)) {
                const rel = path.relative(DATA_ROOT, abs).replace(/\\/g, '/');
                results.push({
                  path: rel,
                  line: i + 1,
                  snippet: lines[i].trim().slice(0, 200),
                });
                if (results.length >= MAX_RESULTS) return;
              }
            }
          } catch {
            // 跳过不可读文件
          }
        }
      }
    };

    await walk(DATA_ROOT);
    res.json({ q, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 产物统计（章节数、字数、歌曲数、MV 数等）
workbenchRouter.get('/data/stats', async (_req, res) => {
  try {
    const stats = {
      xujie: { books: 0, chapters: 0, words: 0, characters: 0 },
      lemong: { songs: 0, mp3s: 0, lyricsFiles: 0 },
      erhu: { mvs: 0, videos: 0, images: 0 },
      zhupu: { families: 0, members: 0, graphFiles: 0 },
      totalFiles: 0,
    };

    const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);
    const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

    // 歌曲数：Lemong-data 下含 mp3 的子目录
    const lemongDir = path.join(DATA_ROOT, 'Lemong-data');
    if (existsSync(lemongDir)) {
      const songs = await fs.readdir(lemongDir, { withFileTypes: true }).catch(() => []);
      for (const song of songs) {
        if (!song.isDirectory() || IGNORED_DIRS.has(song.name)) continue;
        const files = await fs.readdir(path.join(lemongDir, song.name)).catch(() => []);
        if (files.some((f) => f.toLowerCase().endsWith('.mp3'))) stats.lemong.songs++;
      }
    }

    // 小说统计
    const novelDir = path.join(DATA_ROOT, 'XujieWriter-data', '幻觉', '.novel');
    if (existsSync(novelDir)) {
      stats.xujie.books = 1;
      const chapterDir = path.join(novelDir, 'chapters');
      if (existsSync(chapterDir)) {
        let chapters = 0;
        let words = 0;
        const walkChapters = async (dir) => {
          const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
          for (const entry of entries) {
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await walkChapters(abs);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
              chapters++;
              const content = await fs.readFile(abs, 'utf-8').catch(() => '');
              words += content.replace(/\s/g, '').length;
            }
          }
        };
        await walkChapters(chapterDir);
        stats.xujie.chapters = chapters;
        stats.xujie.words = words;
      }
      const characterDir = path.join(novelDir, 'characters');
      if (existsSync(characterDir)) {
        stats.xujie.characters = (await fs.readdir(characterDir).catch(() => [])).filter((f) =>
          f.endsWith('.md'),
        ).length;
      }
    }

    // 递归统计文件（Lemong / Erhu / Zhupu 细分）
    const walk = async (dir, rel) => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const abs = path.join(dir, entry.name);
        const relPath = rel ? `${rel}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          await walk(abs, relPath);
        } else if (entry.isFile()) {
          stats.totalFiles++;
          const ext = entry.name.split('.').pop().toLowerCase();

          if (relPath.startsWith('Lemong-data')) {
            if (ext === 'mp3') stats.lemong.mp3s++;
            if (entry.name === '歌词.md') stats.lemong.lyricsFiles++;
          } else if (relPath.startsWith('Erhu-data')) {
            if (VIDEO_EXTS.has(ext)) stats.erhu.videos++;
            else if (IMAGE_EXTS.has(ext)) stats.erhu.images++;
          } else if (relPath.startsWith('Zhupu-data')) {
            if (entry.name === '族谱.json') {
              stats.zhupu.families++;
              try {
                const json = JSON.parse(await fs.readFile(abs, 'utf-8'));
                stats.zhupu.members += Object.keys(json.members || {}).length;
              } catch { /* 忽略 */ }
            }
            if (entry.name.includes('联姻图') && ext === 'json') stats.zhupu.graphFiles++;
          }
        }
      }
    };
    await walk(DATA_ROOT, '');

    // MV 数：Erhu-data 下含视频文件的子目录
    const erhuDir = path.join(DATA_ROOT, 'Erhu-data');
    if (existsSync(erhuDir)) {
      const works = await fs.readdir(erhuDir, { withFileTypes: true }).catch(() => []);
      for (const work of works) {
        if (!work.isDirectory() || IGNORED_DIRS.has(work.name)) continue;
        const files = await fs.readdir(path.join(erhuDir, work.name)).catch(() => []);
        if (files.some((f) => VIDEO_EXTS.has(f.split('.').pop().toLowerCase()))) stats.erhu.mvs++;
      }
    }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- 聊天接口 ----------

// 非流式对话（兼容简单场景）
workbenchRouter.post('/chat', async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '缺少 message 字段' });
    }
    const result = await handleRequest(message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE 流式对话
workbenchRouter.post('/chat/stream', async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: '缺少 message 字段' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. 意图解析
    send('status', { stage: 'intent', message: '正在解析创作意图…' });
    const intent = await parseIntent(message);
    send('intent', intent);
    await sleep(400);

    if (!intent.agentId || intent.confidence < 0.3) {
      // 未匹配到 Agent：交给 LLM 自由对话，具备推理与理解能力
      send('status', { stage: 'chat', message: '正在生成回复…' });
      const reply = await generateChatReply(message, intent);
      send('done', { error: false, task: null, intent, reply });
      return res.end();
    }

    const card = getAgentCard(intent.agentId);
    if (!card) {
      send('error', { message: `Agent "${intent.agentId}" 未注册。` });
      send('done', { error: true, intent });
      return res.end();
    }
    if (card.status !== 'online') {
      send('error', { message: `Agent "${card.name}" 当前不可用 (${card.status})。` });
      send('done', { error: true, intent });
      return res.end();
    }

    // 2. 创建任务
    send('status', { stage: 'task', message: `已确认由「${card.name}」处理，正在创建任务…` });
    const task = createTask({
      agentId: intent.agentId,
      intent: message,
      input: intent.params,
    });
    updateTaskStatus(task.id, TASK_STATES.RUNNING);
    send('task', {
      id: task.id,
      agentId: task.agentId,
      status: task.status,
      agentName: card.name,
      intentType: intent.intentType || intent.type || 'generic',
    });
    await sleep(500);

    // 3. 执行阶段（模拟进度；Phase 3 替换为真实适配器）
    const stages = [
      '正在读取上下文与构建数据…',
      '正在调用 Agent 执行…',
      '正在整理与汇总结果…',
    ];
    for (const stage of stages) {
      send('progress', { status: 'running', stage });
      await sleep(600);
    }

    let finalTask = getTask(task.id);
    try {
      const executed = await executeTask(task.id);
      finalTask = executed || getTask(task.id);
      send('progress', { status: 'success', stage: `任务执行完成（${finalTask.status}）` });
    } catch (err) {
      send('progress', { status: 'failed', stage: `执行失败: ${err.message}` });
    }

    // 4. 完成 —— 用 LLM 生成个性化回复（理解确认 + 下一步提示）
    send('status', { stage: 'chat', message: '正在生成回复…' });
    const reply = await generateChatReply(message, {
      ...intent,
      taskId: finalTask.id,
      agentName: card.name,
      taskStatus: finalTask.status,
    });
    send('done', {
      error: false,
      task: {
        id: finalTask.id,
        agentId: finalTask.agentId,
        status: finalTask.status,
        agentName: card.name,
      },
      intent,
      reply,
    });
  } catch (err) {
    send('error', { message: err.message });
    send('done', { error: true });
  } finally {
    res.end();
  }
});
