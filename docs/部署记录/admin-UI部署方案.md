# Admin-UI 部署方案

> 状态：**生效中** | 创建：2026-08-19 | 维护：大副
> 定位：**当前方案权威文档** — 反映最新部署状态；历史变更见 `docs/部署记录/` 下的部署记录，本文件需随部署记录更新**同步更新**（变更后更新文末「变更记录」）。
> 关联部署记录：
> - `2026-08-09-cloudflare-pages-部署.md`（官网 Pages 部署 + 服务器初始化）
> - `2026-08-11-admin-ui-部署.md`（Admin-UI 手动部署 + Nginx）
> - `2026-08-15-github-actions-自动部署.md`（服务器自动部署 CI 落地）
> - `sever_tree_20260815.md`（服务器目录树快照）

---

## 1. 方案总览

Admin-UI 是 Coordinator-Agent 的**工作台前端**（React 18 + Vite SPA），需要与后端 API 同源通信，因此采用「**构建产物 + 静态托管在 4C4G 应用服务器**」的部署方式：

| 维度 | 决策 |
|---|---|
| 前端技术栈 | React 18 + Vite（`coordinator-agent/admin-ui/`），`base=/workbench/` |
| 托管方式 | Nginx 静态文件 + 反向代理后端 API |
| 部署目标 | 腾讯云 PK109 4C4G（`182.254.180.26`，ubuntu） |
| 域名 | `a-o-c.cc.cd`（DNS-only 灰云） |
| 后端 | Coordinator-Agent（Express，`localhost:3100`，PM2 守护） |
| 后端部署 | GitHub Actions `deploy-server.yml`（服务器代码自动部署） |
| **前端部署** | **手动构建 + scp（既定约束，不使用 CI）** |
| SSL | Let's Encrypt DNS-01（certbot 自动续期） |

**核心决策**：SPA 依赖后端 API（认证、调度、对话），与 Coordinator 同机部署，Nginx 统一入口，避免跨域与公网暴露 API。

---

## 2. 技术架构

```
浏览器 ── https://a-o-c.cc.cd:5656 ──→ Nginx (443 → 5656 映射)
                                        ├─ /workbench/*   → 静态 Admin-UI dist（React SPA）
                                        ├─ /auth/*        → 反代 Coordinator (localhost:3100)
                                        ├─ /api/*         → 反代 Coordinator (localhost:3100)
                                        └─ /ws 等         → 反代 Coordinator
                                              │
                                        PM2: coordinator (src/index.js, 3100)
                                              │
                                      4C4G 服务器 (182.254.180.26)
```

- **前端产物**：`admin-ui/dist/`（`vite build` 输出）
- **静态根**：`/opt/mirage-studio/coordinator-agent/admin-ui/dist/`
- **后端**：`src/index.js` 亦自带 `/workbench` 静态托管（开发/CNB 环境用），生产统一走 Nginx
- **认证**：Basic Auth（Nginx `htpasswd`）+ 二维码扫码登录（`/auth/` 路由）

---

## 3. 域名与网络

| 项 | 值 | 说明 |
|---|---|---|
| 域名 | `a-o-c.cc.cd` | 灰云（DNS-only），直连服务器 IP |
| 端口 | `5656` | 443 经 Nginx 映射到 5656，规避腾讯云对 443 的 DPI 干扰 |
| 备用 | `http://182.254.180.26:5656` | 裸 IP 直连 |
| SSL | Let's Encrypt | DNS-01 验证（`cc.cd` NS 在 dnshe.org，须用 DNS 验证而非 HTTP 验证），certbot 自动续期 |

---

## 4. 部署流程

### 4.1 部署边界（既定约束）

> **决策（2026-08-19）：Admin-UI 前端保持手动部署，不使用 CI。** 后端代码走自动部署，前端产物由手动控制，两者互不干扰。

| 范围 | 方式 | 说明 |
|---|---|---|
| 后端代码（`coordinator-agent/` 等） | CI 自动部署 | `deploy-server.yml` push main 触发（rsync + restart） |
| **前端 Admin-UI（`admin-ui/dist/`）** | **手动构建 + scp** | **不使用 CI**，`deploy-server.yml` 的 rsync 排除 `admin-ui/dist/` |

### 4.2 后端自动部署（CI）

`.github/workflows/deploy-server.yml` — push main 时触发：

