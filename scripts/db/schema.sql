-- ============================================================
-- mirage-meta D1 schema — 官网文本元数据
-- 执行: wrangler d1 execute mirage-meta --remote --file=schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,          -- 歌名目录名
  title TEXT NOT NULL,
  lyrics TEXT DEFAULT '',
  background TEXT DEFAULT '',
  music_prompt TEXT DEFAULT '{}',  -- JSON（MusicPrompt）
  audio_key TEXT DEFAULT '',       -- R2 key
  created_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS mv_projects (
  id TEXT PRIMARY KEY,          -- 作品目录名
  title TEXT NOT NULL,
  status TEXT DEFAULT '已完成',
  plan_date TEXT DEFAULT '',
  completed_date TEXT DEFAULT '',
  mp3_key TEXT DEFAULT '',
  mp4_key TEXT DEFAULT '',
  images TEXT DEFAULT '[]',     -- JSON 数组（R2 keys）
  image_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS novels (
  id TEXT PRIMARY KEY,          -- 如 '幻觉'
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
  novel_id TEXT NOT NULL,
  slug TEXT NOT NULL,           -- 'ch01-xxx'
  volume INTEGER DEFAULT 1,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  PRIMARY KEY (novel_id, slug)
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,          -- 家族目录名
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  data TEXT NOT NULL            -- 族谱.json 全文 JSON
);

CREATE TABLE IF NOT EXISTS blog_posts (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',       -- JSON 数组
  content TEXT DEFAULT ''
);
