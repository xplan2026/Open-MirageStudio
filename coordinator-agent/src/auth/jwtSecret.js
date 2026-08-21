/**
 * JWT 密钥管理
 *
 * 首次启动自动生成 32 字节随机密钥，持久化到 .jwt_secret 文件。
 * 删除 .jwt_secret 后重启即可使所有 JWT 失效。
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECRET_FILE = path.join(__dirname, '..', '..', '.jwt_secret');

export function getJwtSecret() {
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  console.log('[Auth] 已生成 JWT 密钥 → .jwt_secret (600)');
  return secret;
}
