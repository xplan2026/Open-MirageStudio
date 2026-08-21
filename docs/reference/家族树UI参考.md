# 家族树 UI 参考 — 基于 Mammalia-tree 的 D3.js 深度渲染分析

> 参考项目: [SeanWong17/Mammalia-tree](https://github.com/SeanWong17/Mammalia-tree)
> 分析日期: 2026-07-30
> 目的: 学习该项目对 D3.js 的深度开发经验，应用于族谱家族树的 UI 升级

---

## 一、项目概览

**Mammalia-tree (DeepTime Mammalia)** 是一个交互式哺乳纲演化树科普作品，基于 MDD v2.3 分类系统，覆盖 167 个科和上千个演化节点，跨越 2 亿年。

| 维度 | 详情 |
|------|------|
| 技术栈 | Vanilla JS (ES6+) + D3.js v7 + Three.js (r128) + Tween.js |
| 许可证 | CC BY-NC-SA 4.0 |
| 星数 | ⭐ 229 |
| 在线演示 | https://seanwong17.github.io/Mammalia-tree/ |

**与我们族谱项目的相关性**: 它实现了一个高质量、专业级的树形结构可视化，使用了 D3.js 深度定制（自定义路径生成器、时间轴集成、Zoom/Pan 交互、性能优化），这正是我们族谱树当前缺失的能力。

---

## 二、D3.js 渲染方法分析

### 2.1 布局选择：`d3.cluster()` vs 我们的 `d3.tree()`

| 对比维度 | Mammalia-tree | 我们的族谱树 |
|---------|--------------|------------|
| 布局算法 | `d3.cluster()` 聚类布局 | `d3.tree()` 树布局 |
| size 设置 | `[viewHeight, axisWidth]`（高度×宽度） | `nodeSize([nodeWidth+dx, nodeHeight+dy])` |
| 节点对齐 | 叶子节点对齐在同一层级（适合演化树） | 按父子间距均匀排列 |
| 高度计算 | **动态计算**：统计每层节点数 × nodeSpacing，防止重叠 | 固定 nodeSize，不做动态调整 |

**关键发现**: Mammalia-tree 使用 `d3.cluster()` 而非 `d3.tree()`，因为系统发生树需要叶子节点（现存科）对齐在同一时间线（0 MYA）上。我们的族谱树用 `d3.tree()` 更合适（不同辈分不需要对齐）。

**可借鉴点**: **动态高度计算** — 当树很大时，自动扩展 SVG 高度避免节点重叠。

```javascript
// Mammalia-tree 的动态高度计算
const childCount = {}; // 统计每一层的节点数
this.root.each(function(d) {
  childCount[d.depth] = (childCount[d.depth] || 0) + 1;
});
const newHeight = Math.max(
  config.minHeight,
  d3.max(Object.values(childCount)) * config.nodeSpacing
);
this.treeLayout = d3.cluster().size([newHeight, this.axisWidth]);
```

### 2.2 坐标映射：时间轴作为 X 轴

这是 Mammalia-tree 最有特色的设计。它将"时间"作为 X 轴主维度：

```javascript
// 布局完成后手动覆盖 d.y 为时间轴坐标
nodes.forEach(function(d) {
  d.y = this.timeScale(d.data.divergence_time_mya || 0);
});
```

- `d.y` 不再是 depth × spacing，而是时间值映射到像素位置
- 这意味着**节点的 X 位置由其时间数据决定，而非层级深度**
- 时间轴的方向是"过去（大数值 MYA）→ 现在（0）"

**对我们的启发**: 我们的族谱树中，`d.y` 对应辈分（generation），`d.x` 对应兄弟姐妹纵向排列。如果我们引入时间轴，可以让节点的 X 位置既体现辈分又体现时间跨度。

### 2.3 自定义连线路径生成器

Mammalia-tree 不使用 `d3.linkHorizontal()`，而是自己写了一个 `diagonal()` 方法，实现弯曲的连线：

```javascript
diagonal(s, d, isZero = false) {
  if (isZero || (s.x === d.x && s.y === d.y)) {
    return `M ${s.y} ${s.x} L ${d.y} ${d.x}`;
  }
  const radius = 12;
  const vDist = d.x - s.x;
  if (Math.abs(vDist) < radius * 2) {
    // 垂直距离太小时用直角折线
    return `M ${s.y} ${s.x} L ${s.y} ${d.x} L ${d.y} ${d.x}`;
  }
  const dir = vDist > 0 ? 1 : -1;
  const curveEndX = Math.min(s.y + radius, d.y);
  return ` M ${s.y} ${s.x}
           L ${s.y} ${d.x - radius * dir}
           Q ${s.y} ${d.x} ${curveEndX} ${d.x}
           L ${d.y} ${d.x} `;
}
```

路径形成三段式结构：
1. 从父节点水平出发
2. 用贝塞尔曲线 `Q` 圆角拐弯到子节点层级
3. 水平到达子节点

**对我们的启发**: 我们的 `d3.linkHorizontal()` 只生成简单的水平弧线。可以采用类似的圆角折线设计，让连线更优雅，尤其当族谱树代际跨度很大时。

### 2.4 D3 Enter/Update/Exit 动画流程

Mammalia-tree 严格遵循 D3 的 Enter-Update-Exit 模式，每个操作都带过渡动画：

```
Enter (新增节点):
  - 节点从父节点位置 (source.y0, source.x0) 开始
  - circle 半径从 1e-6 开始（缩小到不可见）
  - text 透明度从 0 开始
  - 然后 transition 到目标位置

Update (已有节点):
  - transition 到新计算的位置
  - circle 更新颜色/大小
  - text 更新可见性

Exit (移除节点):
  - transition 回到父节点位置
  - circle 缩小到 1e-6
  - text 透明度降到 1e-6
  - 最后 remove()
```

**我们的问题**: 我们的代码虽然也有 enter/update/exit，但 enter 的初始位置没有正确使用 `source.y0`/`source.x0`（D3 的 `root.x0`/`root.y0` 在初次渲染时均为 0），导致首次加载时所有节点从左上角飞出。

### 2.5 缩放/平移交互

```javascript
this.zoom = d3.zoom()
  .scaleExtent([0.1, 3])
  .translateExtent([[-800, -500], [this.axisWidth + 500, newHeight + 200]])
  .on("zoom", (e) => {
    this.g.attr("transform", e.transform);
    // 同步更新时间轴刻度
    const newScale = e.transform.rescaleX(this.timeScale);
    this.axis.scale(newScale).ticks(tickCount);
    this.axisGroup.call(this.axis);
    // 更新地质年代标签位置
  });

this.svg.call(this.zoom);
```

**我们完全没有缩放/平移能力**。当前族谱树是静态的 SVG，只能通过浏览器窗口大小调整来"适配"，无法在树很大时进行缩放探索。

---

## 三、时间线区域设计（重点参考）

### 3.1 架构设计

Mammalia-tree 的时间轴是一个**独立的 SVG (`#axis-svg`)**，与主树 SVG 分离：

```html
<div id="time-axis">           <!-- 固定在底部 60px 高 -->
  <svg id="axis-svg">          <!-- 独立 SVG，100% 宽度 -->
    <g transform="translate(0, 10)">
      <!-- d3.axisBottom() 生成的刻度 -->
    </g>
  </svg>
</div>
```

主 SVG 和轴 SVG 之间的关系：
- **所有 zoom/pan 变换一致**：zoom 事件中同时缩放主树和平移轴
- **轴刻度随 zoom 动态更新**：`rescaleX()` 后重新计算 ticks
- **轴始终固定于视口底部**：`position: fixed; bottom: 0;`

### 3.2 CSS 规范

```css
#time-axis {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to top,
    rgba(244, 241, 234, 0.98) 0%,
    rgba(244, 241, 234, 0.9) 70%,
    transparent 100%);
  z-index: 200;
  border-top: 1px solid rgba(93, 64, 55, 0.2);
  pointer-events: none;
}

#axis-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
```

**关键设计细节**：
- 底部固定定位，不随内容滚动
- 半透明渐变背景，上部完全透明（不遮挡树的内容）
- `pointer-events: none` 不拦截交互事件
- 地质纪元标签用 `writing-mode: vertical-rl`（竖排）不占水平空间

### 3.3 对我们族谱树的启发

**如何将时间线适配到家族树**：

1. **时间维度**：族谱中每个成员有 `birth` / `death` 字段，可以映射为时间轴
2. **时间范围**：家族的时间跨度（如 1896~2025，约 130 年），比哺乳动物演化（2 亿年）短得多，刻度单位需要灵活调整
3. **时间轴位置**：可以放在底部或左侧，显示年份刻度
4. **时间线与树的联动**：
   - 缩放时时间轴刻度同步更新
   - 鼠标悬停节点时，在时间轴上高亮对应年份
   - 时间轴背景可以标注历史事件（朝代、战争、迁徙等）

**具体实现建议**：

```javascript
// 家族树时间轴配置
const birthYears = nodes.flatMap(d => d.data.birth ? [parseInt(d.data.birth)] : []);
const minYear = Math.min(...birthYears);
const maxYear = Math.max(...birthYears);

this.timeScale = d3.scaleLinear()
  .domain([minYear - 10, maxYear + 10])  // 留点边距
  .range([0, this.axisWidth]);

this.axis = d3.axisBottom(this.timeScale)
  .tickFormat(d => d + '年');
```

### 3.4 地质纪元背景的启发

Mammalia-tree 在树的背景中绘制彩色带状矩形，标注各地质纪元：

```javascript
// 绘制每个纪元的色带和标签
epochBands.forEach(epoch => {
  g.append('rect')
    .attr('class', 'epoch-band')
    .attr('x', this.timeScale(epoch.start))
    .attr('width', this.timeScale(epoch.end) - this.timeScale(epoch.start))
    .attr('fill', epoch.color);
});
```

**可转化为**：在家族树时间轴上标注朝代/历史时期，增强文化沉浸感。例如标注"清末"、"民国"、"新中国"等时期背景色带。

---

## 四、CSS 规范总结

### 4.1 全局变量体系

```css
:root {
  --accent-color: #c5a059;    /* 金色强调 — 高亮、hover */
  --text-main: #fff;
  --card-bg: rgba(20, 24, 28, 0.85);
  --bg-color: #f4f1ea;        /* 纸质底色 — 整体氛围 */
  --text-color: #2c241b;      /* 深褐色 — 主文字 */
  --line-color: #5d4037;      /* 连线颜色 */
}
```

**收获**: 使用 CSS 变量统一管理主题色，而不是在 JS 中硬编码颜色。我们目前大量颜色直接在 JS 中写死（如 `#f0f4ff`, `#93b5f5`），应该抽到 CSS 变量中。

### 4.2 节点文本的可读性处理

```css
.node text {
  font-size: 12px;
  font-family: 'Noto Serif SC', serif;
  fill: var(--text-color);
  /* ★ 文本描边增强可读性 — 关键技巧 */
  paint-order: stroke fill;
  stroke: #f4f1ea;
  stroke-width: 4px;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 0 rgba(255,255,255,0.5));
}
```

**核心技巧**: 给 SVG 文字添加白色描边 (`paint-order: stroke fill`)，确保文字在连线密集区域仍清晰可读。这是纯 SVG 文本可读性的关键优化手段，我们目前完全没有。

### 4.3 节点交互状态

```css
/* 收起/展开状态 */
.node circle.collapsed {
  fill: #fff;
  stroke: var(--text-color);
  stroke-width: 3px;
}

/* Hover 放大和变色 */
.node:hover circle {
  r: 8 !important;
  fill: #c5a059;
}

/* 搜索结果高亮 */
.node.highlighted circle {
  r: 12 !important;
  fill: #c5a059;
  stroke: #fff;
  stroke-width: 4px;
  filter: drop-shadow(0 0 8px rgba(197, 160, 89, 0.8));
}
```

**收获**: 三种视觉状态（默认/折叠、hover、搜索高亮）有清晰的视觉层级，通过 `r`（半径）、`fill`、`stroke`、`filter` 四层变化层层递进。

### 4.4 移动端响应式

```css
@media (max-width: 768px) {
  #top-controls {
    flex-wrap: wrap;
    max-width: calc(100% - 20px);
  }
  #search-container {
    order: 3;         /* 搜索框在移动端独占一行 */
    width: 100%;
  }
  .tree-btn {
    width: 32px;
    height: 32px;
  }
}
```

**收获**: 控件使用 `flex-wrap` + `order` 实现移动端的自适应重排。考虑到我们族谱树也可能在移动端查看，需要响应式设计。

### 4.5 减少动画偏好

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

无障碍友好，尊重用户系统设置。

---

## 五、数据存储方案对比

### 5.1 Mammalia-tree 的数据结构

```javascript
// 两层结构：clades（中间节点）+ families（叶子节点）
{
  "meta": { "project": "...", "total_families": 167, "total_clades": 320 },
  
  "clades": {
    "Mammalia": {
      "cn_name": "哺乳纲",
      "en_name": "Mammalia",
      "rank": "class",
      "parent": null,                    // 根节点 parent=null
      "divergence_time_mya": 177.0      // ★ 时间数据：百万年前
    },
    "Theria": {
      "parent": "Mammalia",             // ★ 指向父节点的键名
      "divergence_time_mya": 145.0
    }
    // ... 320 个中间节点
  },
  
  "families": [                          // 叶子节点是数组
    {
      "cn_name": "人科",
      "parent_clade": "Hominoidea",     // ★ 挂载到 clades 中的某个节点
      "divergence_time_mya": 15.0,
      "tags": ["Extinct"]               // 标记已灭绝
    }
    // ... 167 个科
  ]
}
```

**特点**:
- **键名查找**: `clades` 以英文键名为索引，`parent` 引用这个键名，O(1) 查找父节点
- **两层分离**: 中间分类节点 (`clades`) 和叶子节点 (`families`) 分开存储
- **时间数据内嵌**: 每个节点自带 `divergence_time_mya`，不是通过层级推算
- **数组 vs 字典**: `clades` 是对象（字典），`families` 是数组

### 5.2 我们族谱的数据结构

```json
{
  "family_name": "米家",
  "members": {
    "member_001": {
      "name": "米兴华",
      "generation": 1,          // 辈分（从1开始）
      "birth": "1896",
      "death": "1972",
      "father": null,
      "children": ["member_005", "member_006"]  // ★ 双向引用
    }
  }
}
```

**特点**:
- **扁平字典**: 所有成员在同一层 `members` 对象中
- **双向引用**: 父亲有 `children`，子女有 `father`/`mother`（冗余但查询方便）
- **generation 字段**: 辈分手动维护，不是从树结构推导
- **出生年份**: 以字符串存储（`"1896"`），非数值型时间戳

### 5.3 关键差异分析

| 维度 | Mammalia-tree | 我们的族谱 | 影响 |
|------|--------------|-----------|------|
| 节点类型 | 两层（中间节点 + 叶节点） | 一层（所有成员同一类型） | 我们更简单 |
| 关系引用 | 单向 `parent` 引用 | 双向 `father`+`children` 引用 | 我们查询更灵活 |
| 时间数据 | `divergence_time_mya` 数值型 | `birth`/`death` 字符串型 | 我们需要转换为时间轴 |
| 层级表达 | 通过 `parent` 隐式表达 | 通过 `generation` 显式表达 | 我们的更直观 |
| 扩展性 | 键名索引，添加新节点插入对象 | 扁平字典，ID 不重用 | 各有优劣 |
| 配偶关系 | 无（生物分类不需要） | 有 `spouse` 数组 | 我们可以渲染夫妻并排 |

### 5.4 适配建议

为了支持时间轴渲染，我们**不需要改变现有数据结构**，只需要在渲染层做时间映射：

```javascript
// 从现有数据提取时间范围
function getTimeScale(members) {
  const birthYears = Object.values(members)
    .filter(m => m.birth)
    .map(m => parseInt(m.birth))
    .filter(y => !isNaN(y));
  
  return {
    min: Math.min(...birthYears),
    max: Math.max(...birthYears),
    range: Math.max(...birthYears) - Math.min(...birthYears)
  };
}
```

但如果未来想要精细的时间轴，可以考虑在成员数据中添加 `birth_date`（精确日期），或将 `birth`/`death` 转为数值型。

---

## 六、我们的改进路线图

### 6.1 短期改进（快速见效）

1. **CSS 变量化颜色体系**
   - 从 JS 中的硬编码颜色（`#f0f4ff`, `#93b5f5` 等）迁移到 CSS 变量
   - 在 `style.css` 中定义 `--node-male-bg`, `--node-female-bg` 等变量

2. **SVG 文本描边**
   - 添加 `paint-order: stroke fill` + 白色描边
   - 解决连线密集时文字可读性问题

3. **修复 D3 Enter 动画**
   - 确保 `root.x0`/`root.y0` 在初始渲染时有正确的默认值
   - 让首次加载的节点动画从合理位置开始

4. **节点交互状态完善**
   - 为折叠/展开状态的节点添加不同视觉样式
   - Hover 时放大节点（`r` 增加）和高亮颜色

### 6.2 中期改进（核心能力）

5. **Zoom/Pan 交互**
   - 使用 `d3.zoom()` 为树添加缩放/平移能力
   - 配置缩放范围、初始比例
   - 支持鼠标滚轮 + 触屏双指缩放

6. **时间轴组件**
   - 在家族树底部添加年份时间轴
   - 根据成员的 `birth`/`death` 数据映射时间范围
   - 在时间轴上标注历史时期/重要事件

7. **自定义连线路径**
   - 替换 `d3.linkHorizontal()` 为圆角折线
   - 参考 Mammalia-tree 的三段式路径生成器

### 6.3 长期改进（体验升级）

8. **动态高度计算**
   - 根据实际节点数量动态调整 SVG 高度
   - 避免大家族时节点重叠

9. **移动端响应式**
   - `@media (max-width: 768px)` 适配小屏幕
   - 控件自动重排
   - 双指缩放优化

10. **搜索与定位**
    - 按姓名搜索成员，自动 pan/zoom 到该节点
    - 搜索结果高亮（`filter: drop-shadow` 发光效果）

---

## 七、核心代码片段参考

### 7.1 自定义连线路径（可复用）

```javascript
function diagonal(source, target, radius = 12) {
  const vDist = target.x - source.x;
  
  // 垂直距离太小，用直角折线
  if (Math.abs(vDist) < radius * 2) {
    return `M ${source.y} ${source.x}
            L ${source.y} ${target.x}
            L ${target.y} ${target.x}`;
  }
  
  const dir = vDist > 0 ? 1 : -1;
  const curveEndX = Math.min(source.y + radius, target.y);
  
  return `M ${source.y} ${source.x}
          L ${source.y} ${target.x - radius * dir}
          Q ${source.y} ${target.x} ${curveEndX} ${target.x}
          L ${target.y} ${target.x}`;
}
```

### 7.2 时间轴渲染（适配家族树）

```javascript
function setupFamilyTimeAxis(members, containerWidth) {
  const birthYears = Object.values(members)
    .filter(m => m.birth)
    .map(m => parseInt(m.birth))
    .filter(y => !isNaN(y));
  
  const minYear = Math.min(...birthYears) - 10;
  const maxYear = Math.max(...birthYears) + 10;
  
  const timeScale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, containerWidth]);
  
  const axis = d3.axisBottom(timeScale)
    .tickFormat(d => `${d}年`)
    .ticks(Math.min(10, maxYear - minYear));
  
  d3.select('#family-time-axis-svg')
    .append('g')
    .attr('transform', 'translate(0, 10)')
    .call(axis);
}
```

### 7.3 D3 Zoom 集成模板

```javascript
const zoom = d3.zoom()
  .scaleExtent([0.2, 3])
  .translateExtent([[-500, -500], [width + 500, height + 500]])
  .on('zoom', (e) => {
    // 变换主树
    mainG.attr('transform', e.transform);
    
    // 同步更新时间轴
    const newXScale = e.transform.rescaleX(timeScale);
    xAxis.scale(newXScale);
    axisG.call(xAxis);
  });

svg.call(zoom);
```

---

## 八、总结

Mammalia-tree 对 D3.js 的深度开发主要体现在：

1. **布局层面**: `d3.cluster()` + 动态高度计算 + 时间坐标覆盖
2. **渲染层面**: 自定义贝塞尔连线路径、严格 Enter/Update/Exit 动画模式
3. **交互层面**: 完整的 Zoom/Pan + 时间轴联动 + 触摸支持
4. **样式层面**: CSS 变量体系 + SVG 文本描边 + 三态视觉层级
5. **架构层面**: 双 SVG（主树 + 时间轴）分离但联动

**对我们族谱树的核心价值排序**：

| 优先级 | 特性 | 价值 |
|-------|------|------|
| ★★★ | 时间轴组件 | 显著提升文化沉浸感，可视化家族的时间维度 |
| ★★★ | Zoom/Pan 交互 | 大家族的必要性能力 |
| ★★★ | SVG 文本可读性 | 当前最大痛点 |
| ★★☆ | 自定义连线路径 | 提升视觉品质 |
| ★★☆ | CSS 颜色体系重构 | 代码质量和维护性 |
| ★☆☆ | 动态高度计算 | 数据规模增大后需要 |
