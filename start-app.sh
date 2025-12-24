#!/bin/bash

# 宿主机启动应用脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🚀 启动会计应用${NC}"
echo ""

# 检查依赖
echo -e "${BLUE}📋 检查环境${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ 未找到node_modules，请先运行: ./install-host-deps.sh${NC}"
    exit 1
fi

if [ ! -d ".next" ]; then
    echo -e "${RED}❌ 未找到构建产物，请先运行: ./install-host-deps.sh${NC}"
    exit 1
fi

if [ ! -d "node_modules/.prisma" ]; then
    echo -e "${RED}❌ 未找到Prisma客户端，请先运行: ./install-host-deps.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境检查通过${NC}"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        echo -e "${YELLOW}⚠️ 复制 .env.production 到 .env${NC}"
        cp .env.production .env
    else
        echo -e "${RED}❌ 未找到环境变量文件${NC}"
        exit 1
    fi
fi

# 设置环境变量
export NODE_ENV=production
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/accounting_app?schema=public"

# 检查数据库连接
echo -e "${BLUE}🗄️ 检查数据库连接${NC}"
if ! npx prisma db push --accept-data-loss --skip-generate >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ 数据库连接失败，请确保数据库已启动${NC}"
    echo -e "${CYAN}💡 运行: docker compose up -d postgres${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 数据库连接正常${NC}"

# 运行数据库迁移
echo -e "${BLUE}🗄️ 运行数据库迁移${NC}"
npx prisma migrate deploy

# 运行数据库种子（可选）
echo -e "${BLUE}🌱 运行数据库种子${NC}"
npm run db:seed || echo -e "${YELLOW}⚠️ 数据库种子运行失败，可能已存在数据${NC}"

# 启动应用
echo -e "${BLUE}🚀 启动Next.js应用${NC}"
echo -e "${GREEN}📱 应用将在 http://localhost:3000 启动${NC}"
echo ""

# 启动应用
npm start