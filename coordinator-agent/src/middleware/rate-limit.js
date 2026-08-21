/**
 * 限流中间件
 * 保护对外 A2A 接口
 */

import rateLimit from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 30, // 每分钟最多 30 次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});
