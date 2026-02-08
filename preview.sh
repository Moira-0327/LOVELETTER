#!/bin/bash

# LOVE LETTER - 本地预览脚本
# 快速预览构建后的网站

set -e

echo "🎀 Love Letter - 本地预览"
echo ""

# 检查是否已经构建
if [ ! -d "docs" ] || [ ! -f "docs/index.html" ]; then
  echo "⚠️  未找到构建文件，正在构建..."
  npm run build
  echo ""
fi

echo "🚀 启动预览服务器..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 预览地址："
echo "   http://localhost:4173/LOVELETTER/"
echo ""
echo "💡 提示："
echo "   - 按 Ctrl+C 停止服务器"
echo "   - 如需重新构建，运行: npm run build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run preview
