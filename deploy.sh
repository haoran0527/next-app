#!/bin/bash

# 本地部署脚本 - 打包并上传代码到服务器

# 配置变量
SERVER_IP="121.89.202.27"
SERVER_USER="root"
SSH_KEY="C:/Users/haora/.ssh/next_app_key"
SERVER_DIR="/root/next-accounting-app"
ARCHIVE_NAME="next-accounting-app.tar.gz"

echo "=========================================="
echo "开始部署到服务器 $SERVER_IP"
echo "=========================================="

# 检查 SSH 密钥是否存在
if [ ! -f "$SSH_KEY" ]; then
    echo "错误: SSH 密钥文件不存在: $SSH_KEY"
    exit 1
fi

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 创建压缩包（排除敏感文件和依赖）
echo "步骤 1/4: 创建代码压缩包..."
tar --exclude='.env' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='next-accounting-app.tar.gz' \
    -czf "$ARCHIVE_NAME" .

if [ $? -ne 0 ]; then
    echo "错误: 创建压缩包失败"
    exit 1
fi

echo "压缩包创建成功: $ARCHIVE_NAME"

# 上传压缩包到服务器
echo "步骤 2/4: 上传压缩包到服务器..."
scp -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    "$ARCHIVE_NAME" \
    "${SERVER_USER}@${SERVER_IP}:/root/"

if [ $? -ne 0 ]; then
    echo "错误: 上传压缩包失败"
    exit 1
fi

echo "上传成功"

# 在服务器上执行部署脚本
echo "步骤 3/4: 在服务器上执行部署..."
ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    "${SERVER_USER}@${SERVER_IP}" \
    "bash $SERVER_DIR/deploy-server.sh"

if [ $? -ne 0 ]; then
    echo "错误: 服务器部署失败"
    exit 1
fi

# 清理本地压缩包
echo "步骤 4/4: 清理本地文件..."
rm -f "$ARCHIVE_NAME"

echo "=========================================="
echo "部署完成！"
echo "=========================================="
