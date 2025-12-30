#!/bin/bash

# 服务器端部署脚本 - 解压、重新编译并启动服务

# 配置变量
SERVER_DIR="/root/next-accounting-app"
ARCHIVE_NAME="/root/next-accounting-app.tar.gz"
LOG_FILE="/tmp/accounting-app.log"

echo "=========================================="
echo "服务器端部署开始"
echo "=========================================="

# 检查压缩包是否存在
if [ ! -f "$ARCHIVE_NAME" ]; then
    echo "错误: 压缩包不存在: $ARCHIVE_NAME"
    exit 1
fi

# 停止当前运行的服务
echo "步骤 1/5: 停止当前服务..."
pkill -f "npm start" || true
sleep 2

# 备份当前的 .env 文件（如果存在）
echo "步骤 2/5: 备份配置文件..."
if [ -f "$SERVER_DIR/.env" ]; then
    cp "$SERVER_DIR/.env" "/tmp/.env.backup"
    echo ".env 文件已备份"
fi

# 解压新的代码
echo "步骤 3/5: 解压代码..."
cd /root

# 备份当前代码目录
if [ -d "$SERVER_DIR" ]; then
    mv "$SERVER_DIR" "${SERVER_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 创建新的代码目录
mkdir -p "$SERVER_DIR"

# 解压到新目录
tar -xzf "$ARCHIVE_NAME" -C "$SERVER_DIR"

if [ $? -ne 0 ]; then
    echo "错误: 解压失败"
    # 尝试恢复备份
    if [ -d "${SERVER_DIR}.backup."* ]; then
        mv "${SERVER_DIR}.backup."* "$SERVER_DIR"
    fi
    exit 1
fi

echo "解压成功"

# 恢复 .env 文件
echo "步骤 4/6: 恢复配置文件..."
if [ -f "/tmp/.env.backup" ]; then
    cp "/tmp/.env.backup" "$SERVER_DIR/.env"
    echo ".env 文件已恢复"
fi

# 安装依赖
echo "步骤 5/6: 安装依赖..."
cd "$SERVER_DIR"
npm install

if [ $? -ne 0 ]; then
    echo "错误: 依赖安装失败"
    exit 1
fi

echo "依赖安装成功"

# 执行数据库迁移
echo "步骤 6/7: 执行数据库迁移..."
cd "$SERVER_DIR"
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "警告: 数据库迁移失败，但继续构建..."
fi

# 重新生成 Prisma Client
echo "步骤 7/8: 重新生成 Prisma Client..."
cd "$SERVER_DIR"
npx prisma generate

if [ $? -ne 0 ]; then
    echo "错误: Prisma Client 生成失败"
    exit 1
fi

echo "Prisma Client 生成成功"

# 重新构建项目
echo "步骤 8/8: 重新构建项目..."
cd "$SERVER_DIR"
npm run build

if [ $? -ne 0 ]; then
    echo "错误: 构建失败"
    exit 1
fi

echo "构建成功"

# 启动服务
echo "启动服务..."
nohup npm start > "$LOG_FILE" 2>&1 &

# 等待服务启动
sleep 5

# 检查服务是否运行
if pgrep -f "npm start" > /dev/null; then
    echo "=========================================="
    echo "部署完成！服务已启动"
    echo "=========================================="
    echo "查看日志: tail -f $LOG_FILE"
else
    echo "=========================================="
    echo "警告: 服务可能未正常启动"
    echo "=========================================="
    echo "查看日志: tail -20 $LOG_FILE"
    exit 1
fi
