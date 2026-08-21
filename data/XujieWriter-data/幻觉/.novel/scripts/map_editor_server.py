#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
地图编辑服务器

功能：
1. 提供静态文件服务（HTML/SVG 地图预览）
2. 提供 /save 端点，接受 POST 请求更新 JSON 坐标

用法：
    python map_editor_server.py [--port PORT]
    
默认端口：8090
"""

import json
import os
import sys
import argparse
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote


MAP_DIR = Path(__file__).resolve().parent.parent / 'worldbuilding' / 'map'


class MapEditorHandler(SimpleHTTPRequestHandler):
    """自定义请求处理器：静态文件服务 + /save 端点"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(MAP_DIR), **kwargs)

    def do_POST(self):
        """处理 POST 请求（仅 /save）"""
        if self.path == '/save':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                data = json.loads(body)

                source = data.get('source', '')
                updates = data.get('updates', [])

                if not source or not updates:
                    self._send_json(400, {'ok': False, 'error': '缺少 source 或 updates 参数'})
                    return

                # 安全检查：防止路径遍历
                json_path = (MAP_DIR / source).resolve()
                if not str(json_path).startswith(str(MAP_DIR.resolve())):
                    self._send_json(403, {'ok': False, 'error': '非法文件路径'})
                    return

                if not json_path.exists():
                    self._send_json(404, {'ok': False, 'error': f'文件不存在：{source}'})
                    return

                # 读取 JSON
                map_data = json.loads(json_path.read_text(encoding='utf-8'))
                updated_count = 0

                for upd in updates:
                    name = upd['name']
                    x = upd['x']
                    y = upd['y']

                    # 尝试在 regions 数组中查找
                    found = False
                    if 'regions' in map_data:
                        for region in map_data['regions']:
                            if region.get('name') == name:
                                if 'coordinates' not in region:
                                    region['coordinates'] = {}
                                region['coordinates']['x'] = x
                                region['coordinates']['y'] = y
                                found = True
                                updated_count += 1
                                break

                    # 尝试在 districts 字典中查找
                    if not found and 'districts' in map_data:
                        if name in map_data['districts']:
                            if 'coordinates' not in map_data['districts'][name]:
                                map_data['districts'][name]['coordinates'] = {}
                            map_data['districts'][name]['coordinates']['x'] = x
                            map_data['districts'][name]['coordinates']['y'] = y
                            found = True
                            updated_count += 1

                    if not found:
                        print(f"  ⚠ 未找到节点：{name}")

                # 写回文件
                json_path.write_text(
                    json.dumps(map_data, ensure_ascii=False, indent=2) + '\n',
                    encoding='utf-8'
                )

                print(f"  ✅ 已保存 {updated_count}/{len(updates)} 个节点 → {source}")
                self._send_json(200, {'ok': True, 'updated': updated_count})

            except json.JSONDecodeError as e:
                self._send_json(400, {'ok': False, 'error': f'JSON 解析失败：{e}'})
            except Exception as e:
                self._send_json(500, {'ok': False, 'error': str(e)})
        else:
            self._send_json(404, {'ok': False, 'error': '未知端点'})

    def _send_json(self, code: int, data: dict):
        """发送 JSON 响应"""
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        """自定义日志格式"""
        if args[0].startswith('GET') or args[0].startswith('HEAD'):
            super().log_message(format, *args)


def main():
    parser = argparse.ArgumentParser(description='地图编辑服务器')
    parser.add_argument('--port', type=int, default=8090, help='监听端口（默认：8090）')
    args = parser.parse_args()

    os.chdir(str(MAP_DIR))

    server = HTTPServer(('0.0.0.0', args.port), MapEditorHandler)
    print(f'\n  🗺️  地图编辑服务器已启动')
    print(f'  📂 服务目录：{MAP_DIR}')
    print(f'  🌐 访问地址：http://localhost:{args.port}/world-map.html')
    print(f'  🌐 城市地图：http://localhost:{args.port}/cities/盘龙岗.html')
    print(f'  💾 保存接口：POST http://localhost:{args.port}/save')
    print(f'\n  按 Ctrl+C 停止服务器\n')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  服务器已停止')
        server.server_close()


if __name__ == '__main__':
    main()
