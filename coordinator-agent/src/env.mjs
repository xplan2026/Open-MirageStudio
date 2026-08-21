/**
 * 环境变量预加载模块
 *
 * 必须在所有其他模块之前导入！
 * ESM 会按依赖顺序求值静态导入，此模块作为第一个导入项，
 * 确保 process.env 在其他模块求值之前就已填充。
 *
 * 环境变量统一管理在项目根目录 /workspace/.env 中。
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载项目根目录 .env（唯一信任源）
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: rootEnvPath });
