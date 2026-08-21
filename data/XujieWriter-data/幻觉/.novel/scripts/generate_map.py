#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SVG/HTML 地图生成脚本

功能：
1. 读取 worldbuilding/map/*.json 坐标数据
2. 生成 SVG 静态地图
3. 生成 HTML 交互式地图

用法：
    python generate_map.py .novel/worldbuilding/map/world-map.json
    python generate_map.py .novel/worldbuilding/map/cities/东海城.json --level L2
"""

import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional


class MapGenerator:
    """地图生成器"""
    
    def __init__(self, map_data: Dict, width: int = 800, height: int = 600,
                 background_image: str = ''):
        self.data = map_data
        self.width = width
        self.height = height
        self.name = map_data.get('name', '未命名地图')
        self.level = map_data.get('level', 'L0')
        self.background_image = background_image or map_data.get('background_image', '')
        
    def _coord_to_px(self, x: float, y: float) -> Tuple[int, int]:
        """将相对坐标 (0-1) 转换为像素坐标。"""
        px = int(x * self.width)
        py = int(y * self.height)
        return px, py
    
    def _get_level_color(self, level: str, is_fog: bool = False) -> str:
        """根据层级和迷雾状态返回颜色。"""
        if is_fog:
            return '#cccccc'
        colors = {
            'L0': '#4a90e2',
            'L1': '#50c878',
            'L2': '#f5a623',
            'L3': '#d0021b',
            'L4': '#9013fe'
        }
        return colors.get(level, '#4a90e2')
    
    def _get_level_label(self, level: str) -> str:
        """层级中文标签。"""
        labels = {
            'L0': '世界',
            'L1': '区域',
            'L2': '城市',
            'L3': '场景',
            'L4': '细节'
        }
        return labels.get(level, level)
    
    def generate_svg(self) -> str:
        """生成 SVG 字符串（含背景图、形状、节点）。"""
        svg_parts = []
        svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{self.width}" height="{self.height}" viewBox="0 0 {self.width} {self.height}">')
        
        # ── 背景层 ──
        svg_parts.append(f'<rect width="{self.width}" height="{self.height}" fill="#f8f9fa"/>')
        
        # 背景图片（手绘地图）
        if self.background_image:
            svg_parts.append(f'<image xlink:href="{self.background_image}" x="0" y="0" width="{self.width}" height="{self.height}" preserveAspectRatio="xMidYMid meet" opacity="1.0"/>')
        
        # ── 形状层（道路、区域、水体等） ──
        for shape in self.data.get('shapes', []):
            shape_type = shape.get('type', 'rect')
            pts_rel = shape.get('points', [])
            if not pts_rel:
                continue
            pts_px = [self._coord_to_px(p[0], p[1]) for p in pts_rel]
            
            fill = shape.get('fill', 'none')
            stroke = shape.get('stroke', '#999')
            stroke_w = shape.get('stroke_width', 2)
            shape_id = shape.get('id', '')
            opacity = shape.get('opacity', 1.0)
            
            if shape_type == 'line':
                x1, y1 = pts_px[0]
                x2, y2 = pts_px[1]
                dash = '5,3' if shape.get('dashed') else ''
                svg_parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{stroke_w}" stroke-dasharray="{dash}" opacity="{opacity}"/>')
                
            elif shape_type == 'rect':
                x1, y1 = pts_px[0]
                x2, y2 = pts_px[1]
                rx, ry = x1, y1
                rw, rh = x2 - x1, y2 - y1
                svg_parts.append(f'<rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_w}" opacity="{opacity}"/>')
                
            elif shape_type == 'polygon':
                points_str = ' '.join(f'{x},{y}' for x, y in pts_px)
                svg_parts.append(f'<polygon points="{points_str}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_w}" opacity="{opacity}"/>')
            
            # 形状标签
            label = shape.get('label', '')
            if label:
                lp = shape.get('label_pos', None)
                if lp:
                    lx, ly = self._coord_to_px(lp[0], lp[1])
                elif shape_type == 'line':
                    lx = (pts_px[0][0] + pts_px[1][0]) // 2
                    ly = (pts_px[0][1] + pts_px[1][1]) // 2 - 8
                elif shape_type == 'rect':
                    lx = (pts_px[0][0] + pts_px[1][0]) // 2
                    ly = pts_px[0][1] - 6
                else:
                    xs = [p[0] for p in pts_px]
                    ys = [p[1] for p in pts_px]
                    lx = sum(xs) // len(xs)
                    ly = min(ys) - 6
                font_size = shape.get('font_size', 11)
                label_color = shape.get('label_color', '#555')
                svg_parts.append(f'<text x="{lx}" y="{ly}" font-family="sans-serif" font-size="{font_size}" fill="{label_color}" text-anchor="middle" font-weight="600">{label}</text>')
        
        # ── 连接线 ──
        connections = self.data.get('connections', [])
        for conn in connections:
            from_name = conn.get('from', '')
            to_name = conn.get('to', '')
            from_node = self._find_node(from_name)
            to_node = self._find_node(to_name)
            if from_node and to_node:
                x1, y1 = self._coord_to_px(from_node['x'], from_node['y'])
                x2, y2 = self._coord_to_px(to_node['x'], to_node['y'])
                svg_parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#999" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.6"/>')
                mid_x, mid_y = (x1 + x2) // 2, (y1 + y2) // 2
                method = conn.get('method', '')
                time = conn.get('time', '')
                label = f"{method} {time}".strip()
                if label:
                    svg_parts.append(f'<text x="{mid_x}" y="{mid_y - 4}" font-family="sans-serif" font-size="9" fill="#888" text-anchor="middle">{label}</text>')
        
        # ── 标题 ──
        svg_parts.append(f'<text x="20" y="30" font-family="sans-serif" font-size="18" font-weight="bold" fill="#333">{self.name} ({self._get_level_label(self.level)})</text>')
        
        # ── 节点层（区域/城市/场景） ──
        nodes = self._get_nodes()
        for node in nodes:
            name = node.get('name', '')
            level = node.get('level', self.level)
            x, y = self._coord_to_px(node['x'], node['y'])
            is_fog = name in self.data.get('fog_of_war', [])
            color = self._get_level_color(level, is_fog)
            radius = 25 if level == 'L1' else 18 if level == 'L2' else 12
            
            svg_parts.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{color}" stroke="#333" stroke-width="2" opacity="{0.5 if is_fog else 1.0}"/>')
            svg_parts.append(f'<text x="{x}" y="{y + radius + 15}" font-family="sans-serif" font-size="12" fill="#333" text-anchor="middle">{name}</text>')
            if not is_fog:
                svg_parts.append(f'<text x="{x}" y="{y + 4}" font-family="sans-serif" font-size="9" fill="white" text-anchor="middle">{level}</text>')
        
        # ── 迷雾区域提示 ──
        fog_areas = self.data.get('fog_of_war', [])
        if fog_areas:
            fog_text = '迷雾区域：' + '、'.join(fog_areas)
            svg_parts.append(f'<text x="20" y="{self.height - 20}" font-family="sans-serif" font-size="12" fill="#999">{fog_text}</text>')
        
        # ── 图例 ──
        legend_y = 60
        svg_parts.append(f'<text x="{self.width - 150}" y="{legend_y}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333">图例</text>')
        for i, (level, color) in enumerate([
            ('L0', '#4a90e2'), ('L1', '#50c878'), ('L2', '#f5a623'),
            ('L3', '#d0021b'), ('L4', '#9013fe'), ('迷雾', '#cccccc')
        ]):
            y = legend_y + 25 + i * 20
            svg_parts.append(f'<circle cx="{self.width - 140}" cy="{y - 4}" r="6" fill="{color}"/>')
            svg_parts.append(f'<text x="{self.width - 125}" y="{y}" font-family="sans-serif" font-size="11" fill="#333">{self._get_level_label(level)}</text>')
        
        svg_parts.append('</svg>')
        return '\n'.join(svg_parts)
    
    def _find_node(self, name: str) -> Optional[Dict]:
        """根据名称查找节点。"""
        nodes = self._get_nodes()
        for node in nodes:
            if node.get('name') == name:
                return node
        return None
    
    def _get_nodes(self) -> List[Dict]:
        """获取所有子节点。"""
        nodes = []
        
        # L0: regions
        if 'regions' in self.data:
            for region in self.data['regions']:
                nodes.append({
                    'name': region.get('name', ''),
                    'level': region.get('level', 'L1'),
                    'x': region.get('coordinates', {}).get('x', 0.5),
                    'y': region.get('coordinates', {}).get('y', 0.5)
                })
        
        # L1/L2: districts
        if 'districts' in self.data:
            for name, info in self.data['districts'].items():
                coords = info.get('coordinates', {})
                nodes.append({
                    'name': name,
                    'level': info.get('level', 'L3'),
                    'x': coords.get('x', 0.5),
                    'y': coords.get('y', 0.5)
                })
        
        return nodes
    
    def _get_center_coord(self) -> Tuple[int, int]:
        """获取当前地图中心点（用于绘制连接线起点）。"""
        return self.width // 2, self.height // 2
    
    def generate_html(self, svg_content: str, source_json: str = '') -> str:
        """生成 HTML 交互页面（含拖拽编辑 + 保存功能）。"""
        nodes_json = json.dumps(self._get_nodes(), ensure_ascii=False)
        connections_json = json.dumps(self.data.get('connections', []), ensure_ascii=False)
        fog_json = json.dumps(self.data.get('fog_of_war', []), ensure_ascii=False)
        
        html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.name} - 可拖拽编辑地图</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; }}
        .container {{ max-width: 1100px; margin: 0 auto; }}
        
        .toolbar {{
            display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
            padding: 12px 16px; background: #16213e; border-radius: 8px;
            flex-wrap: wrap;
        }}
        .toolbar h1 {{ margin: 0; font-size: 20px; color: #e94560; white-space: nowrap; }}
        .toolbar .meta {{ color: #888; font-size: 13px; }}
        .toolbar .spacer {{ flex: 1; }}
        
        .btn {{
            padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer;
            font-size: 14px; font-weight: 600; transition: all 0.2s;
        }}
        .btn-edit {{
            background: #0f3460; color: #e94560; border: 2px solid #e94560;
        }}
        .btn-edit.active {{
            background: #e94560; color: #fff;
        }}
        .btn-save {{
            background: #00b894; color: #fff;
        }}
        .btn-save:hover {{ background: #00a381; }}
        .btn-save:disabled {{
            background: #555; cursor: not-allowed;
        }}
        .btn-reset {{
            background: #636e72; color: #fff;
        }}
        
        #map-container {{
            position: relative; background: #fff; border-radius: 8px;
            overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }}
        #map-container.editing {{
            box-shadow: 0 0 0 3px #e94560, 0 4px 20px rgba(233,69,96,0.3);
        }}
        #map-container svg {{ display: block; }}
        
        .drag-handle {{
            position: absolute; width: 20px; height: 20px;
            border-radius: 50%; cursor: grab;
            border: 3px solid #e94560; background: rgba(233,69,96,0.3);
            transform: translate(-50%, -50%);
            z-index: 10; display: none; pointer-events: none;
        }}
        .editing .drag-handle {{
            display: block; pointer-events: auto;
        }}
        .drag-handle:hover {{ background: rgba(233,69,96,0.7); }}
        .drag-handle.dragging {{
            cursor: grabbing; background: #e94560; border-color: #fff;
            box-shadow: 0 0 12px rgba(233,69,96,0.6);
        }}
        .drag-handle .label {{
            position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
            white-space: nowrap; font-size: 11px; font-weight: 700;
            color: #1a1a2e; background: #e94560; padding: 2px 8px;
            border-radius: 4px; pointer-events: none;
        }}
        .drag-handle .coord {{
            position: absolute; left: 14px; top: 18px;
            white-space: nowrap; font-size: 10px;
            color: #888; pointer-events: none;
        }}
        
        #info {{
            margin-top: 16px; padding: 16px; background: #16213e;
            border-radius: 8px; min-height: 60px;
        }}
        #info h3 {{ margin: 0 0 8px 0; color: #e94560; }}
        #info p {{ margin: 4px 0; color: #ccc; font-size: 14px; }}
        
        .legend {{ margin-top: 12px; display: flex; gap: 16px; flex-wrap: wrap; }}
        .legend-item {{ display: flex; align-items: center; gap: 6px; font-size: 12px; color: #aaa; }}
        .legend-color {{ width: 12px; height: 12px; border-radius: 50%; }}
        
        .toast {{
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            border-radius: 8px; color: #fff; font-weight: 600; z-index: 999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }}
        .toast.success {{ background: #00b894; }}
        .toast.error {{ background: #d63031; }}
        @keyframes slideIn {{
            from {{ transform: translateX(100%); opacity: 0; }}
            to {{ transform: translateX(0); opacity: 1; }}
        }}
        
        .tip {{
            margin-top: 8px; padding: 8px 12px; background: #0f3460;
            border-radius: 6px; font-size: 12px; color: #8892b0;
            display: none;
        }}
        .editing-tip {{ display: block; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="toolbar">
            <h1>{self.name}</h1>
            <span class="meta">{self._get_level_label(self.level)} 级地图</span>
            <span class="spacer"></span>
            <button class="btn btn-edit" id="btn-edit" onclick="toggleEdit()">✋ 编辑模式</button>
            <button class="btn btn-save" id="btn-save" onclick="savePositions()" disabled>💾 保存坐标</button>
            <button class="btn btn-reset" id="btn-reset" onclick="resetPositions()" disabled>↺ 重置</button>
        </div>
        
        <div id="map-container">
            {svg_content}
        </div>
        
        <div class="tip editing-tip" id="edit-tip">
            💡 <b>拖拽</b>圆圈把手来调整节点位置。调整完成后点击 <b>「保存坐标」</b> 写回 JSON 文件。
        </div>
        
        <div id="info">
            <h3>地点详情</h3>
            <p>点击地图上的节点查看详情。点击 <b>「编辑模式」</b> 可拖拽调整位置。</p>
        </div>
        
        <div class="legend">
            <div class="legend-item"><div class="legend-color" style="background:#4a90e2"></div>世界</div>
            <div class="legend-item"><div class="legend-color" style="background:#50c878"></div>区域</div>
            <div class="legend-item"><div class="legend-color" style="background:#f5a623"></div>城市</div>
            <div class="legend-item"><div class="legend-color" style="background:#d0021b"></div>场景</div>
            <div class="legend-item"><div class="legend-color" style="background:#9013fe"></div>细节</div>
            <div class="legend-item"><div class="legend-color" style="background:#cccccc"></div>迷雾</div>
        </div>
    </div>
    
    <script>
        const MAP_WIDTH = {self.width};
        const MAP_HEIGHT = {self.height};
        const SOURCE_JSON = "{source_json}";
        const nodes = {nodes_json};
        const originalNodes = JSON.parse(JSON.stringify(nodes));
        const connections = {connections_json};
        const fogAreas = {fog_json};
        
        let isEditing = false;
        let dragTarget = null;
        let dragStartX = 0, dragStartY = 0;
        let nodeStartX = 0, nodeStartY = 0;
        let handles = {{}};
        let hasChanges = false;
        
        // ── 初始化：创建拖拽把手 ──
        function initDragHandles() {{
            const container = document.getElementById('map-container');
            const svg = container.querySelector('svg');
            const circles = svg.querySelectorAll('circle');
            
            // 只取数据节点（跳过图例的小圆点）
            circles.forEach(circle => {{
                const r = parseFloat(circle.getAttribute('r'));
                if (r < 10) return; // 跳过图例小圆
                
                const cx = parseFloat(circle.getAttribute('cx'));
                const cy = parseFloat(circle.getAttribute('cy'));
                const textEl = circle.nextElementSibling;
                const name = textEl ? textEl.textContent.trim() : '未知';
                
                const handle = document.createElement('div');
                handle.className = 'drag-handle';
                handle.style.left = cx + 'px';
                handle.style.top = cy + 'px';
                handle.setAttribute('data-name', name);
                handle.setAttribute('data-x', cx);
                handle.setAttribute('data-y', cy);
                
                handle.innerHTML = '<span class="label">' + name + '</span>' +
                    '<span class="coord">(' + cx + ', ' + cy + ')</span>';
                
                // 鼠标事件
                handle.addEventListener('mousedown', (e) => startDrag(e, handle));
                // 触摸事件
                handle.addEventListener('touchstart', (e) => startDrag(e, handle), {{passive: false}});
                
                container.appendChild(handle);
                handles[name] = handle;
            }});
        }}
        
        // ── 拖拽 ──
        function startDrag(e, handle) {{
            if (!isEditing) return;
            e.preventDefault();
            
            dragTarget = handle;
            dragTarget.classList.add('dragging');
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            dragStartX = clientX;
            dragStartY = clientY;
            nodeStartX = parseFloat(handle.getAttribute('data-x'));
            nodeStartY = parseFloat(handle.getAttribute('data-y'));
            
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchmove', onDrag, {{passive: false}});
            document.addEventListener('touchend', endDrag);
        }}
        
        function onDrag(e) {{
            if (!dragTarget) return;
            e.preventDefault();
            
            const container = document.getElementById('map-container');
            const rect = container.getBoundingClientRect();
            const svgRect = container.querySelector('svg').getBoundingClientRect();
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const dx = clientX - dragStartX;
            const dy = clientY - dragStartY;
            
            let newX = nodeStartX + dx;
            let newY = nodeStartY + dy;
            
            // 限制在地图内
            newX = Math.max(0, Math.min(svgRect.width, newX));
            newY = Math.max(0, Math.min(svgRect.height, newY));
            
            dragTarget.style.left = newX + 'px';
            dragTarget.style.top = newY + 'px';
            dragTarget.setAttribute('data-x', Math.round(newX));
            dragTarget.setAttribute('data-y', Math.round(newY));
            
            // 更新坐标显示
            const coordSpan = dragTarget.querySelector('.coord');
            if (coordSpan) {{
                coordSpan.textContent = '(' + Math.round(newX) + ', ' + Math.round(newY) + ')';
            }}
            
            hasChanges = true;
        }}
        
        function endDrag(e) {{
            if (dragTarget) {{
                dragTarget.classList.remove('dragging');
                dragTarget = null;
            }}
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('touchend', endDrag);
        }}
        
        // ── 编辑模式切换 ──
        function toggleEdit() {{
            isEditing = !isEditing;
            const container = document.getElementById('map-container');
            const btn = document.getElementById('btn-edit');
            const btnSave = document.getElementById('btn-save');
            const btnReset = document.getElementById('btn-reset');
            const tip = document.getElementById('edit-tip');
            
            if (isEditing) {{
                container.classList.add('editing');
                btn.classList.add('active');
                btn.textContent = '👁 查看模式';
                btnSave.disabled = false;
                btnReset.disabled = false;
                tip.style.display = 'block';
            }} else {{
                container.classList.remove('editing');
                btn.classList.remove('active');
                btn.textContent = '✋ 编辑模式';
                btnSave.disabled = true;
                btnReset.disabled = true;
                tip.style.display = 'none';
            }}
        }}
        
        // ── 保存坐标 ──
        async function savePositions() {{
            if (!SOURCE_JSON) {{
                showToast('错误：未指定 JSON 源文件路径', 'error');
                return;
            }}
            
            const updates = [];
            Object.entries(handles).forEach(([name, handle]) => {{
                const px = parseFloat(handle.getAttribute('data-x'));
                const py = parseFloat(handle.getAttribute('data-y'));
                updates.push({{
                    name: name,
                    x: parseFloat((px / MAP_WIDTH).toFixed(4)),
                    y: parseFloat((py / MAP_HEIGHT).toFixed(4))
                }});
            }});
            
            try {{
                const resp = await fetch('/save', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ source: SOURCE_JSON, updates: updates }})
                }});
                
                const result = await resp.json();
                if (result.ok) {{
                    showToast('✅ 坐标已保存到 ' + SOURCE_JSON, 'success');
                    hasChanges = false;
                    // 更新 originalNodes
                    updates.forEach(u => {{
                        const node = originalNodes.find(n => n.name === u.name);
                        if (node) {{ node.x = u.x; node.y = u.y; }}
                    }});
                    // 提示重新生成 SVG
                    showToast('🔄 请运行 generate_map.py 刷新 SVG 图层', 'success');
                }} else {{
                    showToast('❌ 保存失败：' + (result.error || '未知错误'), 'error');
                }}
            }} catch (err) {{
                showToast('❌ 网络错误：' + err.message, 'error');
                showToast('💡 请确认编辑服务器 (map_editor_server.py) 正在运行', 'error');
            }}
        }}
        
        // ── 重置 ──
        function resetPositions() {{
            if (!confirm('确定要放弃所有修改，恢复原始位置？')) return;
            
            Object.entries(handles).forEach(([name, handle]) => {{
                const orig = originalNodes.find(n => n.name === name);
                if (orig) {{
                    const px = Math.round(orig.x * MAP_WIDTH);
                    const py = Math.round(orig.y * MAP_HEIGHT);
                    handle.style.left = px + 'px';
                    handle.style.top = py + 'px';
                    handle.setAttribute('data-x', px);
                    handle.setAttribute('data-y', py);
                    const coordSpan = handle.querySelector('.coord');
                    if (coordSpan) coordSpan.textContent = '(' + px + ', ' + py + ')';
                }}
            }});
            hasChanges = false;
            showToast('↺ 已恢复原始位置', 'success');
        }}
        
        // ── Toast 通知 ──
        function showToast(msg, type) {{
            const toast = document.createElement('div');
            toast.className = 'toast ' + type;
            toast.textContent = msg;
            document.body.appendChild(toast);
            setTimeout(() => {{
                toast.style.transition = 'opacity 0.3s';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }}, 3000);
        }}
        
        // ── 点击节点查看详情（覆盖 SVG 圆圈点击） ──
        function setupClickInfo() {{
            document.querySelectorAll('.drag-handle').forEach(handle => {{
                handle.addEventListener('click', function(e) {{
                    if (hasChanges && dragTarget === null) return; // 拖拽结束后的 click
                    const name = this.getAttribute('data-name');
                    const node = nodes.find(n => n.name === name);
                    const isFog = fogAreas.includes(name);
                    
                    let html = '<h3>' + name + '</h3>';
                    if (node) {{
                        html += '<p>层级：' + node.level + '</p>';
                    }}
                    html += '<p>状态：' + (isFog ? '迷雾（未解锁）' : '已解锁') + '</p>';
                    
                    const conn = connections.find(c => c.to === name);
                    if (conn) {{
                        html += '<p>交通：' + (conn.method || '') + ' ' + (conn.time || '') + '</p>';
                    }}
                    
                    if (isEditing) {{
                        const px = parseFloat(this.getAttribute('data-x'));
                        const py = parseFloat(this.getAttribute('data-y'));
                        html += '<p style="color:#e94560">坐标：(' + px + ', ' + py + ') → 相对(' +
                            (px / MAP_WIDTH).toFixed(4) + ', ' + (py / MAP_HEIGHT).toFixed(4) + ')</p>';
                    }}
                    
                    document.getElementById('info').innerHTML = html;
                }});
            }});
        }}
        
        // ── 启动 ──
        initDragHandles();
        setupClickInfo();
        console.log('🗺️ 地图编辑器就绪 | 节点数：' + Object.keys(handles).length + ' | 源文件：' + (SOURCE_JSON || '未指定'));
        console.log('💡 点击「编辑模式」按钮开始拖拽调整节点位置');
    </script>
</body>
</html>'''
        return html


def load_map_data(json_path: Path) -> Dict:
    """加载 JSON 地图数据。"""
    return json.loads(json_path.read_text(encoding='utf-8'))


def main():
    parser = argparse.ArgumentParser(
        description='根据 JSON 坐标生成 SVG/HTML 地图'
    )
    parser.add_argument(
        'input',
        help='输入 JSON 文件路径'
    )
    parser.add_argument(
        '-o', '--output-dir',
        default='.',
        help='输出目录（默认：当前目录）'
    )
    parser.add_argument(
        '-w', '--width',
        type=int,
        default=800,
        help='SVG 宽度（默认：800）'
    )
    parser.add_argument(
        '-ht', '--height',
        type=int,
        default=600,
        help='SVG 高度（默认：600）'
    )
    parser.add_argument(
        '--no-html',
        action='store_true',
        help='不生成 HTML 文件'
    )
    parser.add_argument(
        '--source-json',
        default='',
        help='JSON 源文件相对于 map 目录的路径（用于编辑保存功能，如 world-map.json 或 cities/盘龙岗.json）'
    )
    parser.add_argument(
        '--background-image',
        default='',
        help='背景图片路径（相对于 map 目录，如 images/盘龙岗-sketch.jpg）。支持手绘地图照片。'
    )
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"错误：输入文件不存在：{input_path}", file=sys.stderr)
        sys.exit(1)
    
    map_data = load_map_data(input_path)
    generator = MapGenerator(map_data, width=args.width, height=args.height,
                             background_image=args.background_image)
    
    svg_content = generator.generate_svg()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    base_name = input_path.stem
    svg_path = output_dir / f"{base_name}.svg"
    svg_path.write_text(svg_content, encoding='utf-8')
    print(f"SVG 地图已生成：{svg_path}")
    
    if not args.no_html:
        html_content = generator.generate_html(svg_content, source_json=args.source_json)
        html_path = output_dir / f"{base_name}.html"
        html_path.write_text(html_content, encoding='utf-8')
        print(f"HTML 交互地图已生成：{html_path}")


if __name__ == '__main__':
    main()
