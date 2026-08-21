#!/bin/bash
# 博客文章脚手架
# 用法：bash new-blog-post.sh "文章标题" "标签1,标签2,标签3"
# 在 data/blog-posts/ 下创建带 YAML frontmatter 模板的空 .md 文件

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOG_DIR="$SCRIPT_DIR/../../data/blog-posts"

# 参数检查
if [ $# -lt 1 ]; then
  echo "用法: bash new-blog-post.sh \"文章标题\" [\"标签1,标签2\"]"
  echo "示例: bash new-blog-post.sh \"从零搭建 AI Agent 协作工作室\" \"架构设计,Agent协作\""
  exit 1
fi

TITLE="$1"
TAGS="${2:-}"

# 生成日期
DATE=$(date +%Y-%m-%d)

# 获取最大序号
max_num=0
for f in "$BLOG_DIR"/*.md; do
  [ -e "$f" ] || continue
  basename=$(basename "$f" .md)
  num=$(echo "$basename" | grep -oP '^\d+' || echo "0")
  num=$((10#$num))
  if [ "$num" -gt "$max_num" ]; then
    max_num=$num
  fi
done

next_num=$((max_num + 1))
padded_num=$(printf "%02d" $next_num)

# 生成 slug (从标题简化)
slug=$(echo "$TITLE" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null | sed 's/[^a-zA-Z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//' | tr '[:upper:]' '[:lower:]')
# 如果 slug 太长，截取前 50 个字符
slug=$(echo "$slug" | cut -c1-50)
# 如果 slug 为空，使用默认值
[ -z "$slug" ] && slug="new-post"

FILENAME="${padded_num}-${slug}.md"
FILEPATH="$BLOG_DIR/$FILENAME"

# 检查文件是否已存在
if [ -f "$FILEPATH" ]; then
  echo "错误: 文件已存在: $FILEPATH"
  exit 1
fi

# 格式化标签
if [ -n "$TAGS" ]; then
  TAGS_JSON=$(echo "$TAGS" | sed 's/, */", "/g' | sed 's/^/["/' | sed 's/$/"]/')
else
  TAGS_JSON="[]"
fi

# 创建文件
mkdir -p "$BLOG_DIR"
cat > "$FILEPATH" << EOF
---
title: "$TITLE"
date: "$DATE"
summary: "TODO: 写一句摘要（20-50字）"
tags: $TAGS_JSON
---

# $TITLE

TODO: 正文内容

## 背景

TODO: 为什么写这篇文章？问题的背景是什么？

## 方案

TODO: 技术方案、实现思路、关键决策

## 实践

TODO: 具体怎么做？代码示例、截图

## 总结

TODO: 收获、踩坑、下一步计划
EOF

echo "✅ 博客文章已创建: $FILEPATH"
echo ""
echo "下一步："
echo "  1. 编辑文件: 填写 summary 和正文内容"
echo "  2. 更新索引: 在 data/blog-posts/INDEX.md 中添加新条目"
echo "  3. 构建发布: cd website && npm run build"
