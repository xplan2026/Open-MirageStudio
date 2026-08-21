# 部署记录 - GitHub Actions 服务器自动部署 CI/CD

- **日期**: 2026-08-15
- **部署目标**: 4C4G 服务器 `182.254.180.26`（`/opt/mirage-studio`，ubuntu 用户）
- **部署方式**: GitHub Actions `deploy-server.yml` + SSH/rsync
- **触发 commit**: `1633687`（`ci: 新增 deploy-server.yml 自动部署 workflow`）
- **部署产物**: `.github/workflows/deploy-server.yml` + 5 个 GitHub Secrets

## 背景

S4 部署后，服务器 `coordinator-agent/` 仍是旧版基线（无 S1-S3 的 `paths.js`/`xujie-adapter.js`/`verify-scheduler.mjs`），S5 端到端验证受阻。同步尝试中暴露两个问题：

1. 服务器 `git reset --hard` 因 S4 用 `sudo tar` 解压导致部分文件属 root，ubuntu 无法覆盖
2. 服务器到 GitHub 的 git 认证异常（HTTPS 通、私有仓库需 token 认证）

同时评估现有 CI/CD（`.github/workflows/deploy-website.yml`）：
- 触发路径仅 `website/`+`data/`，agent 代码变更**不触发**
- 目标为 Cloudflare Pages **静态托管**，无法承载 Express 服务（端口 3100，PM2 管理）

结论：现有 CI/CD 不适用于服务器部署，需独立服务器部署流水线。

> **部署边界（2026-08-19 确认）**: 本流水线**仅部署后端代码**。Admin-UI 前端保持**手动部署、不使用 CI**（既定约束），故 rsync 排除 `admin-ui/dist/`；该目录不会随 push 更新。

## GitHub Secrets 配置（5 个）

| Secret | 值 | 说明 |
|--------|-----|------|
| `SERVER_SSH_KEY` | 现有 `xplan_server_key` ed25519 私钥 | 复用现有密钥（非独立 deploy key） |
| `SERVER_HOST` | `182.254.180.26` | 服务器地址 |
| `SERVER_USER` | `ubuntu` | SSH 用户（sudo） |
| `SERVER_PORT` | `22` | SSH 端口 |
| `SERVER_DEPLOY_PATH` | `/opt/mirage-studio` | 部署根路径 |

> Secrets 通过 GitHub API 写入（`libsodium crypto_box_seal` sealedbox 加密，临时目录 `libsodium-wrappers-sumo` 实现）。

## Workflow 设计（deploy-server.yml）

| 项 | 配置 |
|----|------|
| 触发 | `push` main + 路径白名单（`coordinator-agent`/`lemong-agent`/`erhu-agent`/`zhupu-manager-agent`/`ambassador-agent`/workflow 自身）+ `workflow_dispatch` |
| 并发 | `concurrency` 组防相互覆盖 |
| SSH 准备 | 私钥写入 `~/.ssh/deploy_key` + `ssh-keyscan` |
| 代码同步 | rsync `--delete` 推送 5 个 agent 目录，排除 `node_modules/`/`.env`/`admin-ui/dist/`/`tasks/`/`*.log` |
| 数据同步 | `data/` 单独 `--size-only` 追加（**不 delete**，保护服务器运行产物） |
| 部署 | `npm ci --omit=dev` → `pm2 restart coordinator --update-env` → `curl localhost:3100/health` |

## 首次部署验证（Actions run #1 — success）

| 步骤 | 结果 |
|------|------|
| Setup SSH key | ✅ |
| Rsync agent code to server | ✅ |
| Sync data (append only) | ✅ |
| Install deps & restart coordinator | ✅ |

服务器侧实测：

| 检查项 | 结果 |
|--------|------|
| `GET /health` | `{"status":"ok"}` |
| `coordinator.js` 含 `acknowledgeTask` | ✅（S1-S3 新代码已就位） |
| `scripts/verify-scheduler.mjs` | ✅ 已就位 |
| PM2 coordinator | `online`（重启时间与部署时刻吻合） |

## 风险与后续

- **密钥风险**: `SERVER_SSH_KEY` 为现有主密钥，GitHub Actions 获得与本地等同的服务器权限；后续可轮换为独立 deploy key（`ssh-keygen` 新 key + authorized_keys 追加）
- **rsync `--delete`**: 服务器 `tasks/`、`node_modules/`、`.env` 受排除规则保护；`data/` 永不 delete
- **后续**: S5 端到端验证可直接开始（服务器已运行最新代码）
