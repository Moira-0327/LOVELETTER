#!/bin/bash

# LOVE LETTER - 网页部署脚本
# 这个脚本会自动构建项目并部署到 GitHub Pages

set -e  # 遇到错误立即退出

echo "🎀 开始部署 Love Letter 网页..."

# 1. 清理旧的构建文件
echo "📁 清理旧的构建文件..."
if [ -d "docs" ]; then
  rm -rf docs/*
fi

# 2. 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  npm install
fi

# 3. 构建项目
echo "🔨 构建项目..."
npm run build

# 4. 检查构建结果
if [ -d "docs" ] && [ -f "docs/index.html" ]; then
  echo "✅ 构建成功！"
  echo "📂 构建文件位于: docs/"
  echo ""
  echo "生成的文件:"
  ls -lh docs/
  echo ""
else
  echo "❌ 构建失败！未找到 docs/index.html"
  exit 1
fi

# 5. 提示后续步骤
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 部署准备完成！"
echo ""
echo "下一步操作："
echo "1. 提交更改到 git："
echo "   git add ."
echo "   git commit -m \"Build and deploy Love Letter\""
echo "   git push origin claude/love-letter-web-deploy-iCE8b"
echo ""
echo "2. GitHub Actions 会自动将网站部署到 GitHub Pages"
echo ""
echo "3. 本地预览构建结果："
echo "   npm run preview"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
