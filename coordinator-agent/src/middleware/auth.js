/**
 * 认证中间件 — JWT Token 认证
 *
 * 保护 Admin API。
 * Token 通过 Authorization: Bearer <jwt> 头传递。
 * JWT 由 QR 码扫码登录签发，有效期 24 小时。
 */

import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../auth/jwtSecret.js';

export function jwtAuth(req, res, next) {
  let token = null;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.substring(7);
  } else if (req.method === 'GET' && req.query.token) {
    // 供 <audio>/<video>/<img> 等无法携带 Authorization 头的媒体标签使用
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: '未授权，请先扫码登录' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token 已过期或无效，请重新扫码登录' });
  }
}

// 向后兼容：保留旧的导出名，但不推荐使用
export const authMiddleware = jwtAuth;
