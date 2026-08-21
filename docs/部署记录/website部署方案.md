---
Updated: 2026-08-20
生命周期：永久保存
---

# Website 部署方案

> 状态：**生效中（方案 B：媒体改 Pages 静态资产，2026-08-19 决策）** | 创建：2026-08-19 | 维护：大副
> 定位：**当前方案权威文档** — 反映最新部署状态；历史变更见 `docs/部署记录/` 下的部署记录，本文件需随部署记录更新**同步更新**（变更后更新文末「变更记录」）。
> 关联部署记录：
> - `2026-08-09-cloudflare-pages-部署.md`（官网 Pages 部署 + 服务器初始化）
> - `2026-08-15-github-actions-自动部署.md`（自动部署 CI 落地）
> - 关联任务：`TODO-数据存储改造.md`（KV+D1 架构 → **2026-08-19 修订为方案 B**：媒体弃用 KV，改 Pages 静态资产）

---

## 1. 方案总览

Website 是 Mirage-Studio 的**官网**（Astro 5 SSG），部署在 Cloudflare Pages，与存储（D1）同账户原生绑定：

| 维度 | 决策 |
|---|---|
| 前端技术栈 | Astro 5 SSG（`website/`），`astro build` 输出 `dist/` |
| 托管方式 | Cloudflare Pages（项目 `mirage-studio-website`） |
| 域名 | `mirage.cc.cd`（橙云 proxied）+ `.pages.dev` 备用 |
| 数据层 | D1 `mirage-meta`（文本元数据 ✅）；**媒体 → Pages 静态资产**（方案 B，2026-08-19 决策） |
| 媒体链路 | `/data/*` 由 **Pages 直接托管静态文件**（原生 Range 206，无单值大小限制） |
| 页面构建 | GitHub Actions `deploy-website.yml`（构建 + pages deploy） |
| 构建依赖 | `scripts/build-data.mjs`（CI 前从 D1 拉取文本元数据 → 本地静态生成） |

**核心决策**：官网为纯静态内容站（歌曲/MV/小说/族谱/博客展示），无需后端运行时；文本数据进 D1，**媒体随 Pages 项目静态托管**（方案 B），全部由 CF 承担，**服务器不再承担 website 任何部署功能**（见 §4 发布链路）。

> **方案变更（B vs KV）**：原方案媒体 → KV + Pages Function 自实现 Range 206（2026-08-17）。因 KV 单值 25MB 上限逼近（当前最大 mp4 13.9MB）且需维护自研切片逻辑，2026-08-19 决定**媒体改由 Pages 原生静态资产托管**：原生支持 Range、无 25MB 限制、零函数开销。文本仍走 D1 不变。

---

## 2. 技术架构

```
各 Agent 生产端                       存储 / 托管（CF 侧）                      消费端（官网）
lemong 歌曲 ──┐                                              ┌─→ /data/* 媒体（Pages 静态资产，原生 Range 206）
erhu   MV   ──┤→ 产物 → git push → CI 统一发布 ───────────→ ┤
zhupu  族谱  ──┤  （媒体进 git，构建时拷入 dist/data/）        └─→ Astro 页面（data.ts 读 .data-build/）
xujie  章节  ──┘→ D1 mirage-meta（文本） → scripts/build-data.mjs → 静态页面

GitHub push → deploy-website.yml → build-data.mjs（D1→.data-build/）+ 媒体拷贝（data→dist/data/）
          → npm run build（Astro SSG）→ wrangler pages deploy dist
```

- **媒体 URL 不变**：页面仍输出 `/data/...`，构建时将仓库 `data/` 媒体复制进 `dist/data/`，由 Pages 静态托管，零回源
- **无 KV、无 Pages Function**：方案 B 移除了 KV 绑定与 `functions/data/[[path]].js`（不再需要）
- **D1 库**：`mirage-meta`，5 张表（songs / mv_projects / novels / chapters / families / blog_posts）

---

## 3. CI/CD 部署流程

