// 生产：Nginx proxy_pass /admin/* → localhost:3100
// 开发：Vite proxy 自动转发 /admin → localhost:3100
const API_BASE = '/admin';

function getAuthHeaders() {
  const jwt = localStorage.getItem('coordinator_jwt');
  const headers = { 'Content-Type': 'application/json' };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  return headers;
}

function getJwt() {
  return localStorage.getItem('coordinator_jwt') || '';
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });

  if (res.status === 401) {
    localStorage.removeItem('coordinator_jwt');
    window.location.href = '/workbench/login';
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

/** 生成带 token 的媒体 URL（供 <audio>/<video>/<img> 使用） */
export function mediaUrl(relPath) {
  return `${API_BASE}/data/raw?path=${encodeURIComponent(relPath)}&token=${encodeURIComponent(getJwt())}`;
}

export const api = {
  // ---- Dashboard / Agent / 任务 ----
  getDashboard: () => request('/dashboard'),
  getAgents: () => request('/agents'),
  getAgent: (id) => request(`/agents/${id}`),
  getTasks: (status) => request(`/tasks${status ? `?status=${status}` : ''}`),
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  executeTask: (id) => request(`/tasks/${id}/execute`, { method: 'POST' }),
  cancelTask: (id) => request(`/tasks/${id}/cancel`, { method: 'POST' }),
  retryTask: (id) => request(`/tasks/${id}/retry`, { method: 'POST' }),

  // ---- Data 产物浏览器 ----
  getDataTree: (root = '', depth = 6) =>
    request(`/data/tree?root=${encodeURIComponent(root)}&depth=${depth}`),
  getDataFile: (relPath) => request(`/data/file?path=${encodeURIComponent(relPath)}`),
  saveDataFile: (relPath, content) =>
    request(`/data/file?path=${encodeURIComponent(relPath)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  searchData: (q) => request(`/data/search?q=${encodeURIComponent(q)}`),
  getDataStats: () => request('/data/stats'),

  // ---- 聊天 ----
  chat: (message) => request('/chat', { method: 'POST', body: JSON.stringify({ message }) }),

  // ---- 微信通道（iLink-bot）----
  wechat: {
    getStatus: () => request('/wechat/status'),
    getQrcode: () => request('/wechat/qrcode', { method: 'POST' }),
  },

  // ---- Xujie Skill API ----
  xujie: {
    getSkills: () => request('/xujie/skills'),
    // 角色档案
    getCharacters: () => request('/xujie/characters'),
    getCharacter: (name) => request(`/xujie/characters/${encodeURIComponent(name)}`),
    saveCharacter: (name, title, content) =>
      request('/xujie/characters', { method: 'POST', body: JSON.stringify({ name, title, content }) }),
    getCharacterTimeline: (name) => request(`/xujie/characters/${encodeURIComponent(name)}/timeline`),
    // 大纲
    getOutline: () => request('/xujie/outline'),
    saveOutline: (outline, plan) =>
      request('/xujie/outline', { method: 'POST', body: JSON.stringify({ outline, plan }) }),
    // 章节与进度
    getChapters: () => request('/xujie/chapters'),
    getChapter: (file) => request(`/xujie/chapters/${encodeURIComponent(file)}`),
    // 思想笔记
    getNotes: () => request('/xujie/notes'),
    saveNote: (name, title, content, tags) =>
      request('/xujie/notes', { method: 'POST', body: JSON.stringify({ name, title, content, tags }) }),
    deleteNote: (name) => request(`/xujie/notes/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    // 素材
    getBenchmarks: () => request('/xujie/benchmarks'),
    getWorldbuilding: () => request('/xujie/worldbuilding'),
    getTracking: () => request('/xujie/tracking'),
    // 章节修改联动
    getFeedback: (chapter) => request(`/xujie/feedback${chapter ? `?chapter=${encodeURIComponent(chapter)}` : ''}`),
    addFeedback: (chapter, content, dimension) =>
      request('/xujie/feedback', { method: 'POST', body: JSON.stringify({ chapter, content, dimension }) }),
    setFeedbackStatus: (id, status) =>
      request(`/xujie/feedback/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    getImpact: (q) => request(`/xujie/impact?q=${encodeURIComponent(q)}`),
    getQuality: () => request('/xujie/quality'),
  },

  // ---- 工具 ----
  mediaUrl,
};

export default api;
