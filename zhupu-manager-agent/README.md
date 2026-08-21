# 🏛️ Zhupu Manager Agent — 族谱管理 Agent

数字化家族成员管理、族谱树构建、家族关系查询与可视化。

## 快速开始

```bash
# 1. 初始化一个新家族
./zhupu-manager-agent/zhupu-manager-agent init 张家 --description "江苏苏州张氏"

# 2. 交互式添加成员
./zhupu-manager-agent/zhupu-manager-agent add-interactive 张家

# 3. 查看关系树
./zhupu-manager-agent/zhupu-manager-agent tree 张家

# 4. 查询成员
./zhupu-manager-agent/zhupu-manager-agent query 张家 --list

# 5. 导出族谱
./zhupu-manager-agent/zhupu-manager-agent export 张家 --format markdown
```

## 命令列表

| 命令 | 说明 |
|------|------|
| `init` | 初始化新家族 |
| `add` | 添加家族成员（参数模式） |
| `add-interactive` | 添加家族成员（交互模式） |
| `query` | 查询成员（按姓名/辈分/ID） |
| `tree` | 关系树可视化 |
| `export` | 导出族谱（JSON/Markdown/Text） |
| `stats` | 家族统计分析 |
| `motto` | 设置家训 |
| `list` | 列出所有家族 |

## 目录结构

```
zhupu-manager-agent/
├── AGENTS.md              # Agent 核心定义
├── zhupu-manager-agent    # CLI 入口
├── README.md              # 本文件
├── knowledge-base/        # 知识库
└── scripts/               # 核心脚本
    ├── init-family.js     # 初始化家族
    ├── add-member.js      # 添加成员
    ├── query.js           # 查询
    ├── tree.js            # 关系树
    ├── export.js          # 导出 + 家训
    └── stats.js           # 统计

data/Zhupu-data/           # 族谱数据
├── INDEX.md               # 索引文件
└── {家族名}/               # 每家族独立目录
    ├── 族谱.json           # 核心数据
    ├── 家训.md             # 家训
    └── export/            # 导出文件
```