`.github/workflows/deploy-website.yml` — 触发条件：

- push main 变更 `website/**`、`scripts/build-data.mjs`、workflow 自身
- 手动 `workflow_dispatch`（发布后触发官网重建）

```
checkout → setup-node@22
        → node scripts/build-data.mjs（D1 → .data-build/）
        → cp -r data/ dist/data/（媒体随构建产物打包，交由 Pages 静态托管）
        → npm ci → npm run build（Astro SSG）→ wrangler pages deploy dist
```

Secrets：`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `D1_DATABASE_ID`

**方案 B 变更点**：移除 KV namespace 相关（无 MEDIA_KV 绑定）；媒体不再走 Function 直读，改为随构建产物进入 dist。

---

## 4. 发布链路（admin-ui 运行时产物 → 官网）

### 4.1 服务器已退出 website 部署链路

选择方案 B 后，**4C4G 服务器不再承担 website 的任何部署功能**：

| 环节 | 承担方 |
|---|---|
| 页面构建 | GitHub Actions CI |
| 静态托管 / 媒体托管 | Cloudflare Pages |
| 文本数据 | D1 `mirage-meta`（CF 侧） |
| 媒体 | Pages 静态资产（随 CI 构建） |
| 服务器（4C4G） | ❌ 不参与。仅保留：admin-ui 运行时 Agent 产物的**本地存档**（`/opt/mirage-studio/data/`） |

需退役的服务器残留：nginx 中 website 兜底站点、`/data/` alias 回源、`website/dist` 目录（确认无引用后清理）。

### 4.2 ⚠️ 现状断点：admin-ui 运行时产物无法发布

- `publish.js` 是 Agent 脚本内嵌调用的，读取**仓库根目录 `.env`** 的 Cloudflare 凭证
- 服务器 `.env` 仅含 `DEEPSEEK_* / ZHIPU_* / COORDINATOR_* / ADMIN_SECRET`（`deploy.sh` §5 只同步这些），**无 `CLOUDFLARE_API_TOKEN / ACCOUNT_ID`**
- **后果**：admin-ui 触发 Agent 在服务器产出的作品，`publish.js` 因无凭证降级跳过，**产物只存于服务器 `data/`，永远不会到官网**

### 4.3 正式发布链路（2026-08-19 确认）：git 中转 + CI 统一发布（B1）

```
admin-ui 触发 → Agent 产物写服务器 data/
  → 服务器发布脚本：git add data/ && git commit && git push（配置 git 身份 + GITHUB_API_TOKEN）
  → CI deploy-website.yml 自动触发（data/** 在触发条件内）
  → build-data.mjs（D1 文本）+ 媒体拷贝（data → dist/data）→ astro build → pages deploy
```

- **服务器只推 git，不直连 CF**（CF Token 不落地服务器，安全）
- 发布全程在 CI 单一入口，可追溯
- **媒体留 git（B1）**：`data/` 的媒体子集保留在仓库作为构建源；文本元数据仍走 D1

#### 落地清单

| # | 事项 | 说明 |
|---|---|---|
| 1 | 服务器 git 化 | `/opt/mirage-studio` init 仓库，配 remote + GITHUB_API_TOKEN（credential 或 https token） |
| 2 | 服务器发布脚本 | `scripts/server-publish.sh`：`git add data/ && commit && push`（含产物分类提交、错误处理） |
| 3 | CI 媒体拷贝 | `deploy-website.yml` 增加 `cp -r data/ dist/data/`（或 build-data.mjs 内完成） |
| 4 | 清理 website 残留 | 退役 nginx website 兜底站点、`/data/` alias、服务器 `website/dist/` |
| 5 | 协调 TODO Phase 6 | `data/` 不完全弃用：媒体子集保留 git（构建源），仅文本/历史产物可清理 |

---

## 5. 域名与 DNS

| 项 | 值 | 说明 |
|---|---|---|
| 域名 | `mirage.cc.cd` | CF Pages 自定义域，橙云 proxied |
| 备用 | `mirage-studio-website.pages.dev` | CF 默认域名 |
| DNS | `cc.cd` NS 在 dnshe.org | CF 内 zone 记录非权威，历史媒体代理故障根因之一 |

---

## 6. 部署操作手册

### 6.1 官网更新（CI 自动）

```bash
git push origin main          # 变更 website/** 或 data/** 即自动构建部署
```

### 6.2 手动触发重建（Agent 发布新作品后）

```bash
# 通过 GitHub API workflow_dispatch（发布脚本可触发）
```

### 6.3 本地构建预览

```bash
cd website
D1_DATABASE_ID=xxx node ../scripts/build-data.mjs   # 拉 D1 文本元数据
cp -r ../data dist/data                              # 媒体拷入构建产物（模拟 CI）
npm run build && npm run preview
```

---

## 7. 与历史部署记录的关系

| 时间 | 记录 | 对本方案的影响 |
|---|---|---|
| 2026-08-09 | `2026-08-09-cloudflare-pages-部署.md` | Pages 项目创建、域名绑定、首版静态部署；暴露媒体代理故障（429/1003） |
| 2026-08-15 | `2026-08-15-github-actions-自动部署.md` | deploy-website.yml 自动部署 CI 落地 |
| 2026-08-17 | `TODO-数据存储改造.md` | 决定 KV+D1 架构（原 R2 因账户无支付方式不可用） |
| 2026-08-19 | 本文件 | **方案 B**：媒体弃用 KV，改 Pages 静态资产；服务器退出 website 部署链路 |

---

## 8. 当前阻塞与已知问题

| 级别 | 问题 | 说明 |
|---|---|---|
| ✅ | **P0：admin-ui 产物发布链路已落地** | B1 已实施（2026-08-19 commit `a894de5`）：服务器 git 中转 + CI 统一发布；**两个产端均已按方案正确部署** |
| ✅ | **P1：方案 B 落地改造已完成** | 已移除 KV 绑定与 Function；CI 增加媒体拷贝步骤；`build-data.mjs` 维持 D1 拉取（2026-08-19 commit `a894de5`） |
| ✅ | **P1：生产回归验证已完成** | 官网 mirage.cc.cd 可访问媒体实体（歌曲/MV 播放 + Range 206）（2026-08-20 确认） |
| P2 | **git 单文件上限约束** | GitHub 单文件 ≤100MB（建议 <50MB）。当前最大 mp4 14MB 合规，但未来高清 MV 超限时需迁移对象存储（届时再评估 Supabase / R2） |

---

## 9. 变更记录

| 日期 | 变更 | 关联记录 |
|---|---|---|
| 2026-08-20 | 部署完成确认：**两个产端（服务器 git 中转发布端、官网 Pages 托管端）均已按方案正确部署**；官网可访问媒体实体，P0/P1 阻塞解除 | 本文件 + `docs/logs/2026-08-19.md` |
| 2026-08-19 | 发布链路固化为 B1（git 中转 + CI 统一发布），含落地清单 | 本文件 |
| 2026-08-19 | **方案 B**：媒体弃用 KV → Pages 静态资产（原生 Range，无 25MB 限制）；服务器退出 website 部署；明确 admin-ui 产物发布链路断点与推荐方案 | 本文件 |
| 2026-08-19 | 方案文档创建，汇总 Pages + 数据存储改造现状为权威方案 | 本文件 |
| 2026-08-17 | 决定 KV+D1 架构；Function 重写 KV 直读；publish.js 发布器接入四端；CI 改从 D1 构建 | `TODO-数据存储改造.md` |
| 2026-08-15 | deploy-website.yml 自动部署 CI 落地 | `2026-08-15-github-actions-自动部署.md` |
| 2026-08-09 | Pages 项目创建 + 域名绑定 + 首版部署 | `2026-08-09-cloudflare-pages-部署.md` |

---

*本文档是 Website 部署的权威参考。任何部署变更须先在 `docs/部署记录/` 登记，并同步更新本文档与变更记录。*
