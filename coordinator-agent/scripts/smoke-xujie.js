#!/usr/bin/env node
/**
 * Phase 2 冒烟测试 — Xujie Skill API
 * 直接挂载 xujieRouter 到临时 app，签发临时 JWT 后逐项验证。
 * 运行：node scripts/smoke-xujie.js
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import { xujieRouter } from '../src/api/xujie-skills.js';
import { getJwtSecret } from '../src/auth/jwtSecret.js';

const token = jwt.sign({ sub: 'smoke-test', role: 'admin' }, getJwtSecret(), { expiresIn: '1h' });

const app = express();
app.use(express.json());
app.use('/admin/xujie', (req, _res, next) => {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    try { jwt.verify(h.substring(7), getJwtSecret()); return next(); } catch {}
  }
  return _res.status(401).json({ error: '未授权' });
}, xujieRouter);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/admin/xujie`;
  const H = { Authorization: `Bearer ${token}` };
  let pass = 0, fail = 0;

  async function t(name, method, path, body, expectStatus = 200) {
    try {
      const res = await fetch(base + path, {
        method,
        headers: { ...H, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      const ok = res.status === expectStatus;
      ok ? pass++ : fail++;
      console.log(`${ok ? '✓' : '✗'} ${name} → ${res.status}${ok ? '' : ' ' + JSON.stringify(data).slice(0, 200)}`);
      return data;
    } catch (err) {
      fail++;
      console.log(`✗ ${name} → 请求失败 ${err.message}`);
      return null;
    }
  }

  await t('Skill 元数据', 'GET', '/skills');
  const chs = await t('章节树', 'GET', '/chapters');
  if (chs?.chapters?.length) {
    const first = chs.chapters[0];
    await t('章节正文', 'GET', `/chapters/${encodeURIComponent(first.file)}`);
    await t('提交修改意见', 'POST', '/feedback', { chapter: first.file, content: '开篇钩子不足，建议增加悬念', dimension: 'reader' });
  }
  const fb = await t('修改意见列表', 'GET', '/feedback');
  if (fb?.items?.length) {
    await t('意见状态流转', 'POST', `/feedback/${fb.items[0].id}/status`, { status: 'executed' });
  }
  await t('角色列表', 'GET', '/characters');
  const chars = await t('角色详情(米丰)', 'GET', '/characters/%E7%B1%B3%E4%B8%B0');
  if (chars?.timeline) await t('角色主时间线', 'GET', '/characters/%E7%B1%B3%E4%B8%B0/timeline');
  await t('大纲', 'GET', '/outline');
  await t('思想笔记列表', 'GET', '/notes');
  await t('蝴蝶效应影响分析(米丰)', 'GET', '/impact?q=%E7%B1%B3%E4%B8%B0');
  await t('benchmarks', 'GET', '/benchmarks');
  await t('世界观', 'GET', '/worldbuilding');
  await t('tracking 列表', 'GET', '/tracking');
  await t('质检报告占位', 'GET', '/quality');
  await t('越界路径拦截', 'GET', '/characters/..%2F..%2Fsecret', undefined, 400);

  // 写测试：创建临时角色再删除
  const tmpName = `tmp-角色-${Date.now()}`;
  await t('创建角色', 'POST', '/characters', { name: tmpName, title: '临时角色', content: '## 基本信息\n- **身份**: 测试' });
  await t('读取临时角色', 'GET', `/characters/${encodeURIComponent(tmpName)}`);
  await t('创建思想笔记', 'POST', '/notes', { name: tmpName, title: '临时笔记', content: '测试笔记内容', tags: ['测试', 'smoke'] });
  await t('删除思想笔记', 'DELETE', `/notes/${encodeURIComponent(tmpName)}`);
  const fsk = new URLSearchParams({ path: `${tmpName}.md` });
  const delChar = await fetch(base + `/characters/${encodeURIComponent(tmpName)}`, { method: 'GET', headers: H });
  if (delChar.status === 200) {
    const { name } = await delChar.json();
    const del = await fetch(base + `/characters/${encodeURIComponent(name)}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, title: '清理', content: '' }) });
    // 清理：直接删除文件（测试专用，通过 raw 写入实现不便，这里仅记录）
    console.log(`  (临时角色 ${name} 由后续清理)`, del.status);
  }

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  server.close();
  process.exit(fail ? 1 : 0);
});
