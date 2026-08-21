---
Updated: 2026-07-28
生命周期: 临时
保存位置: docs/standard/微信编排Agent技术方案.md
---

# 微信编排 Agent 技术方案

> 状态：方案探讨 | 日期：2026-07-28

## 一、目标

通过微信机器人（iLink-bot）作为通信入口，在 4 核 4G 服务器上搭建编排服务，驱动本项目中的 3 个 Agent 进行生产，实现**无需打开 WebIDE 即可随时随地生产**。

### 纳入编排的 Agent

| Agent | 编排方式 | 产出物 |
|-------|---------|--------|
| Lemong Agent | CLI 调用 | AI 歌曲 MP3 |
| Erhu Agent | CLI 调用 | AI MV 视频 MP4 |
| Zhupu Manager Agent | CLI 调用 | 族谱 JSON / 家训 / 导出 |

### 不纳入编排的 Agent

| Agent | 原因 |
|-------|------|
| Xujie Writer Agent | 需要深度对话交互、多轮审校迭代，不适合微信异步通信，继续使用 IDE 生产 |

---

## 二、资源评估

### 4 核 4G 服务器

| 资源项 | 需求 | 是否满足 |
|--------|------|:--:|
| 运行时 | Node.js (stdlib only) + Bash + FFmpeg | ✅ |
| LLM 推理 | 全部走 DeepSeek-v4-flash API（不本地跑模型） | ✅ |
| 音乐生成 | ACE Step1.5 API 远程调用 | ✅ |
| 图片生成 | 百度文心一格 API | ✅ |
| 视频合成 | FFmpeg Ken Burns + 拼接 | ✅ 4 核处理 720p/1080p 足够 |
| Agent 并发 | 3 个 Agent 不同时生产，单线程调度 | ✅ |

> 所有繁重计算（音乐、图片、LLM）均为外部 API 调用，服务器仅作为控制面和编排层。唯一本地 CPU 操作为 Erhu Agent 的 FFmpeg 视频渲染（单次约 2-3 分钟），4 核处理绰绰有余。

---

## 三、架构方案

### 推荐架构：独立编排机器人（单服务器）

```
User (微信)
  │
  ▼
iLink-bot
  │
  ▼
编排机器人服务 (4C4G 服务器)
  │
  ├── DeepSeek-v4-flash（意图解析：自然语言 → Agent 指令 + 参数）
  │
  ├── lemong-agent CLI    → data/Lemong-data/{歌名}/    → MP3
  ├── erhu-agent CLI      → data/Erhu-data/{歌名}/      → MP4
  └── zhupu-manager CLI   → data/Zhupu-data/{家族名}/   → JSON
  │
  ▼
结果摘要 + 产物链接 → 通过微信返回给用户
```

### 架构要点

- **单服务器部署**：编排服务 + 3 个 Agent + 构建数据全部在 4C4G 服务器上
- **DeepSeek-v4-flash 作为驱动引擎**：接收用户微信自然语言消息，解析意图并映射为 Agent 的 CLI 命令 + 参数
- **所有 Agent 通过 CLI 调用**：统一的 one-shot 命令模式，无需改造 Agent 内部逻辑
- **微信消息流转**：用户发微信 → iLink-bot 接收 → 编排器解析 → 执行 Agent → 结果返回微信

---

## 四、各 Agent 编排细节

### 4.1 Lemong Agent（歌曲生产）

```
用户自然语言示例：
  "帮我写一首关于夏天的民谣歌曲"
  "用周杰伦风格写一首中国风歌曲，主题是江南"
  "生成一首摇滚歌曲"
```

**编排流程**：

1. DeepSeek 解析用户意图 → 提取：主题、风格、歌手偏好
2. 映射到 CLI 命令：
   - `./lemong-agent/lemong-agent lyrics --theme "主题"`
   - `./lemong-agent/lemong-agent generate --style "风格" --lyrics "歌词.json" --title "歌名"`
3. 执行生成，监控进度
4. 返回结果：MP3 文件路径 + 歌词摘要

**难度**：⭐⭐ 低。参数明确（主题、风格、歌手），CLI 接口成熟。

---

### 4.2 Erhu Agent（MV 生产）

```
用户自然语言示例：
  "帮二虎制作一首关于离别的MV"
  "用二虎的音色做一首摇滚MV"
```

**编排流程**：

1. 编排器先生成作品计划文档（`data/Erhu-data/plans/{日期}-{歌名}.md`）
2. 调用 `./erhu-agent/erhu-agent produce {作品名}` 一键全流程
3. Erhu 内部自动：作曲（调 lemong-agent）→ 生图（百度文心一格）→ 渲染 MV（FFmpeg）
4. 返回结果：MP4 视频路径 + 歌曲摘要

**难度**：⭐⭐ 低。全自动管线，一条命令完成，编排器只需生成计划文档并触发。

---

### 4.3 Zhupu Manager Agent（族谱管理）

