/**
 * Agent Card 定义 — A2A 协议 Agent 元数据
 *
 * 每个接入 Coordinator 的 Agent 必须定义 Agent Card，
 * 包含 ID、能力列表、输入/输出 Schema。
 */

/**
 * @typedef {Object} AgentCard
 * @property {string} agentId - 唯一标识
 * @property {string} name - 显示名称
 * @property {string} description - 功能描述
 * @property {string[]} capabilities - 能力列表
 * @property {string} cliEntry - CLI 入口路径（相对于 workspace 根目录）
 * @property {Object} inputSchema - 输入 JSON Schema
 * @property {Object} outputSchema - 输出 JSON Schema
 * @property {'online'|'offline'|'design'} status - 状态
 */

/** @type {AgentCard[]} */
export const AGENT_CARDS = [
  {
    agentId: 'lemong',
    name: 'Lemong Agent',
    description: 'AI 音乐创作 Agent，使用 ACE Step1.5 API 生成歌曲',
    capabilities: ['music_generation'],
    cliEntry: 'lemong-agent/lemong-agent',
    inputSchema: {
      type: 'object',
      required: ['lyrics', 'style'],
      properties: {
        lyrics: { type: 'string', description: '歌词' },
        style: { type: 'string', description: '音乐风格描述' },
        title: { type: 'string', description: '歌曲标题' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        songPath: { type: 'string', description: '歌曲文件路径' },
        metadata: { type: 'object' },
      },
    },
    status: 'online',
  },
  {
    agentId: 'erhu',
    name: 'Erhu Agent (二虎)',
    description: 'AI 数字人歌手 MV 制作 Agent',
    capabilities: ['mv_production'],
    cliEntry: 'erhu-agent/erhu-agent',
    inputSchema: {
      type: 'object',
      required: ['songPath'],
      properties: {
        songPath: { type: 'string', description: '歌曲路径（来自 Lemong）' },
        plan: { type: 'string', description: 'MV 制作计划' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        mvPath: { type: 'string', description: 'MV 文件路径' },
        imagesDir: { type: 'string' },
      },
    },
    status: 'online',
  },
  {
    agentId: 'zhupu',
    name: 'Zhupu Manager Agent (族谱管家)',
    description: '数字化家族成员管理、族谱树构建与查询',
    capabilities: ['family_tree_management'],
    cliEntry: 'zhupu-manager-agent/zhupu-manager-agent',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['query', 'add', 'update', 'export', 'visualize'] },
        family: { type: 'string', description: '家族名称' },
        params: { type: 'object' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        result: { type: 'object' },
      },
    },
    status: 'online',
  },
  {
    agentId: 'xujie',
    name: 'Xujie Writer Agent',
    description: 'AI 辅助长篇小说写作 Agent，负责《幻觉》章节创作与素材管理',
    capabilities: ['novel_writing', 'outline_management', 'character_management'],
    cliEntry: 'xujie-writer-agent/',
    inputSchema: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['write_chapter', 'update_outline', 'update_character'] },
        chapter: { type: 'string', description: '章节标题/编号' },
        content: { type: 'string', description: '章节内容或修改意见' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        chapterPath: { type: 'string', description: '章节文件路径' },
        wordCount: { type: 'number' },
      },
    },
    status: 'online',
  },
];

/**
 * 获取 Agent Card
 * @param {string} agentId
 * @returns {AgentCard|undefined}
 */
export function getAgentCard(agentId) {
  return AGENT_CARDS.find(a => a.agentId === agentId);
}
