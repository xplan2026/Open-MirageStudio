# TODO — 数据存储改造：KV + D1 架构迁移

> 状态：实施中 | 创建：2026-08-17 | 负责人：大副
> 背景任务：官网 `/data/*` 媒体访问故障（问题 2）根治方案（A 路线）
> **方案变更（2026-08-17）**：原定 R2 + D1，因 CF 账户无法开通 R2（无可用支付方式），
> 改用 **KV + D1**（KV 免费，无需支付方式），Function 自实现 Range 206 切片。

## 1. 背景与故障根因

官网（CF Pages `mirage.cc.cd`）的音乐/MV 详情页需要播放服务器上的媒体（mp3/mp4），通过 `/data/*` URL 加载。代理链路失败原因：

1. `_redirects` 200 代理 **不支持外部域名**（官方限制）
2. Pages Function fetch **禁止裸 IP**（error 1003）
3. 域名 `a-o-c.cc.cd` 回源 → CF 边缘 429 + EdgeOne 头（`cc.cd` 实际 NS 在 dnshe.org，CF 内 zone 记录不权威，边缘特殊处理）
4. 媒体文件存于服务器 `/opt/mirage-studio/data/`，与 CF Pages 分属两个网络，无法直连

**决策**：接受 A 路线 — **媒体进 Cloudflare KV，文本元数据进 D1**，官网与存储同账户原生绑定，`data/` 目录整体弃用。

## 2. 目标架构

```
生产链（各 Agent）              存储（CF 同账户）              消费链（官网）
lemong 歌曲     ─┐                                    ┌─→ Pages Function /data/* 绑定 KV 直读（Function 切片实现 Range 206）
erhu   MV 作品   ─┤→  KV namespace mirage-media（mp3/mp4/jpg） ─┤
xujie  小说章节 ─┤                                    └─→ Astro 构建（data.ts）读 D1 拉取文本元数据
zhupu  族谱     ─┘→  D1 库 mirage-meta（文本/元数据）   ───→ 静态详情页生成
                    （publish.js 发布器统一接入）
```

- **KV namespace**：`mirage-media`，key 镜像原 `data/` 相对路径（如 `Lemong-data/幻觉/幻觉-1.mp3`）
- **D1 库**：`mirage-meta`，结构化表存文本元数据（歌词/创作背景/prompt/族谱/章节/博客）
- **媒体 URL 不变**：页面仍输出 `/data/...`，由 Function 绑定 KV 直读，零回源
- **KV 限制**：单值 ≤ 25MB（当前媒体均在范围内）；免费额度 1GB 存储 / 10 万读/天 / 1000 写/天

## 3. 现状盘点（已验证）

| 端 | 位置 | 说明 |
|---|---|---|
| 生产 | `lemong-agent/scripts/generate-music.js` | 写 `data/Lemong-data/{歌名}/`（mp3+歌词.md+创作背景.md+prompt.json） |
| 生产 | `erhu-agent/scripts/produce.js` `render.js` | 写 `data/Erhu-data/{作品}/`（mp4+mp3+images/） |
| 生产 | `xujie-writer-agent/` | 写 `data/XujieWriter-data/幻觉/`（章节 md + 大纲） |
| 生产 | `zhupu-manager-agent/scripts/*.js` | 写 `data/Zhupu-data/{家族}/族谱.json` |
| 消费 | `website/src/lib/data.ts` | Astro 构建时读仓库 `data/`（DATA_DIR 硬编码） |
| 消费 | `website/functions/data/[[path]].js` | 回源代理（当前 429 故障） |
| CI | `.github/workflows/deploy-website.yml` | 监听 `website/**`+`data/**`，构建后 `pages deploy dist` |
| 数据 | 仓库 `data/` | 135 文件全部 git 追踪（含 mp3/mp4），总 55MB |

## 4. 存储设计

### 4.1 KV namespace `mirage-media`（替代 R2 桶）

- 只存二进制媒体：`*.mp3` `*.mp4` `*.jpg` `*.jpeg` `*.png` `*.webp`
- key = 相对 `data/` 的路径（`Lemong-data/{歌名}/{歌名}.mp3`）
- 单值上限 25MB；上传前 `publish.js`/`migrate-data.js` 做大小检查，超限明确报错
- Pages Function 用 `context.env.MEDIA_KV.get(key, {type:'arrayBuffer'})` 读取，
  按 `Range` header 手动切片返回 206（KV 无原生 Range，自实现以保证播放器 seek 可用）

### 4.2 D1 库 `mirage-meta`（表结构）

```sql
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,          -- 歌名目录名
  title TEXT NOT NULL,
  lyrics TEXT DEFAULT '',
  background TEXT DEFAULT '',
  music_prompt TEXT DEFAULT '{}',  -- JSON（MusicPrompt）
  audio_key TEXT DEFAULT '',       -- KV key
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
  images TEXT DEFAULT '[]',     -- JSON 数组（KV keys）
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
```

### 4.3 Pages Bindings（`website/wrangler.toml`）

