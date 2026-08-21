/**
 * 微信通道管理 API（Admin，JWT 保护）
 *
 *  - GET  /admin/wechat/status  查询通道状态（绑定/运行/二维码）
 *  - POST /admin/wechat/qrcode  生成登录二维码（仅未绑定状态；绑定后 403 禁止再次扫码）
 */
import { Router } from 'express';
import * as wechatChannel from '../channels/wechat-ilink.js';

export const wechatRouter = Router();

// 通道状态
wechatRouter.get('/wechat/status', (req, res) => {
  res.json({ ok: true, ...wechatChannel.getStatus() });
});

// 生成 iLink 登录二维码（单账号白名单：已绑定则禁止再次扫码）
wechatRouter.post('/wechat/qrcode', async (req, res) => {
  try {
    const result = await wechatChannel.startQrcode();
    res.json({ ok: true, ...result });
  } catch (err) {
    if (String(err.message).includes('禁止再次扫码')) {
      return res.status(403).json({ ok: false, error: err.message });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});
