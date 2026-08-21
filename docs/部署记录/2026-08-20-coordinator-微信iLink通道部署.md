---
Updated: 2026-08-20 21:50
生命周期: 永久保存
保存位置: docs/部署记录/2026-08-20-coordinator-微信iLink通道部署.md
---

# 2026-08-20 · Coordinator 微信 iLink-bot 通道部署

## 背景

为 Coordinator（大副）接入微信 iLink-bot（微信官方 ClawBot，2026-03 推出），支持管理员通过微信远程对话触发 Agent 任务。仅允许管理员本人一个微信账号认证（单账号白名单），已绑定后禁止再次扫码，非管理员消息直接忽略。

## 变更文件

| 文件 | 变更 |
|------|------|
| `src/channels/wechat-ilink.js` | ★ 新建。微信通道：扫码登录、状态轮询、白名单过滤、getUpdates 长轮询、sendMessage 回复、凭据持久化 |
| `src/api/wechat.js` | ★ 新建。`GET /admin/wechat/status`、`POST /admin/wechat/qrcode`（已绑定返回 403） |
| `src/index.js` | 挂载 `/admin` 微信路由 + 启动时 `wechatChannel.init()` + 启动日志打印通道状态 |
| `admin-ui/src/pages/WeChat.jsx` | ★ 新建。「微信对话」页面：状态卡片 + 二维码渲染（react-qr-code）+ 轮询 |
| `admin-ui/src/components/layout/Sidebar.jsx` | 「AI 对话」下方新增「微信对话」导航 |
| `admin-ui/src/App.jsx` | 注册 `/wechat` 路由 |
| `admin-ui/src/api.js` | 新增 `wechat.getStatus/getQrcode` |
| `admin-ui/package.json` | 新增依赖 `react-qr-code` |
| `.gitignore` | 新增 `coordinator-agent/data/`（凭据持久化目录，不入库） |
| `.env.example` | 新增 `WECHAT_ADMIN_ID` 注释段 |
| `AGENTS.md` | 补充微信 iLink 通道协议与白名单说明 |

## 协议要点（iLink，官方文档 + openclaw-weixin 逆向交叉确认）

- 扫码登录：`GET {base}/ilink/bot/get_bot_qrcode?bot_type=3`（**GET**，非 POST）→ 返回 `qrcode`（轮询 token）+ `qrcode_img_content`（授权链接，前端渲染二维码）
- 状态轮询：`GET {base}/ilink/bot/get_qrcode_status?qrcode=xxx`（**GET**）→ `status: wait|scaned|confirmed|expired`
- 确认绑定：`confirmed` 响应**顶层**字段 `bot_token` / `ilink_bot_id` / `ilink_user_id` / `baseurl`（非 `data.credentials` 包装）
- 收消息：`POST {base}/ilink/bot/getupdates`，body 含 `get_updates_buf` + `base_info: {channel_version: "1.0.2"}`
- 发消息：`POST {base}/ilink/bot/sendmessage`，body 含 `client_id`（去重）+ `base_info` + `msg`
- 消息枚举为**数字**：`message_type` 1=用户 / 2=BOT；`item_list[].type` 1=文本；`message_state` 2=FINISH
- 认证头：`AuthorizationType: ilink_bot_token` + `X-WECHAT-UIN`（随机）+ `Authorization: Bearer bot_token`

> **踩坑记录**：初版误按直觉实现为 `POST {base}/API/V1/WECHAT/QRCODE`（返回 404）。经抓取微信官方 ClawBot 文档与 `openclaw-weixin` / `XTmai/WeChat-iLinkBot` 源码交叉确认后修正为 `/ilink/bot/*` 路径族。

## 单账号白名单

- 管理员微信 ID 存于项目根 `.env` 的 `WECHAT_ADMIN_ID`
- 首次扫码确认登录时自动将 `ilink_user_id` 写入 `.env`，凭据持久化至 `coordinator-agent/data/`（含 `bot_token`，已 gitignore，避免重启重复扫码）
- 已绑定后 `POST /admin/wechat/qrcode` 返回 **403 禁止再次扫码**；换绑需手动清 `.env` 的 `WECHAT_ADMIN_ID` 后重启
- 非管理员微信消息在消息循环入口白名单过滤，**直接忽略**

## 部署步骤（已执行）

```bash
# 1. 本地构建 admin-ui
cd coordinator-agent/admin-ui && npm install react-qr-code && npm run build
tar -czf /tmp/admin-ui-dist.tar.gz dist
# 2. 上传
scp src/channels/wechat-ilink.js ubuntu@<host>:/tmp/
scp /tmp/admin-ui-dist.tar.gz ubuntu@<host>:/tmp/
# 3. 服务器替换 + 解压 + 重启（进程属 ubuntu 用户，勿加 sudo 重启）
sudo cp /tmp/wechat-ilink.js /opt/mirage-studio/coordinator-agent/src/channels/wechat-ilink.js
sudo tar -xzf /tmp/admin-ui-dist.tar.gz -C /opt/mirage-studio/coordinator-agent/admin-ui/
pm2 restart coordinator --update-env
```

## 验证结果（实测通过）

- 启动日志：`[WeChat] 未绑定管理员微信，等待扫码（admin-ui → 微信对话）` + `微信通道: 未绑定`
- `POST /admin/wechat/qrcode`（JWT 认证）→ **200**：`{"ok":true,"qrcodeContent":"https://liteapp.weixin.qq.com/q/...?...&bot_type=3","qrcodeStatus":"wait"}`
- `GET /admin/wechat/status` → `{"bound":false,"running":false,"qrcodeStatus":"wait","lastError":null}`（状态轮询链路正常，无报错）

## 真实扫码验证（✅ 已完成，2026-08-20 21:40）

- admin-ui 「微信对话」页扫码 → 绑定成功：`botId=63162b31d843@im.bot`
- `.env` 自动写入 `WECHAT_ADMIN_ID`（单账号白名单生效）
- 凭据持久化：`coordinator-agent/data/wechat-credentials.json`（含 bot_token，gitignore）
- 消息链路实测：微信发送 `test` → 日志 `[WeChat] 收到消息: test` → 正常回复，可对话 ✅

## 遗留

- 已绑定状态下凭据含 `bot_token` 仅存服务器 `data/`，本地不保留
- 换绑流程：手动清 `.env` 的 `WECHAT_ADMIN_ID` + 删除 `data/wechat-credentials.json` 后重启
