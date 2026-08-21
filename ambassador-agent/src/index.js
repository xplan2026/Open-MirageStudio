#!/usr/bin/env node

/**
 * 宣传大使 (Ambassador Agent) — Mirage-Studio 对外 A2A 服务
 *
 * 职责: 面向外网（自媒体平台 + AI 社区）宣传本项目。
 * 协议: Google A2A 兼容（JSON-RPC 2.0 over HTTP）
 * 端口: 3200 (默认)，可由 AMBASSADOR_PORT 覆盖
 *
 * 端点:
 *   GET  /.well-known/agent.json    — A2A Agent Card (发现机制)
 *   POST /a2a                       — A2A JSON-RPC 入口 (message/send, agent/list, agent/skills)
 *
 * 宣传知识库: ../OUTREACH.md（内容由舰队长讨论定义，本服务启动时加载）
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.AMBASSADOR_PORT || 3200;
const OUTREACH_PATH = path.join(__dirname, '..', 'OUTREACH.md');

const app = express();
app.use(cors());
app.use(express.json());

// ---- 宣传知识库加载 ----
function loadOutreach() {
  try {
    const raw = fs.readFileSync(OUTREACH_PATH, 'utf8');
    const body = raw.replace(/^---[\s\S]*?---/, '').trim(); // 去掉 frontmatter
    if (body) return body;
  } catch {
    /* OUTREACH.md 不存在 → 使用默认介绍 */
  }
  return null;
}

const outreach = loadOutreach();

const AGENT_CARD = {
  name: 'Mirage-Studio 宣传大使',
  description: '面向外网的 AI Agent，负责宣传 Mirage-Studio 独立自媒体 IP 工作室及其长篇连载小说《幻觉》与跨媒介作品（歌曲、MV、族谱）。',
  url: 'https://a-o-c.cc.cd:5656/ambassador/a2a/',
  version: '0.1.0',
  capabilities: {
    streaming: false,
    pushNotifications: false,
  },
  skills: [
    {
      id: 'intro',
      name: '项目介绍',
      description: '介绍 Mirage-Studio 工作室定位、IP 作品与文化。',
      tags: ['intro', 'mirage-studio', '幻觉'],
    },
    {
      id: 'promotion',
      name: '对外宣传',
      description: '面向自媒体平台与 AI 社区的项目宣传（内容见 OUTREACH.md）。',
      tags: ['promotion', 'social', 'ai-community'],
    },
  ],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
};

// ---- 回复生成 ----
function buildReply(userText) {
  const base = outreach
    ? `【宣传知识库】\n${outreach.slice(0, 2000)}`
    : '【默认介绍】Mirage-Studio 是一个以长篇连载小说《幻觉》为基石的独立自媒体 IP 工作室，通过多个 AI Agent 协作持续生产跨媒介内容（小说、音乐、MV、族谱）。更多宣传资料正在完善中，请联系工作室获取详情。';

  return {
    role: 'agent',
    parts: [
      {
        text: `你好，我是 Mirage-Studio 的宣传大使（Ambassador Agent）。\n\n${base}\n\n（你的消息：${userText || '(空)'}）`,
      },
    ],
    metadata: {
      source: 'ambassador-agent',
      outreachReady: Boolean(outreach),
    },
  };
}

// ---- 路由 ----

// A2A Agent Card（发现机制）
app.get('/.well-known/agent.json', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.json(AGENT_CARD);
});

// A2A JSON-RPC 入口
app.post('/a2a', async (req, res) => {
  const batch = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];

  for (const rpc of batch) {
    const { id, method, params = {} } = rpc || {};

    try {
      switch (method) {
        case 'agent/list':
          results.push({ id, result: { agents: [AGENT_CARD] } });
          break;

        case 'agent/skills':
          results.push({ id, result: { skills: AGENT_CARD.skills } });
          break;

        case 'message/send':
          results.push({
            id,
            result: {
              messageId: `amb-${Date.now()}`,
              conversationId: params.message?.conversationId || null,
              role: 'agent',
              parts: buildReply(params.message?.parts?.map((p) => p.text).filter(Boolean).join(' ') || '').parts,
              contextId: `amb-ctx-${Date.now()}`,
            },
          });
          break;

        default:
          results.push({
            id,
            error: { code: -32601, message: `方法不受支持: ${method}` },
          });
      }
    } catch (err) {
      results.push({
        id,
        error: { code: -32603, message: `内部错误: ${err.message}` },
      });
    }
  }

  res.json(Array.isArray(req.body) ? results : results[0]);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'ambassador', outreachReady: Boolean(outreach) });
});

app.listen(PORT, () => {
  console.log(`[Ambassador] 启动成功 → http://0.0.0.0:${PORT}`);
  console.log(`[Ambassador] Agent Card:  /.well-known/agent.json`);
  console.log(`[Ambassador] A2A 入口:    /a2a`);
  console.log(`[Ambassador] 宣传知识库:  ${outreach ? 'OUTREACH.md 已加载' : '未加载（使用默认介绍，待完善 OUTREACH.md）'}`);
});
