/**
 * 微信 iLink 通道模块（微信官方 ClawBot 协议）
 *
 * 功能：
 *  - 扫码登录（get_bot_qrcode + 状态轮询）
 *  - 凭据持久化（data/wechat-credentials.json），重启免二次扫码
 *  - 单账号白名单（.env 的 WECHAT_ADMIN_ID，首次扫码后自动写入）
 *  - getUpdates 长轮询收消息 + sendMessage 回复
 *
 * 协议来源：微信官方 ClawBot 文档 + openclaw-weixin 客户端实现（iLink 协议，2026-03）
 *  - 登录：GET  {base}/ilink/bot/get_bot_qrcode?bot_type=3
 *          GET  {base}/ilink/bot/get_qrcode_status?qrcode=xxx
 *  - 消息：POST {base}/ilink/bot/getupdates     body { get_updates_buf, base_info }
 *          POST {base}/ilink/bot/sendmessage    body { msg }
 *  认证头：AuthorizationType: ilink_bot_token + X-WECHAT-UIN（随机）+ Bearer bot_token
 *
 * 安全约束：
 *  - 已绑定（.env 存在 WECHAT_ADMIN_ID）→ 禁止再次扫码，防止他人顶号
 *  - 非管理员微信账号发消息 → 直接忽略，不回复不记录
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parseIntent } from '../intent/parser.js';
import { generateChatReply } from '../intent/reply.js';
import { handleRequest, executeTask } from '../coordinator.js';
import { getAgentCard } from '../agents/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- 常量 ----------
const DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com';
const BOT_TYPE = 3; // iLink 官方硬编码：ClawBot 类型
const CHANNEL_VERSION = '1.0.2'; // getupdates/sendmessage 的 base_info.channel_version
const QRCODE_POLL_MS = 2000; // 扫码状态轮询间隔
const LOOP_RETRY_MS = 500; // getUpdates 长轮询返回后下次调用的间隔
const ENV_PATH = path.resolve(__dirname, '..', '..', '.env');
const CREDENTIALS_PATH = path.resolve(__dirname, '..', '..', 'data', 'wechat-credentials.json');

// ---------- 单例状态 ----------
const state = {
  bound: false, // .env 已配置 WECHAT_ADMIN_ID
  running: false, // 消息循环运行中
  botId: null,
  botToken: null,
  baseUrl: DEFAULT_BASE_URL,
  qrcode: null, // 当前二维码 token
  qrcodeContent: null, // 扫码内容（授权链接，前端渲染二维码）
  qrcodeStatus: null, // wait | scaned | confirmed | expired
  qrcodeTimer: null,
  loopTimer: null,
  updatesBuf: '', // getUpdates 游标
  lastError: null,
};

let credentials = null; // { botToken, botId, userId, baseUrl, updatesBuf }

// ---------- 内部工具 ----------
async function apiPost(url, body, headers = {}) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

async function apiGet(url, headers = {}) {
  const resp = await fetch(url, { method: 'GET', headers });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

/** 消息接口专用请求头（ilink_bot_token 认证 + 随机 UIN） */
function botHeaders() {
  const uin = Buffer.from(String((Math.random() * 0xffffffff) >>> 0)).toString('base64');
  return {
    AuthorizationType: 'ilink_bot_token',
    'X-WECHAT-UIN': uin,
    Authorization: `Bearer ${state.botToken}`,
  };
}

/** 从 .env 读取管理员微信 ID（单账号白名单） */
function getAdminId() {
  return process.env.WECHAT_ADMIN_ID || null;
}

/** 写入 .env（新增或替换 key），并同步 process.env */
function setEnv(key, value) {
  const raw = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  const next = re.test(raw) ? raw.replace(re, line) : raw.trimEnd() + '\n' + line + '\n';
  fs.writeFileSync(ENV_PATH, next, { mode: 0o600 });
  process.env[key] = value;
  console.log(`[WeChat] .env 已写入 ${key}`);
}

// ---------- 凭据持久化 ----------
function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    if (data.botToken && data.botId) return data;
  } catch (err) {
    console.warn('[WeChat] 凭据文件解析失败，忽略:', err.message);
  }
  return null;
}

function saveCredentials() {
  fs.mkdirSync(path.dirname(CREDENTIALS_PATH), { recursive: true });
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), { mode: 0o600 });
  state.updatesBuf = credentials.updatesBuf || '';
}

