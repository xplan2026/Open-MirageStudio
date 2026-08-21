# 家族树 D3.js 渲染优化计划

> 创建日期: 2026-07-30 | 完成日期: 2026-07-30
> 参考: Mammalia-tree 项目的 D3.js 深度开发经验
> 涉及文件: `website/src/components/FamilyTree.astro`, `website/src/styles/global.css`

## 优化总览

当前族谱树的 D3.js 渲染存在以下问题：
- 颜色全部硬编码在 JS 中，缺乏主题统一性
- SVG 文本在连线密集区域可读性差
- 首次加载动画起点不正确
- 节点只有 hover 亮度变化，缺少清晰的交互状态
- 连线使用默认 `d3.linkHorizontal()`，缺乏视觉品质
- 无 Zoom/Pan 能力，大家族无法探索
- 无时间维度展示

## 实施步骤

### Step 1: CSS 变量体系重构 + SVG 文本描边 ✅

**文件**: `website/src/styles/global.css`

将 FamilyTree 中所有硬编码颜色抽取为 CSS 变量，并添加 SVG 文本可读性样式：

```css
:root {
  --ft-node-male-bg: #f0f4ff;
  --ft-node-male-stroke: #93b5f5;
  --ft-node-female-bg: #fff0f5;
  --ft-node-female-stroke: #f0a0b0;
  --ft-node-text: #1a1a2e;
  --ft-node-subtext: #7a7a8a;
  --ft-link-color: #d4cfc4;
  --ft-link-width: 1.5px;
  --ft-spouse-bg: #fdf6ee;
  --ft-spouse-stroke: #e8d5b0;
  --ft-spouse-text: #8b7355;
  --ft-expand-bg: #faf8f5;
  --ft-expand-stroke: #c9a96e;
  --ft-expand-text: #c9a96e;
  --ft-node-hover-glow: #c9a96e;
  --ft-node-highlight-glow: #e0a030;
  --ft-axis-bg: rgba(250, 248, 245, 0.95);
  --ft-axis-border: rgba(201, 169, 110, 0.3);
}
```

- [x] 在 `global.css` 中新增 16 个 CSS 变量
- [x] 添加 `.ft-node-name` / `.ft-node-dates` 的 `paint-order: stroke fill` 文本描边
- [x] 添加 `.ft-node` 三态样式（collapsed / hover / highlighted）
- [x] 配偶标签、展开折叠按钮、连线 → 全部用 CSS class 控制

### Step 2: 修复 D3 Enter 动画 + 节点交互状态 ✅

**文件**: `website/src/components/FamilyTree.astro`

- [x] 在 `update()` 首次调用前通过 `treeLayout(root)` 预设 `root.x0` / `root.y0`
- [x] Enter 节点从 `source.y0` / `source.x0` 开始动画（不再从 (0,0) 飞出）
- [x] 折叠圆圈通过 `.collapsed` class 切换视觉（空心 vs 实心）
- [x]  搜索高亮预留 `.highlighted` class（待搜索功能加入时启用）

### Step 3: 自定义连线路径 ✅

**文件**: `website/src/components/FamilyTree.astro`

- [x] 实现 `diagonal(s, t)` 函数 — 三段式圆角折线路径
  - 路径: 起点 → 水平段(45%) → 圆角竖拐 → 垂直段 → 圆角右拐 → 水平段到子节点
  - 垂直距离太小时降级为简单立方贝塞尔
- [x] 替换 `d3.linkHorizontal()` 调用

### Step 4: Zoom/Pan 交互 ✅

**文件**: `website/src/components/FamilyTree.astro`

- [x] 集成 `d3.zoom()`，配置缩放范围 `[0.15, 2.5]`
- [x] 配置平移范围限制 `translateExtent`
- [x] 支持鼠标滚轮 `+` 触屏双指缩放
- [x] 初始视图居中: `d3.zoomIdentity.translate(10, 20).scale(0.9)`
- [x] 添加三个缩放控件按钮: 放大 + / 缩小 − / 重置 ↺
- [x] 控件半透明，hover 时显现

### Step 5: 时间轴组件 ✅

**文件**: `website/src/components/FamilyTree.astro`

- [x] 在主容器底部添加独立的 `#ft-time-axis` + `#ft-axis-svg`
- [x] 使用 `d3.scaleLinear().domain([1910, 2030])` 映射年份范围
- [x] 每 10 年一个刻度标签: 1910, 1920, 1930, ..., 2030（`d3.range(1910, 2031, 10)`）
- [x] `d3.axisBottom()` 渲染刻度线和标签
- [x] CSS 固定于容器底部: 高度 56px，半透明渐变背景
- [x] 添加"今"标注线（2026 年虚线），标记当前时间点
- [x] 窗口 resize 时自动重绘时间轴

### Step 6: 整合与测试 ✅

- [x] 所有改动向后兼容（数据结构不变）
- [x] `npx astro check` 通过（零错误）
- [x] 未引入新 npm 依赖
- [x] 移动端适配: `@media (max-width: 768px)` 缩小字号和控件
- [x] `prefers-reduced-motion: reduce` 禁用动画

## 实现架构

```
#family-tree-container (flex column)
├── #ft-main-area (flex:1, position:relative)
│   ├── #ft-tree-svg (D3 主树 SVG + zoom)
│   │   └── g.ft-main-g (zoom 变换目标)
│   │       ├── path.ft-link     (圆角折线)
│   │       └── g.ft-node        (节点)
│   │           ├── rect.ft-node-bg.{male|female}
│   │           ├── text.ft-node-name    (文字描边)
│   │           ├── text.ft-node-dates   (文字描边)
│   │           ├── text.ft-node-gender
│   │           ├── g.ft-toggle          (折叠按钮)
│   │           └── g.ft-spouse          (配偶标签)
│   └── #ft-zoom-controls (绝对定位，右上角)
│       ├── .ft-zoom-btn#ft-zoom-in
│       ├── .ft-zoom-btn#ft-zoom-out
│       └── .ft-zoom-btn#ft-zoom-reset
└── #ft-time-axis (56px 固定高度)
    └── #ft-axis-svg (时间轴 SVG)
        ├── g (d3.axisBottom 刻度)
        ├── line (2026 "今" 虚线)
        └── text ("今" 标注)
```

## 不涉及的内容

- 数据结构不变（不修改 `data.ts` / `types.ts`）
- 不修改 `zhupu-manager-agent/` CLI 脚本
- 不引入新的 npm 依赖
- 搜索功能待后续迭代（`.highlighted` class 已预留）

## 后续优化方向

1. **搜索 + 高亮定位**: 按姓名搜索成员，自动 pan/zoom 到节点并 `.highlighted` 发光
2. **成员节点的时间轴高亮**: 鼠标 hover 节点时在时间轴上高亮其生卒年份区间
3. **历史背景色带**: 在时间轴背景中标注朝代/时期（清末、民国、新中国等）
4. **动态高度**: 根据实际节点数量动态计算 SVG 高度，避免大家族节点重叠
5. **导出为图片**: 将当前视图导出为 PNG/SVG
