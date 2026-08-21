# Erhu Agent 全流程测试报告

**测试日期**: 2026-07-17 09:50
**测试作品**: 此身长在画图间

## 测试流程

| 阶段 | 脚本 | 结果 | 说明 |
|------|------|------|------|
| 扫描 | `scan.js` | ✅ 通过 | 检测到 1 个计划 |
| 作曲 | `compose.js` | ⏭️ 跳过 | 已有 mp3 产物，跳过 |
| 生图 | `visualize.js` | ✅ 通过 | 30/30 张，API 不可用→回退占位图 |
| 渲染 | `render.js` | ✅ 通过 | 生成 4.4MB MP4 视频 |

## 产物

- **MV**: `/workspace/data/Erhu-data/此身长在画图间/此身长在画图间.mp4` (4.4MB, 147.6s)
- **图片**: 30 张占位图 (`images/` 目录)
- **音频**: 此身长在画图间-85.mp3 (2.3MB)

## 发现的问题

1. **百度文心一格 API 不可用**: `BAIDU_AK`/`BAIDU_SK` 返回 `invalid_client` 错误。可能是凭证过期或格式不对。
   - **已修复**: 添加了 FFmpeg 占位图回退机制，确保流程不中断。
   
2. **字体问题**: 原 `render.js` 使用 DejaVu Sans 不支持中文 → 已改为 Noto Sans CJK。

3. **generate-image.js 的 .env 路径**: 从 `erhu-agent/scripts/` 调用时找不到 `/workspace/.env` → 已修复加载路径。

4. **generate-image.js 的 baidu provider**: 原实现调用千帆 Qwen-Image API（需 QIANFAN_API_KEY），而非百度文心一格 → 已改为真正的文心一格 ERNIE-ViLG API。

## 环境依赖

| 依赖 | 状态 |
|------|------|
| Node.js | ✅ 可用 |
| FFmpeg 7.1.5 | ✅ 可用 |
| DeepSeek API | ✅ 可用（生成图片 prompt） |
| 百度文心一格 | ❌ AK/SK 无效 |
| 智谱 CogView | ❌ 未配置 |

## 建议

- 更新 `.env` 中的 `BAIDU_AK`/`BAIDU_SK` 为有效凭证
- 或配置 `ZHIPU_API_KEY` 使用智谱 CogView 作为主力图片生成器
