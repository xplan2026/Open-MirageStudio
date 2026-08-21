/**
 * 认证路由 — QR 码扫码登录 + 二次验证
 *
 * GET  /auth/qrcode   — 生成一次性登录 token 和 QR 码
 * GET  /auth/callback — 手机扫码后的回调（显示密钥输入页面）
 * POST /auth/verify   — 手机端提交 ADMIN_SECRET 进行二次验证
 * GET  /auth/status   — 前端轮询登录状态
 *
 * 安全模型：
 *   QR 码扫码 = 物理接近证明（手机在屏幕前）
 *   ADMIN_SECRET = 身份证明（只有管理员知道）
 *   两者同时满足 → 签发 JWT
 */

import { Router } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../auth/jwtSecret.js';

const router = Router();

// 登录 token 内存存储（服务重启后全部失效）
const tokens = new Map(); // token → { confirmed: boolean, createdAt: timestamp }

const TOKEN_TTL = 60 * 1000;  // 60 秒过期
const JWT_TTL = 24 * 60 * 60; // JWT 有效期 24 小时（秒）

// 定期清理过期 token（每 30 秒）
const CLEANUP_INTERVAL = 30 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokens.entries()) {
    if (now - data.createdAt > TOKEN_TTL) {
      tokens.delete(token);
    }
  }
}, CLEANUP_INTERVAL);

// 获取公网基础 URL（用于 QR 码回调）
function getPublicBaseUrl(req) {
  // 优先使用根目录 .env 中的 COORDINATOR_PUBLIC_URL
  if (process.env.COORDINATOR_PUBLIC_URL) return process.env.COORDINATOR_PUBLIC_URL.replace(/\/+$/, '');
  // 兜底：从请求头推断
  return `${req.protocol}://${req.get('host')}`;
}

// 获取管理员密钥（二次验证用）
function getAdminSecret() {
  return process.env.ADMIN_SECRET || null;
}

// GET /auth/qrcode — 生成一次性登录 token 和 QR 码
router.get('/qrcode', async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    tokens.set(token, { confirmed: false, createdAt: Date.now() });

    const baseUrl = getPublicBaseUrl(req);
    const callbackUrl = `${baseUrl}/auth/callback?token=${token}`;

    const qrcode = await QRCode.toDataURL(callbackUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#0f172a', light: '#f8fafc' },
    });

    const needSecret = !!getAdminSecret();
    const expiresIn = 60;

    res.json({ token, qrcode, expiresIn, needSecret });
  } catch (err) {
    console.error('[Auth] QR 码生成失败:', err.message);
    res.status(500).json({ error: 'QR 码生成失败' });
  }
});

// GET /auth/callback — 手机扫码回调
// 如果配置了 ADMIN_SECRET，显示密钥输入页；否则直接确认
router.get('/callback', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.send(callbackHtml(false, '无效的认证链接'));
  }

  const data = tokens.get(token);

  if (!data) {
    return res.send(callbackHtml(false, '认证链接无效，请重新扫码'));
  }

  if (Date.now() - data.createdAt > TOKEN_TTL) {
    tokens.delete(token);
    return res.send(callbackHtml(false, '二维码已过期，请刷新后重新扫码'));
  }

  if (data.confirmed) {
    return res.send(callbackHtml(false, '该二维码已被使用，请刷新后重新扫码'));
  }

  const needSecret = !!getAdminSecret();

  if (needSecret) {
    return res.send(verifyForm(token));
  }

  // 无需二次验证：直接确认
  data.confirmed = true;
  return res.send(callbackHtml(true, '登录成功，请返回电脑继续操作'));
});

// POST /auth/verify — 手机端提交密钥验证
router.post('/verify', (req, res) => {
  const { token, secret } = req.body;

  if (!token || !secret) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const adminSecret = getAdminSecret();
  if (!adminSecret) {
    return res.status(500).json({ error: '服务器未配置管理密钥' });
  }

  if (secret !== adminSecret) {
    return res.json({ success: false, message: '密钥错误，请重试' });
  }

  const data = tokens.get(token);
  if (!data) {
    return res.json({ success: false, message: '二维码已过期，请刷新后重新扫码' });
  }

  if (Date.now() - data.createdAt > TOKEN_TTL) {
    tokens.delete(token);
    return res.json({ success: false, message: '二维码已过期，请刷新后重新扫码' });
  }

  data.confirmed = true;
  return res.json({ success: true });
});