```toml
name = "mirage-studio-website"
pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "MEDIA_KV"
id = "<创建后填入>"

[[d1_databases]]
binding = "META_DB"
database_name = "mirage-meta"
database_id = "ac463a4d-61ff-42bf-a56e-aeb89d7cd82a"
```

## 5. 改造清单

### Phase 1 — 基础设施（KV 替代 R2）
- [x] 1.1 创建 D1 库 `mirage-meta`（wrangler d1 create）+ 建表（schema.sql 落库）
- [x] 1.2 编写 `website/wrangler.toml`（bindings 配置）
- [ ] 1.3 创建 KV namespace `mirage-media`（REST API 自动创建，免费无需支付）
- [ ] 1.4 本地/线上验证 Function 可绑定 KV 读对象

### Phase 2 — 一次性数据迁移
- [ ] 2.1 `scripts/migrate-data.js`：扫描 `data/` → 媒体传 KV + 文本写 D1（REST API）
- [x] 2.2 D1 迁移已执行（5 张表数据落库）
- [ ] 2.3 KV 迁移校验：KV 对象数 = data/ 媒体数；超限文件明确报错

### Phase 3 — 生产端发布器
- [x] 3.1 编写 `scripts/publish.js`（通用发布器）：
  - 入参：类型（song/mv/novel/family/blog）+ 作品目录
  - 上传媒体 → KV（`PUT /storage/kv/namespaces/{ns}/values/{key}`）
  - upsert 元数据 → D1（`POST /d1/database/{id}/query`）
  - 发布后可选触发 CI（workflow_dispatch，GITHUB_API_TOKEN）
  - 凭证：`CLOUDFLARE_API_TOKEN` `CLOUDFLARE_ACCOUNT_ID` `KV_NAMESPACE_NAME` `D1_DATABASE_ID`（`.env`）
- [x] 3.2 lemong：`generate-music.js` 末尾接入 publish（song）
- [x] 3.3 erhu：`produce.js` 末尾接入 publish（mv）
- [x] 3.4 xujie：章节写盘后接入 publish（novel）
- [x] 3.5 zhupu：`init/add/add-interactive/motto/emblem` 后接入 publish（family）

### Phase 4 — 消费端改造
- [x] 4.1 `website/functions/data/[[path]].js` 重写为 KV 绑定直读：
  - key = `data/{path}` → `MEDIA_KV.get()`（arrayBuffer）+ Range 切片返回 206
  - 保持 `Access-Control-Allow-Origin: *`
- [x] 4.2 编写 `scripts/build-data.mjs`（CI 构建前执行）：D1 → `website/.data-build/`
- [x] 4.3 `website/src/lib/data.ts`：`DATA_DIR` 支持 `DATA_BUILD_DIR`（env 可配）
- [x] 4.4 详情页媒体 URL 保持 `/data/*` 不变（无需改页面）

### Phase 5 — CI 改造与验证
- [x] 5.1 `deploy-website.yml`：触发条件移除 `data/**`；Build 前运行 `node scripts/build-data.mjs`（用 `CLOUDFLARE_API_TOKEN` secrets）
- [ ] 5.2 生产部署回归验证：
  - 5 首歌曲详情页 + 播放 + 进度条拖动（Range 206）
  - 3 个 MV 详情页 + 视频播放
  - 小说/族谱/博客页面正常

### Phase 6 — data/ 弃用与文档
- [ ] 6.1 确认稳定后 `git rm -r data/` + `.gitignore` 记录
- [ ] 6.2 服务器 `/opt/mirage-studio/data/` 保留为历史存档（nginx `/data/` 可保留或移除）
- [ ] 6.3 更新文档：`.codebuddy/CODEBUDDY.md` 数据目录说明、各 Agent `AGENTS.md`、`data/LLMs.txt`

## 6. 验收标准

| # | 验收项 | 标准 |
|---|---|---|
| 1 | 官网歌曲详情页 | `mirage.cc.cd/music/{slug}` 可播放、可拖进度条 |
| 2 | 官网 MV 详情页 | `mirage.cc.cd/mv/{slug}` 视频可播放 |
| 3 | `/data/*` 代理 | 无 429/502，响应 200/206 |
| 4 | 新作品发布 | Agent 产物发布后，官网自动更新（无需手动回源） |
| 5 | 回源链路 | 服务器不参与官网媒体服务（`data/` 弃用） |

## 7. 风险与回滚

- **风险**：KV 单值 25MB 上限 → 上传前大小检查；未来超限媒体改走 Pages 静态目录（`website/public/media/`）或 R2
- **风险**：KV 无原生 Range → Function 全量读 + 切片；当前媒体 <10MB/个，Worker 128MB 内存充足
- **风险**：KV 免费读 10 万次/天 → 官网低流量，充足；若未来流量增长需评估 R2/静态目录
- **回滚**：Phase 6 之前 git 中 `data/` 与服务器副本完整保留；Function 回源代理代码保留在 git 历史，可随时还原
- **凭证安全**：新环境变量加入 `.env`（gitignore 已覆盖），不入库