```
push → checkout → rsync 到服务器（排除 .git / node_modules / .env / admin-ui/dist/）
     → npm ci --omit=dev（coordinator-agent 生产依赖）
     → pm2 restart coordinator
```

- 同步范围：`coordinator-agent/`、各 agent 目录等服务器运行代码
- **`admin-ui/dist/` 在 rsync 排除列表中**（与「手动部署」约束一致，CI 不触碰前端产物）
- Secrets：`SERVER_HOST` / `SERVER_USER` / `SERVER_SSH_KEY` 等（`.codebuddy/.env.codebuddy`）

> ⚠️ 注意：CI 只部署后端。前端 Admin-UI 一律通过 §5.2 手动部署，后端 push 不会改变前端版本。

---

## 5. 部署操作手册

### 5.1 后端代码更新（CI 自动）

```bash
git push origin main          # deploy-server.yml 自动执行 rsync + restart
```

### 5.2 前端手动更新（既定部署方式，不使用 CI）

```bash
# 本地构建
cd coordinator-agent/admin-ui && npm ci && npm run build

# scp 到服务器（路径以 8-11 记录为准，如 /opt/mirage-studio/coordinator-agent/admin-ui/dist）
scp -r dist/* ubuntu@182.254.180.26:/opt/mirage-studio/coordinator-agent/admin-ui/dist/

# 验证
curl -I https://a-o-c.cc.cd:5656/workbench/
```

### 5.3 后端服务管理（PM2）

```bash
ssh ubuntu@182.254.180.26
pm2 status coordinator          # 查看状态
pm2 logs coordinator --lines 50 # 查看日志
pm2 restart coordinator         # 重启
```

### 5.4 健康检查

```bash
curl -s https://a-o-c.cc.cd:5656/api/health   # API 存活
curl -sI https://a-o-c.cc.cd:5656/workbench/  # 前端可达（期望 200）
```

---

## 6. 与历史部署记录的关系

| 时间 | 记录 | 对本方案的影响 |
|---|---|---|
| 2026-08-09 | `2026-08-09-cloudflare-pages-部署.md` | 服务器初始化、Nginx 安装、域名解析基础 |
| 2026-08-11 | `2026-08-11-admin-ui-部署.md` | Admin-UI 首次手动部署（scp + Nginx 站点），当前 dist 即此版本 |
| 2026-08-15 | `2026-08-15-github-actions-自动部署.md` | 后端自动部署 CI 落地（deploy-server.yml），前端未纳入 |
| 2026-08-15 | `sever_tree_20260815.md` | 服务器目录树快照（含 admin-ui/dist、static-workbench 双目录并存问题） |

---

## 7. 已知问题与风险

| 级别 | 问题 | 说明 |
|---|---|---|
| P2 | **Nginx 双站点目录重叠** | `coordinator.conf` root=`admin-ui/dist` 与 `mirage-studio.conf` root=`static-workbench/workbench/` 并存（8-11 曾 scp 到后者），存在配置歧义，需统一（部署目录以本方案 §2 为准：`/opt/mirage-studio/coordinator-agent/admin-ui/dist/`） |
| P2 | **前端版本靠人工同步** | 后端 push 自动更新，前端需手动 scp 保持一致（既定约束，属可接受的运维成本） |
| P2 | Ambassador 未接入 Nginx | 对外 A2A 已取消、外交大使独立承接，Nginx 尚无对应反代配置 |

---

## 8. 变更记录

| 日期 | 变更 | 关联记录 |
|---|---|---|
| 2026-08-19 | 明确约束：**Admin-UI 前端手动部署、不使用 CI**（§4.1） | 本文件 |
| 2026-08-19 | 方案文档创建，汇总 8-09 ~ 8-15 部署记录为当前权威方案 | 本文件 |
| 2026-08-15 | 后端自动部署 CI 落地（deploy-server.yml） | `2026-08-15-github-actions-自动部署.md` |
| 2026-08-11 | Admin-UI 首次部署（scp + Nginx 站点 + 5656 端口） | `2026-08-11-admin-ui-部署.md` |
| 2026-08-09 | 服务器初始化（Nginx / 域名 / Let's Encrypt） | `2026-08-09-cloudflare-pages-部署.md` |

---

*本文档是 Admin-UI 部署的权威参考。任何部署变更须先在 `docs/部署记录/` 登记，并同步更新本文档与变更记录。*