// ---------- 扫码登录 ----------
/** 生成登录二维码（仅未绑定状态可用） */
export async function startQrcode() {
  if (getAdminId()) {
    throw new Error('已绑定管理员微信，禁止再次扫码');
  }
  if (state.qrcode && state.qrcodeStatus !== 'expired') {
    return { qrcodeContent: state.qrcodeContent, qrcodeStatus: state.qrcodeStatus };
  }
  // iLink 官方接口：GET /ilink/bot/get_bot_qrcode?bot_type=3
  const data = await apiGet(`${state.baseUrl}/ilink/bot/get_bot_qrcode?bot_type=${BOT_TYPE}`);
  const d = data.data || data;
  if (!d.qrcode) {
    throw new Error('获取二维码失败: ' + JSON.stringify(data).slice(0, 200));
  }
  state.qrcode = d.qrcode; // 轮询 token（同时可作为扫码内容兜底）
  // 扫码内容优先取 qrcode_img_content（授权链接），否则用 qrcode 本身
  state.qrcodeContent = d.qrcode_img_content || d.qrcode;
  state.qrcodeStatus = 'wait';
  state.lastError = null;
  state.qrcodeTimer = setInterval(pollQrcode, QRCODE_POLL_MS);
  return { qrcodeContent: state.qrcodeContent, qrcodeStatus: state.qrcodeStatus };
}

/** 轮询扫码登录状态；confirmed 后自动完成绑定 */
export async function pollQrcode() {
  if (!state.qrcode) return getStatus();
  try {
    // iLink 官方接口：GET /ilink/bot/get_qrcode_status?qrcode=xxx
    const data = await apiGet(
      `${state.baseUrl}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(state.qrcode)}`,
    );
    const d = data.data || data;
    const status = d.status || 'wait';
    state.qrcodeStatus = status;
    if (status === 'confirmed') {
      await onConfirmed(d);
    } else if (status === 'expired') {
      clearQrcode();
      state.lastError = '二维码已过期，请重新获取';
    }
  } catch (err) {
    state.lastError = `扫码状态查询失败: ${err.message}`;
  }
  return getStatus();
}

async function onConfirmed(d) {
  // iLink confirmed 响应字段在顶层：bot_token / ilink_bot_id / ilink_user_id / baseurl
  if (!d.bot_token || !d.ilink_bot_id || !d.ilink_user_id) {
    throw new Error('登录确认响应缺少凭据: ' + JSON.stringify(d).slice(0, 200));
  }
  credentials = {
    botToken: d.bot_token,
    botId: d.ilink_bot_id,
    userId: d.ilink_user_id,
    baseUrl: d.baseurl || DEFAULT_BASE_URL,
    updatesBuf: '',
  };
  // 单账号白名单：首次扫码登录的微信 ID 写入 .env
  setEnv('WECHAT_ADMIN_ID', d.ilink_user_id);
  saveCredentials();

  state.bound = true;
  state.botId = d.ilink_bot_id;
  state.botToken = d.bot_token;
  state.baseUrl = d.baseurl || DEFAULT_BASE_URL;
  state.lastError = null;
  clearQrcode();
  console.log(`[WeChat] 绑定成功，botId=${state.botId}`);
  startMessageLoop();
}

function clearQrcode() {
  if (state.qrcodeTimer) {
    clearInterval(state.qrcodeTimer);
    state.qrcodeTimer = null;
  }
  state.qrcode = null;
  state.qrcodeContent = null;
  state.qrcodeStatus = null;
}

// ---------- 消息循环 ----------
function startMessageLoop() {
  if (state.running) return;
  state.running = true;
  state.loopTimer = setTimeout(loop, 100);
  console.log('[WeChat] 消息循环已启动');
}

async function loop() {
  if (!state.running) return;
  try {
    const data = await apiPost(
      `${state.baseUrl}/ilink/bot/getupdates`,
      { get_updates_buf: state.updatesBuf || '', base_info: { channel_version: CHANNEL_VERSION } },
      botHeaders(),
    );
    if (data.get_updates_buf) {
      state.updatesBuf = data.get_updates_buf;
      credentials = credentials ? { ...credentials, updatesBuf: state.updatesBuf } : credentials;
      saveCredentials();
    }
    const msgs = Array.isArray(data.msgs) ? data.msgs : [];
    for (const msg of msgs) {
      await handleIncoming(msg).catch((err) => {
        console.error('[WeChat] 消息处理失败:', err.message);
      });
    }
  } catch (err) {
    state.lastError = `消息循环错误: ${err.message}`;
    console.error('[WeChat] getUpdates 错误:', err.message);
  }
  state.loopTimer = setTimeout(loop, LOOP_RETRY_MS);
}

