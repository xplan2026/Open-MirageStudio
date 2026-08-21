#!/usr/bin/env node

/**
 * Coordinator-Agent 主入口
 * 启动 HTTP 服务，挂载所有路由 + 静态 Admin UI
 */

// ★ 第一个导入：必须在所有模块之前加载环境变量
//    ESM 按依赖顺序求值，env.mjs 无其他业务依赖，最先执行
import './env.mjs';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadConfig } from './config.js';
import { initRegistry } from './agents/registry.js';
import { internalRouter } from './api/internal.js';
import { externalRouter } from './api/external.js';
import { adminRouter } from './api/admin.js';
import { workbenchRouter } from './api/workbench.js';
import { xujieRouter } from './api/xujie-skills.js';
import { authRouter } from './api/auth.js';
import { wechatRouter } from './api/wechat.js';
import * as wechatChannel from './channels/wechat-ilink.js';
import { jwtAuth as authMiddleware } from './middleware/auth.js';
import { limiter } from './middleware/rate-limit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.COORDINATOR_PORT || 3100;

// 全局中间件
app.use(cors());
app.use(express.json());

// === API 路由（优先级高于静态文件）===

// 认证路由（公开 — QR 码登录）
app.use('/auth', authRouter);

// 内部 A2A (仅 localhost)
app.use('/internal', (req, res, next) => {
  const remote = req.ip || req.socket.remoteAddress;
  if (remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1') {
    return next();
  }
  res.status(403).json({ error: 'Internal API accessible only from localhost' });
}, internalRouter);

// Admin API (JWT 认证)
app.use('/admin', authMiddleware, adminRouter);
app.use('/admin', authMiddleware, workbenchRouter);
app.use('/admin', authMiddleware, wechatRouter);
app.use('/admin/xujie', authMiddleware, xujieRouter);

// 对外 A2A —— 默认关闭（2026-08-12 起 Coordinator 不再对外暴露 A2A）
// 由独立 Agent「宣传大使」承接对外 A2A（见 REGISTER.md）
const a2aExternalEnabled = process.env.A2A_EXTERNAL_ENABLED === 'true';
if (a2aExternalEnabled) {
  app.use('/a2a', limiter, externalRouter);
}

// 健康检查（公开）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Admin UI 静态文件 — 生产：Nginx 负责；开发/CNB：Express 直接 serve
const adminDist = path.join(__dirname, '..', 'admin-ui', 'dist');
app.use('/workbench', express.static(adminDist));
// SPA 回退：所有 /workbench/* 子路由返回 index.html
app.get('/workbench/*', (req, res) => {
  res.sendFile(path.join(adminDist, 'index.html'));
});

// 启动
async function main() {
  try {
    await loadConfig();
    await initRegistry();
    // 微信 iLink 通道初始化（有凭据自动启动消息循环；未绑定则等待扫码）
    const wxStatus = wechatChannel.init();
    app.listen(PORT, () => {
      console.log(`[Coordinator] 启动成功 → http://localhost:${PORT}`);
      console.log(`[Coordinator] 认证路由:   /auth`);
      console.log(`[Coordinator] 内部 A2A:   /internal`);
      console.log(`[Coordinator] Admin API:  /admin`);
      console.log(`[Coordinator] 对外 A2A:   ${a2aExternalEnabled ? '/a2a (已启用)' : '已禁用 (仅对内)'}`);
      console.log(`[Coordinator] Admin UI:   /workbench`);
      console.log(`[Coordinator] 微信通道:   ${wxStatus.bound ? (wxStatus.running ? '在线' : '已绑定·未运行') : '未绑定'}`);
    });
  } catch (err) {
    console.error('[Coordinator] 启动失败:', err.message);
    process.exit(1);
  }
}

main();
