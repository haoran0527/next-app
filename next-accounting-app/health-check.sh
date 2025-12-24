#!/bin/bash

# 简单健康检查脚本

set -e

COMPOSE_FILE="docker-compose.yml"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 开始健康检查...${NC}"

# 检查 Docker 权限和版本 (强制使用 v2)
if ! docker ps >/dev/null 2>&1; then
    COMPOSE_CMD="sudo docker compose"
else
    COMPOSE_CMD="docker compose"
fi

# 检查容器状态
echo -e "${BLUE}📋 检查容器状态...${NC}"
if ! $COMPOSE_CMD ps | grep -q "Up"; then
    echo -e "${RED}❌ 部分容器未运行${NC}"
    $COMPOSE_CMD ps
    exit 1
else
    echo -e "${GREEN}✅ 所有容器正在运行${NC}"
fi

# 检查数据库连接
echo -e "${BLUE}🗄️ 检查数据库连接...${NC}"
if ! $COMPOSE_CMD exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${RED}❌ 数据库连接失败${NC}"
    exit 1
else
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
fi

# 检查应用响应
echo -e "${BLUE}🌐 检查应用响应...${NC}"
if ! curl -f -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ 应用无响应${NC}"
    exit 1
else
    echo -e "${GREEN}✅ 应用响应正常${NC}"
fi

# 检查内存使用
echo -e "${BLUE}💾 内存使用情况:${NC}"
free -h

echo ""
echo -e "${GREEN}✅ 健康检查完成 - 所有服务正常运行${NC}"
echo -e "${GREEN}📱 应用访问地址: http://121.89.202.27:3000${NC}"