```
用户自然语言示例：
  "帮我在张家家族添加张伟，第三代，男"
  "查看李家族谱树"
  "导出王家族谱为 Markdown"
```

**编排流程**：

1. DeepSeek 解析意图 → 提取：家族名、操作类型、参数
2. 映射到 CLI 命令：
   - `./zhupu-manager-agent/zhupu-manager-agent add "家族名" --name "人名" --generation "辈分" --gender "性别"`
   - `./zhupu-manager-agent/zhupu-manager-agent query "家族名" --name "人名"`
   - `./zhupu-manager-agent/zhupu-manager-agent tree "家族名"`
   - `./zhupu-manager-agent/zhupu-manager-agent export "家族名" --format markdown`
3. 执行操作
4. 返回结果：查询/操作结果文本

**难度**：⭐⭐ 低。CRUD 操作，参数结构明确，适合自然语言映射。

---

## 五、需要解决的关键问题

### 5.1 微信消息长度限制

微信消息有长度限制，生成结果不能直接大段发送：

- **文本类**（歌词、族谱数据）→ 微信发送摘要 + 完整内容写入文件
- **MP3/MP4** → 无法通过微信直接发送文件，需存储在可访问的 URL（如部署静态文件服务或使用 Cloudflare R2），微信发送下载链接
- **长文本**（族谱树）→ 截断发送关键信息，完整内容提供链接

### 5.2 异步生产通知

音乐/MV 生成需要 1-5 分钟（API 调用 + FFmpeg 渲染），微信消息模型是同步的：

```
用户发消息
  → 编排器立即回复："收到，正在处理【歌名】..."
  → Agent 异步执行生产
  → 完成后主动推送结果："【歌名】已完成，下载链接：..."
```

需要在编排器中实现异步任务队列和完成回调。

### 5.3 iLink-bot 接入

- Captain（船长）当前已使用 iLink-bot 与用户通信
- 编排机器人可以复用同一 iLink-bot 账号的不同通道，或使用独立的 iLink-bot 实例
- 具体方案取决于 iLink-bot 的多通道支持能力，实施阶段确认

### 5.4 产物存储与访问

构建产物（MP3、MP4、JSON）需要可被外部访问：

**方案 A**：4C4G 服务器部署 Nginx 静态文件服务，产物目录直接暴露
**方案 B**：上传至 Cloudflare R2，生成临时下载链接
**方案 C**：产物保持本地存储，微信仅发送文本摘要（用户后续通过 IDE 查看完整产物）

> 建议 MVP 阶段使用方案 C（最简单），后续按需升级。

---

## 六、实施路线

### Phase 1：MVP — Lemong Agent 接入（1-2 天）

- [ ] 在 4C4G 服务器 clone 仓库，安装 Node.js + FFmpeg
- [ ] 配置环境变量（DEEPSEEK_API_KEY, ACE_API_KEY 等）
- [ ] 搭建编排器核心（Node.js HTTP 服务 + DeepSeek-v4-flash 意图解析）
- [ ] 实现 Lemong Agent 的 CLI 调用封装
- [ ] 接入 iLink-bot 微信通信
- [ ] 端到端验证：微信发消息 → 生成一首完整歌曲

### Phase 2：Erhu + Zhupu 接入（1-2 天）

- [ ] 接入 Erhu Agent 全流程 MV 生产
- [ ] 接入 Zhupu Manager Agent 族谱 CRUD
- [ ] 异步任务队列 + 生产状态通知
- [ ] 错误处理与重试机制

### Phase 3：打磨（1-2 天）

- [ ] 产物访问（静态文件服务或云存储链接）
- [ ] DeepSeek 意图解析效果调优（prompt engineering）
- [ ] 生产任务状态查询（"查看当前进度"）
- [ ] 用户引导与帮助消息（"可以做什么"）

---

## 七、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 通信层 | iLink-bot + 微信 | 消息收发 |
| 编排层 | Node.js HTTP 服务 | 消息路由 + 任务调度 |
| AI 驱动 | DeepSeek-v4-flash API | 自然语言意图解析 |
| Agent 层 | Bash CLI (lemong/erhu/zhupu) | 统一 one-shot 命令 |
| 数据层 | `data/` 目录结构 | 构建产物存储（已有规范） |

---

## 八、结论

| 维度 | 评估 |
|------|------|
| **技术可行性** | ✅ 完全可行 |
| **资源可行性** | ✅ 4C4G 充裕 |
| **Lemong/Erhu/Zhupu** | ✅ 直接 CLI 调用，低风险 |
| **微信集成** | ✅ iLink-bot 已验证可用 |
| **核心风险** | 异步任务的用户体验（等待期间的无感知） |
| **预计总工期** | 3-6 天（3 个 Phase） |

**总结：技术方案清晰可行。3 个 Agent 均为 one-shot CLI 模式，编排层只需接收微信消息 → LLM 解析意图 → 映射 CLI 命令 → 返回结果。Xujie Writer Agent 保持 IDE 生产模式，不纳入此次编排范围。**
