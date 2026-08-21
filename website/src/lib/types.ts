// ============================================================
// 「幻觉」IP 官网 — 数据类型定义
// ============================================================

// ---- 小说相关 ----

export interface Chapter {
  slug: string;         // "ch01-大佛乡的米家"
  number: number;       // 1
  title: string;        // "大佛乡的米家"
  volume: number;       // 1
  path: string;         // 文件绝对路径
  content: string;      // Markdown 正文
  wordCount: number;
}

export interface Volume {
  number: number;
  title: string;
  chapters: Chapter[];
}

export interface Novel {
  title: string;
  volumes: Volume[];
  totalChapters: number;
}

// ---- 音乐相关（Lemong Agent 产出） ----

export interface MusicPrompt {
  caption_en: string;
  instruments: string | string[];
  mood: string | string[];
  vocal_language: string;
  vocal_style: string;
  duration: number;
  time_signature: string;
  audio_format: string;
  thinking: boolean;
  special_notes?: string;
}

export interface SongAudio {
  file: string;
  file_size?: number;
  bpm?: number;
  key?: string;
}

export interface SongPrompt {
  title: string;
  created_at: string;
  music_prompt: MusicPrompt;
  lyrics: string;
  audio: SongAudio;
}

export interface SongMeta {
  id: string;           // 目录名，如 "归航109"
  title: string;        // 歌曲名
  lyrics: string;       // 歌词全文
  musicPrompt: MusicPrompt;
  audioFile: string;    // mp3 相对路径
  background?: string;  // 创作背景（可选）
  createdAt: string;
  hasBackground: boolean;
}

// ---- MV 相关（Erhu Agent 产出） ----

export type ErhuStatus = '计划中' | '作曲中' | '生图中' | '渲染中' | '已完成' | '失败';

export interface ErhuProject {
  id: string;           // 目录名，如 "此身长在画图间"
  title: string;
  planDate: string;
  completedDate?: string;
  status: ErhuStatus;
  mp3File?: string;     // mp3 路径
  mp4File?: string;     // mp4 路径
  imageCount: number;
  hasImages: boolean;
}

// ---- 族谱相关（Zhupu Agent 产出） ----

export interface FamilyMember {
  id: string;
  name: string;
  styleName?: string;
  generation: number;
  gender: '男' | '女';
  birth?: string;
  death?: string;
  father: string;
  mother: string;
  spouse: string[];
  children: string[];
  originFamily?: string;        // 配偶的原生家族 ID（用于跨家族链接）
  achievements?: Array<{
    type: string;
    title: string;
    year: string;
    detail: string;
  }>;
  notes?: string;
}

export interface FamilyData {
  family_name: string;
  created_at: string;
  updated_at: string;
  description: string;
  culture: {
    motto?: string;
    emblem?: string;
    origin?: string;
    notes?: string;
  };
  generation_names: Record<string, string>;
  members: Record<string, FamilyMember>;
}

export interface FamilyMeta {
  id: string;           // 目录名，如 "米家"
  name: string;         // "米家"
  description: string;
  memberCount: number;
  generationCount: number;
  motto?: string;
}

// ---- 博客相关 ----

export interface BlogPost {
  slug: string;         // 文件名不含 .md，如 "01-mirage-studio-architecture"
  title: string;        // 文章标题（从 frontmatter 解析）
  date: string;         // 发布日期
  summary: string;      // 摘要
  tags: string[];       // 标签
  content: string;      // Markdown 正文（不含 frontmatter）
}