// GET /auth/status — 前端轮询
router.get('/status', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ status: 'invalid' });
  }

  const data = tokens.get(token);

  if (!data) {
    return res.json({ status: 'expired' });
  }

  if (Date.now() - data.createdAt > TOKEN_TTL) {
    tokens.delete(token);
    return res.json({ status: 'expired' });
  }

  if (data.confirmed) {
    const jwtToken = jwt.sign(
      { sub: 'admin', role: 'operator' },
      getJwtSecret(),
      { expiresIn: JWT_TTL }
    );
    tokens.delete(token);
    return res.json({ status: 'confirmed', jwt: jwtToken });
  }

  return res.json({ status: 'pending' });
});

// ==================== HTML 页面 ====================

// 确认 / 失败结果页
function callbackHtml(success, message) {
  const color = success ? '#22c55e' : '#ef4444';
  const icon = success ? '✓' : '✗';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>MirageStudio · 扫码登录</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}
    .wrapper{max-width:300px}
    .icon{width:64px;height:64px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;color:${color};font-weight:700}
    h1{font-size:20px;margin-bottom:8px}
    p{font-size:14px;color:#94a3b8}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="icon">${icon}</div>
    <h1>${message}</h1>
    <p>MirageStudio Admin Console</p>
  </div>
</body>
</html>`;
}

// 密钥输入页（二次验证）
function verifyForm(token) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>MirageStudio · 身份验证</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{background:#1e293b;border-radius:12px;padding:32px 24px;max-width:340px;width:100%;text-align:center}
    h2{font-size:18px;margin-bottom:4px}
    .sub{font-size:13px;color:#94a3b8;margin-bottom:24px}
    .input-wrap{text-align:left;margin-bottom:20px}
    .input-wrap label{display:block;font-size:13px;color:#94a3b8;margin-bottom:6px}
    .input-wrap input{width:100%;padding:10px 12px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#f8fafc;font-size:15px;outline:none;transition:border-color .2s}
    .input-wrap input:focus{border-color:#3b82f6}
    .btn{width:100%;padding:10px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;background:#3b82f6;color:#fff;transition:opacity .2s}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .msg{margin-top:12px;font-size:13px;min-height:20px}
    .msg.error{color:#ef4444}
    .msg.success{color:#22c55e}
  </style>
</head>
<body>
  <div class="card">
    <h2>身份验证</h2>
    <p class="sub">请输入管理密钥以确认登录</p>
    <div class="input-wrap">
      <label for="secret">管理密钥</label>
      <input type="password" id="secret" placeholder="输入密钥" autocomplete="off" autofocus>
    </div>
    <button class="btn" id="submitBtn">确认登录</button>
    <div class="msg" id="msg"></div>
  </div>
  <script>
    const token = ${JSON.stringify(token)};
    const btn = document.getElementById('submitBtn');
    const input = document.getElementById('secret');
    const msg = document.getElementById('msg');

    async function submit() {
      const secret = input.value.trim();
      if (!secret) { msg.className='msg error'; msg.textContent='请输入密钥'; return; }
      btn.disabled = true;
      btn.textContent = '验证中...';
      msg.className = 'msg';
      msg.textContent = '';
      try {
        const res = await fetch('/auth/verify', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ token, secret })
        });
        // 即使非 2xx 也尝试解析 JSON（Express body-parser 确保响应是 JSON）
        const data = await res.json();
        if (data.success) {
          msg.className = 'msg success';
          msg.textContent = '验证成功，请返回电脑继续操作';
          btn.style.display = 'none';
          input.style.display = 'none';
        } else {
          msg.className = 'msg error';
          msg.textContent = data.message || '验证失败';
          btn.disabled = false;
          btn.textContent = '确认登录';
          input.value = '';
          input.focus();
        }
      } catch (err) {
        msg.className = 'msg error';
        msg.textContent = '网络错误，请重试';
        btn.disabled = false;
        btn.textContent = '确认登录';
      }
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  </script>
</body>
</html>`;
}

export { router as authRouter };
