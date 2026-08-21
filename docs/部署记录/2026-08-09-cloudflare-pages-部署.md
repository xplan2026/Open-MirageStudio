# Cloudflare Pages 部署记录

**日期**: 2026-08-09 ~ 2026-08-10（两阶段）
**状态**: ✅ 全部完成

## 总览架构

```
                    ┌──────────────────────────────────────────────┐
                    │            cc.cd (Cloudflare DNS Zone)       │
                    │                                              │
  mirage.cc.cd ─────┤  CF Pages 自定义域名 (橙云, proxied)        │
    (官网)          │  └→ Cloudflare Pages CDN                     │
                    │       └→ GitHub Actions 构建 → Astro SSG     │
                    │                                              │
  a-o-c.cc.cd ──────┤  DNS-only (灰云, 不代理)                    │
    (工作台)        │  └→ 182.254.180.26:443 (腾讯云 4C4G)        │
                    │       └→ Nginx v4 (Let's Encrypt TLS)        │
                    │             ├─ /workbench/  → Admin-UI 静态  │
                    │             ├─ /admin/*     → localhost:3100  │
                    │             └─ /a2a/*       → localhost:3100  │
                    └──────────────────────────────────────────────┘
```

---

## 一、Cloudflare Pages 项目 (官网)

### 基本信息

| 属性 | 值 |
|------|-----|
| 项目名 | `mirage-studio-website` |
| Pages URL | `https://mirage-studio-website.pages.dev` |
| 自定义域名 | `mirage.cc.cd` |
| 生产分支 | `main` |
| 构建命令 | `npm run build` |
| 构建目录 | `website/dist` |
| Account ID | `1b9f2ccbdc655cf10384c9ef205b6eab` |
| Zone ID | `eb003ce4cf29882025a972a611acb633` |
| API Token | `YOUR_CLOUDFLARE_API_TOKEN` |
| Token 类型 | Custom Token: #Zone:DNS:Edit + #Zone:Zone:Edit + #Account:Pages |

### DNS 记录

| 记录 | 类型 | 内容 | 代理 |
|------|------|------|------|
| `mirage.cc.cd` | CNAME | `mirage-studio-website.pages.dev` | ✅ 橙云 (proxied) |
| `cc.cd` (NS) | NS | `alec.ns.cloudflare.com` | — |
| `cc.cd` (NS) | NS | `rosa.ns.cloudflare.com` | — |

> **注意**: cc.cd Zone 仅保留 2 条 Cloudflare NS 记录，原有 dnshe.com 残留 NS 已清除。

### GitHub Actions 工作流

**文件**: `.github/workflows/deploy-website.yml`

```
触发: push to main (path: website/** / data/** / .github/workflows/deploy-website.yml)
流程: checkout → setup-node@22 → npm ci → npm run build → wrangler-action deploy

Secrets (GitHub):
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID
```

### 媒体文件代理

Cloudflare Pages `_redirects` 规则：

```
/data/*  http://182.254.180.26/data/:splat  200
```

将 `/data/*` 请求代理到源站 Nginx，实现媒体文件（歌曲 MP3、MV MP4、图片等）的直接加载。

### 关键修复记录

| 日期 | 问题 | 修复 |
|------|------|------|
| 2026-08-09 | `npm ci` 失败：缺少 `package-lock.json` | 从 `.gitignore` 移除 `package-lock.json`，提交 lockfile |
| 2026-08-09 | `*.lock` 全局忽略 | 添加 `!website/package-lock.json` 例外 |
| 2026-08-09 | Node 20 弃用 | workflow 升级到 `node-version: '22'` |
| 2026-08-09 | Astro SSR 端点 `data/[...path].ts` 导致构建失败 | 移到 `src/pages-dev/`，静态模式不引用 |
| 2026-08-10 | `mirage.cc.cd` zone 不生效 | 清理 cc.cd Zone 中的 dnshe.com 残留 NS，仅保留 Cloudflare 两条 NS |

---

## 二、工作台服务器 (Admin-UI)

