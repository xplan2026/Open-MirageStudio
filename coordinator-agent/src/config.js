/**
 * 配置加载模块
 */

export async function loadConfig() {
  const aiEngines = [];

  if (process.env.ZHIPU_API_KEY) {
    aiEngines.push('智谱');
    console.log('[Config] AI 引擎: 智谱 GLM-4.7-Flash (主,免费)');
  }
  if (process.env.DEEPSEEK_API_KEY) {
    aiEngines.push('DeepSeek');
    console.log('[Config] AI 引擎: DeepSeek (兜底,计费)');
  }
  if (aiEngines.length === 0) {
    console.warn('[Config] 无 AI 引擎可用，意图解析将使用关键词匹配');
  }

  // 认证已改用 QR 码扫码登录 + JWT，不再需要 Basic Auth 环境变量
  // JWT 密钥由 src/auth/jwtSecret.js 首次启动自动生成

  console.log('[Config] 配置加载完成');
}