/** 处理收到的单条消息（白名单过滤 + 文本提取 + 异步回复） */
async function handleIncoming(m) {
  // iLink 消息枚举：message_type 1=用户消息 / 2=BOT消息；item type 1=文本
  if (!m || m.message_type !== 1) return;
  const from = m.from_user_id;
  // 单账号白名单：非管理员直接忽略
  const adminId = getAdminId();
  if (adminId && from && from !== adminId) {
    console.log(`[WeChat] 忽略非管理员消息 from=${from}`);
    return;
  }
  const items = Array.isArray(m.item_list) ? m.item_list : [];
  const textItem = items.find((i) => i.type === 1 && i.text_item && i.text_item.text);
  if (!textItem) return;
  const text = String(textItem.text_item.text).trim();
  if (!text) return;

  console.log(`[WeChat] 收到消息: ${text.slice(0, 60)}`);
  // 立即回执，避免等待长任务无感知
  sendText(from, `收到：「${text.slice(0, 40)}」正在处理，请稍候…`, m).catch(() => {});
  // 异步执行完整链路，完成后推送结果
  processIncoming(from, text).catch((err) => {
    console.error('[WeChat] 链路失败:', err);
    sendText(from, `处理失败：${err.message}`, m).catch(() => {});
  });
}

/** 完整链路：意图解析 →（Agent 执行 或 自由对话）→ 个性化回复 */
async function processIncoming(from, text) {
  const intent = await parseIntent(text);
  let replyText;
  if (!intent.agentId || intent.confidence < 0.3) {
    // 自由对话
    replyText = await generateChatReply(text, intent);
  } else {
    const card = getAgentCard(intent.agentId);
    if (!card || card.status !== 'online') {
      replyText = `Agent「${card ? card.name : intent.agentId}」当前不可用，请稍后再试。`;
    } else {
      const res = await handleRequest(text);
      if (res.error) {
        replyText = res.message;
      } else {
        const finalTask = await executeTask(res.task.id);
        replyText = await generateChatReply(text, {
          ...intent,
          taskId: finalTask.id,
          agentName: card.name,
          taskStatus: finalTask.status,
        });
      }
    }
  }
  await sendText(from, String(replyText).slice(0, 4000));
}

/** 发送文本消息（复用来源消息的会话上下文） */
export async function sendText(toUserId, content, sourceMsg = null) {
  if (!state.botToken) throw new Error('微信通道未登录');
  const msg = {
    from_user_id: '',
    to_user_id: toUserId,
    client_id: sourceMsg?.client_id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message_type: 2, // BOT
    message_state: 2, // FINISH
    item_list: [{ type: 1, text_item: { text: content } }], // type 1 = 文本
    context_token: sourceMsg?.context_token || '',
  };
  const data = await apiPost(
    `${state.baseUrl}/ilink/bot/sendmessage`,
    { msg, base_info: { channel_version: CHANNEL_VERSION } },
    botHeaders(),
  );
  if (data.ret !== 0 && data.ret !== undefined) {
    throw new Error(`sendmessage ret=${data.ret}`);
  }
  return data;
}

// ---------- 生命周期 ----------
/** 初始化：加载持久化凭据；凭据有效且与白名单一致 → 直接启动消息循环 */
export function init() {
  const adminId = getAdminId();
  if (adminId) state.bound = true;
  credentials = loadCredentials();
  if (credentials) {
    state.updatesBuf = credentials.updatesBuf || '';
    if (adminId && credentials.userId === adminId) {
      state.botId = credentials.botId;
      state.botToken = credentials.botToken;
      state.baseUrl = credentials.baseUrl || DEFAULT_BASE_URL;
      console.log(`[WeChat] 凭据有效（botId=${state.botId}），自动启动消息循环`);
      startMessageLoop();
    } else if (adminId && credentials.userId !== adminId) {
      console.warn('[WeChat] 凭据与 WECHAT_ADMIN_ID 不匹配，清空凭据，等待重新扫码');
      credentials = null;
      fs.rmSync(CREDENTIALS_PATH, { force: true });
    } else {
      console.log('[WeChat] 已有凭据但未配置 WECHAT_ADMIN_ID，等待扫码绑定');
    }
  } else {
    console.log(
      adminId
        ? `[WeChat] 已配置管理员微信（${adminId.slice(0, 4)}…）但无凭据，等待扫码恢复会话`
        : '[WeChat] 未绑定管理员微信，等待扫码（admin-ui → 微信对话）',
    );
  }
  return getStatus();
}

/** 对外状态（脱敏，供 admin-ui 展示） */
export function getStatus() {
  return {
    bound: state.bound,
    running: state.running,
    botId: state.botId,
    qrcodeContent: state.qrcodeContent,
    qrcodeStatus: state.qrcodeStatus,
    lastError: state.lastError,
  };
}

/** 停止消息循环（测试/维护用） */
export function stop() {
  state.running = false;
  if (state.loopTimer) clearTimeout(state.loopTimer);
  if (state.qrcodeTimer) clearInterval(state.qrcodeTimer);
}
