// ============================================================
// 「幻觉」IP 官网 — 数据读取层
// 在 Astro 构建时（Node.js 环境）读取 data/ 目录
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../..');
// 数据目录：默认仓库 data/；CI 构建时由 build-data.mjs 重建到临时目录，
// 通过 DATA_BUILD_DIR 环境变量指定（如 website/.data-build）
const DATA_DIR = process.env.DATA_BUILD_DIR
  ? path.resolve(WORKSPACE_ROOT, process.env.DATA_BUILD_DIR)
  : path.join(WORKSPACE_ROOT, 'data');

// ---- 工具函数 ----

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFile(filePath)) as T;
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function listDirs(dirPath: string): string[] {
  if (!fileExists(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

// ---- 小说数据 ----

import type { Novel, Volume, Chapter } from './types';

export function getNovel(): Novel | null {
  const novelDir = path.join(DATA_DIR, 'XujieWriter-data', '幻觉', '.novel');
  if (!fileExists(novelDir)) return null;

  const chaptersDir = path.join(novelDir, 'chapters');
  const outlinePath = path.join(novelDir, 'outline', 'outline.md');

  // 读取大纲获取卷结构
  const volumes: Volume[] = [];
  const volumeDirs = listDirs(chaptersDir).filter(d => d.startsWith('volume-')).sort();

  for (const volDir of volumeDirs) {
    const volNum = parseInt(volDir.replace('volume-', ''), 10);
    const volPath = path.join(chaptersDir, volDir);
    const chapterFiles = fs.readdirSync(volPath)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .sort();

    const chapters: Chapter[] = chapterFiles.map(f => {
      const match = f.match(/^ch(\d+)-(.+)\.md$/);
      const num = match ? parseInt(match[1], 10) : 0;
      const title = match ? match[2] : f.replace('.md', '');
      const filePath = path.join(volPath, f);
      const content = readFile(filePath);
      return {
        slug: f.replace('.md', ''),
        number: num,
        title,
        volume: volNum,
        path: filePath,
        content,
        wordCount: content.length,
      };
    });

    volumes.push({ number: volNum, title: `第${volNum}卷`, chapters });
  }

  return {
    title: '幻觉',
    volumes,
    totalChapters: volumes.reduce((sum, v) => sum + v.chapters.length, 0),
  };
}

// ---- 音乐数据 ----

import type { SongMeta, SongPrompt } from './types';

export function getSongs(): SongMeta[] {
  const lemongDir = path.join(DATA_DIR, 'Lemong-data');
  if (!fileExists(lemongDir)) return [];

  const dirs = listDirs(lemongDir);
  const songs: SongMeta[] = [];

  for (const dir of dirs) {
    const songDir = path.join(lemongDir, dir);
    const promptPath = path.join(songDir, 'prompt.json');
    const lyricsPath = path.join(songDir, '歌词.md');
    const backgroundPath = path.join(songDir, '创作背景.md');

    if (!fileExists(promptPath)) continue;

    try {
      const prompt: SongPrompt = readJson(promptPath);
      const lyrics = fileExists(lyricsPath) ? readFile(lyricsPath) : '';
      const background = fileExists(backgroundPath) ? readFile(backgroundPath) : undefined;

      // 找到 mp3 文件（优先取主版本，即目录名.mp3）
      const mainMp3 = path.join(songDir, `${dir}.mp3`);
      let audioFile = '';
      if (fileExists(mainMp3)) {
        audioFile = `data/Lemong-data/${dir}/${dir}.mp3`;
      } else {
        // 找任意 mp3
        const files = fs.readdirSync(songDir);
        const mp3 = files.find(f => f.endsWith('.mp3'));
        if (mp3) audioFile = `data/Lemong-data/${dir}/${mp3}`;
      }

      songs.push({
        id: dir,
        title: prompt.title || dir,
        lyrics,
        musicPrompt: prompt.music_prompt,
        audioFile,
        background,
        createdAt: prompt.created_at || '',
        hasBackground: !!background,
      });
    } catch (e) {
      console.warn(`[data] 跳过 "${dir}":`, (e as Error).message);
    }
  }

  return songs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ---- MV 数据 ----

import type { ErhuProject } from './types';

export function getErhuProjects(): ErhuProject[] {
  const erhuDir = path.join(DATA_DIR, 'Erhu-data');
  if (!fileExists(erhuDir)) return [];

  const dirs = listDirs(erhuDir).filter(d => d !== 'plans');
  const projects: ErhuProject[] = [];

  // 读取 INDEX.md 获取状态
  const indexPath = path.join(erhuDir, 'INDEX.md');
  let indexContent = '';
  if (fileExists(indexPath)) {
    indexContent = readFile(indexPath);
  }

  for (const dir of dirs) {
    const projDir = path.join(erhuDir, dir);
    const mp3 = fs.readdirSync(projDir).find(f => f.endsWith('.mp3'));
    const mp4 = fs.readdirSync(projDir).find(f => f.endsWith('.mp4'));
    const imagesDir = path.join(projDir, 'images');
    const hasImages = fileExists(imagesDir);
    const imageCount = hasImages
      ? fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length
      : 0;

    // 从 INDEX.md 解析状态
    const statusLine = indexContent.split('\n').find(l => l.includes(dir));
    const status: ErhuProject['status'] = '已完成'; // 默认，INDEX 中都是已完成

    projects.push({
      id: dir,
      title: dir,
      planDate: '',
      completedDate: '',
      status,
      mp3File: mp3 ? `data/Erhu-data/${dir}/${mp3}` : undefined,
      mp4File: mp4 ? `data/Erhu-data/${dir}/${mp4}` : undefined,
      imageCount,
      hasImages,
    });
  }

  return projects;
}

// ---- 族谱数据 ----

import type { FamilyMeta, FamilyData } from './types';

export function getFamilies(): FamilyMeta[] {
  const zhupuDir = path.join(DATA_DIR, 'Zhupu-data');
  if (!fileExists(zhupuDir)) return [];

  const dirs = listDirs(zhupuDir);
  const families: FamilyMeta[] = [];

  for (const dir of dirs) {
    const familyDir = path.join(zhupuDir, dir);
    const jsonPath = path.join(familyDir, '族谱.json');
    if (!fileExists(jsonPath)) continue;

    try {
      const data: FamilyData = readJson(jsonPath);
      const generations = new Set(Object.values(data.members).map(m => m.generation));
      families.push({
        id: dir,
        name: data.family_name,
        description: data.description || '',
        memberCount: Object.keys(data.members).length,
        generationCount: generations.size,
        motto: data.culture?.motto,
      });
    } catch (e) {
      console.warn(`[data] 跳过家族 "${dir}":`, (e as Error).message);
    }
  }

  return families;
}

export function getFamily(id: string): FamilyData | null {
  const jsonPath = path.join(DATA_DIR, 'Zhupu-data', id, '族谱.json');
  if (!fileExists(jsonPath)) return null;
  try {
    return readJson<FamilyData>(jsonPath);
  } catch {
    return null;
  }
}

export function getFamilyMembers(id: string): Map<string, import('./types').FamilyMember> | null {
  const family = getFamily(id);
  if (!family) return null;
  return new Map(Object.entries(family.members));
}

/**
 * 获取指定家族中的单个成员
 */
export function getFamilyMember(familyId: string, memberId: string): import('./types').FamilyMember | null {
  const family = getFamily(familyId);
  if (!family) return null;
  return family.members[memberId] || null;
}

/**
 * 将扁平成员数据构建为嵌套树结构（用于 D3 树图）
 */
export interface TreeNode {
  id: string;
  name: string;
  birth?: string;
  death?: string;
  gender: '男' | '女';
  generation: number;
  originFamily?: string;
  spouseNames: { name: string; familyId?: string }[];
  children: TreeNode[];
}

export function buildFamilyTree(familyId: string): { root: TreeNode; nameMap: Map<string, TreeNode> } | null {
  const family = getFamily(familyId);
  if (!family) return null;

  const members = family.members;
  const nameMap = new Map<string, TreeNode>();

  // 第一遍：创建所有节点
  for (const [id, m] of Object.entries(members)) {
    const node: TreeNode = {
      id,
      name: m.name,
      birth: m.birth,
      death: m.death,
      gender: m.gender,
      generation: m.generation,
      originFamily: m.originFamily,
      spouseNames: [],
      children: [],
    };
    nameMap.set(id, node);
  }

  // 第二遍：解析配偶名称和构建父子关系
  for (const [id, m] of Object.entries(members)) {
    const node = nameMap.get(id)!;

    // 解析配偶名称
    for (const spouseId of m.spouse) {
      const spouse = members[spouseId];
      if (spouse) {
        node.spouseNames.push({
          name: spouse.name,
          familyId: spouse.originFamily,
        });
      }
    }

    // 构建父子关系：将子节点挂到父节点上
    // 只将"主心骨"成员（通常是男性或以该成员为主）作为父节点挂载子节点
    // 策略：如果该成员 children 非空，且配偶在其配偶列表中，则将子节点挂到该成员下
    for (const childId of m.children) {
      const childNode = nameMap.get(childId);
      if (childNode && !node.children.includes(childNode)) {
        node.children.push(childNode);
      }
    }
  }

  // 找到根节点：一代中 father 为空的成员（或 generation === 1 的男性成员）
  let root: TreeNode | undefined;
  const gen1 = Array.from(nameMap.values()).filter(n => n.generation === 1);
  // 优先取有最多子节点的作为根
  root = gen1.sort((a, b) => b.children.length - a.children.length)[0];

  // 如果没找到根，取 generation 最小的
  if (!root) {
    const sorted = Array.from(nameMap.values()).sort((a, b) => a.generation - b.generation);
    root = sorted[0];
  }

  // 去重：避免同一子节点挂在多个父节点下（母子都是 spouse 关系时）
  const seen = new Set<string>();
  function dedup(node: TreeNode) {
    node.children = node.children.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      dedup(c);
      return true;
    });
  }
  if (root) dedup(root);

  return { root: root || null as any, nameMap };
}

/**
 * 获取所有家族列表（用于跨家族配偶链接）
 */
export function getFamilyIndex(): { id: string; name: string }[] {
  const families = getFamilies();
  return families.map(f => ({ id: f.id, name: f.name }));
}

// ---- 博客数据 ----

import type { BlogPost } from './types';

/**
 * 解析 Markdown 文件的 YAML frontmatter
 * 期望格式：
 * ---
 * title: "..."
 * date: "..."
 * summary: "..."
 * tags: ["...", "..."]
 * ---
 * 正文内容
 */
function parseFrontmatter(raw: string): { meta: Record<string, any>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const yamlBlock = match[1];
  const body = match[2];

  const meta: Record<string, any> = {};
  const lines = yamlBlock.split('\n');
  let currentKey = '';

  for (const line of lines) {
    // 数组值：key: ["a", "b"]
    const arrMatch = line.match(/^(\w+):\s*\[(.+)\]$/);
    if (arrMatch) {
      const values = arrMatch[2]
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''));
      meta[arrMatch[1]] = values;
      continue;
    }

    // 标量值：key: "value" 或 key: value
    const scalarMatch = line.match(/^(\w+):\s*(.+)$/);
    if (scalarMatch) {
      currentKey = scalarMatch[1];
      let value = scalarMatch[2].trim();
      // 去除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      meta[currentKey] = value;
    }
  }

  return { meta, body };
}

export function getBlogPosts(): BlogPost[] {
  const blogDir = path.join(DATA_DIR, 'blog-posts');
  if (!fileExists(blogDir)) return [];

  const files = fs.readdirSync(blogDir)
    .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
    .sort();

  const posts: BlogPost[] = [];

  for (const file of files) {
    const filePath = path.join(blogDir, file);
    try {
      const raw = readFile(filePath);
      const { meta, body } = parseFrontmatter(raw);

      if (!meta.title) {
        console.warn(`[data] 跳过博客 "${file}": 缺少 title`);
        continue;
      }

      posts.push({
        slug: file.replace('.md', ''),
        title: meta.title || file,
        date: meta.date || '',
        summary: meta.summary || '',
        tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
        content: body,
      });
    } catch (e) {
      console.warn(`[data] 跳过博客 "${file}":`, (e as Error).message);
    }
  }

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBlogPost(slug: string): BlogPost | null {
  const posts = getBlogPosts();
  return posts.find(p => p.slug === slug) || null;
}