### 服务器信息

| 属性 | 值 |
|------|-----|
| 服务器 | 腾讯云 PK109 4C4G |
| IP | `182.254.180.26` |
| 用户 | `ubuntu` (sudo) |
| SSH 密钥 | ed25519 (`SERVER_SSH_KEY_PATH`) |

### DNS 记录

| 记录 | 类型 | 内容 | 代理 |
|------|------|------|------|
| `a-o-c.cc.cd` | A | `182.254.180.26` | ❌ 灰云 (DNS-only) |

> **灰云原因**: Cloudflare 代理节点到腾讯云的入站 HTTP 连接被腾讯云根据未备案域名拦截（521 错误）。DNS-only 绕开代理层，用户直连服务器。

### SSL 证书 (Let's Encrypt)

**签发方式**: DNS-01 验证（certbot-dns-cloudflare 插件）

> HTTP-01 验证被腾讯云拦截（Let's Encrypt 验证服务器被重定向到 dnspod.qcloud.com 备案拦截页），改用 DNS-01。

| 属性 | 值 |
|------|-----|
| 签发日期 | 2026-08-09 |
| 到期日期 | 2026-11-07 (90 天) |
| 自动续期 | `/etc/cron.d/certbot`，每天两次 |
| 凭据文件 | `/etc/letsencrypt/cloudflare.ini` (600 权限) |
| 插件 | `python3-certbot-dns-cloudflare` |

```bash
# 手动续期（测试）
sudo certbot renew --dry-run

# 签发命令（供参考，已完成）
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d a-o-c.cc.cd \
  --non-interactive --agree-tos --email admin@mirage.cc.cd
```

### Nginx 配置 (v4)

**文件**: `/etc/nginx/sites-available/mirage-studio`

```nginx
# HTTP → HTTPS 跳转
server {
    listen 80;
    server_name a-o-c.cc.cd;
    return 301 https://$host$request_uri;
}

# HTTPS 主服务
server {
    listen 443 ssl;
    server_name a-o-c.cc.cd;

    ssl_certificate     /etc/letsencrypt/live/a-o-c.cc.cd/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/a-o-c.cc.cd/privkey.pem;

    add_header Strict-Transport-Security "max-age=63072000" always;

    root /opt/mirage-studio/coordinator-agent/admin-ui/dist;
    index index.html;

    # ACME 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Admin-UI SPA
    location /workbench/ {
        try_files $uri $uri/ /workbench/index.html;
    }

    location / {
        return 301 /workbench/;
    }

    # Coordinator API 代理
    location /admin/ {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # A2A 协议接口
    location /a2a/ {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3100;
    }
}
```

### 路由表

| 路径 | 服务 | 说明 |
|------|------|------|
| `/` | 301 → `/workbench/` | 默认跳转到工作台 |
| `/workbench/` | Admin-UI SPA (Nginx 静态) | React SPA，try_files 兜底 |
| `/admin/*` | Coordinator API (反代 3100) | 管理 API |
| `/a2a/*` | A2A 协议接口 (反代 3100) | Agent-to-Agent 协议 |
| `/health` | 健康检查 (反代 3100) | 服务存活 |
| `/.well-known/acme-challenge/` | Let's Encrypt 验证 | certbot 续期 |

### 服务进程

| 进程 | 管理 | 端口 | 说明 |
|------|------|------|------|
| Coordinator | PM2 (name: `coordinator`) | 3100 | Node.js Express |
| Nginx | systemd | 80, 443 | 反代 + 静态 |

### 域名对比

| 域名 | 用途 | 目标 | DNS 模式 | SSL |
|------|------|------|----------|-----|
| `mirage.cc.cd` | 官网 | Cloudflare Pages | 橙云 (proxied) | Cloudflare 自动 |
| `a-o-c.cc.cd` | 工作台 | 182.254.180.26:443 | 灰云 (DNS-only) | Let's Encrypt |
| `mirage-studio-website.pages.dev` | 官网 (备用) | Cloudflare Pages | — | Cloudflare 自动 |
