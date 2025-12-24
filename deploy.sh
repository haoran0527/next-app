#!/bin/bash

# 简化部署脚本 - 只启动数据库，应用在宿主机运行

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 检查 Docker 权限
if ! docker ps >/dev/null 2>&1; then
    COMPOSE_CMD="sudo docker compose"
else
    COMPOSE_CMD="docker compose"
fi

echo -e "${BLUE}🚀 部署会计应用（数据库模式）${NC}"
echo -e "${CYAN}使用命令: $COMPOSE_CMD${NC}"
echo ""

# 检查必要文件
echo -e "${BLUE}📋 检查必要文件${NC}"
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ 未找到docker-compose.yml${NC}"
    exit 1
fi

if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        echo -e "${YELLOW}⚠️ 复制 .env.production 到 .env${NC}"
        cp .env.production .env
    else
        echo -e "${RED}❌ 未找到环境变量文件${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ 文件检查通过${NC}"

# 启动数据库
echo -e "${BLUE}🗄️ 启动PostgreSQL数据库${NC}"
$COMPOSE_CMD up -d postgres

# 等待数据库就绪
echo -e "${BLUE}⏳ 等待数据库就绪${NC}"
for i in {1..30}; do
    if $COMPOSE_CMD exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 数据库启动成功${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 数据库启动超时${NC}"
        $COMPOSE_CMD logs postgres
        exit 1
    fi
    echo "等待数据库... ($i/30)"
    sleep 2
done

# 显示状态
echo -e "${BLUE}🔍 检查服务状态${NC}"
$COMPOSE_CMD ps

echo ""
echo -e "${GREEN}✅ 数据库部署完成！${NC}"
echo ""
echo -e "${BLUE}💡 接下来的步骤：${NC}"
echo -e "  1. ${CYAN}./install-host-deps.sh${NC}  # 安装依赖和构建应用"
echo -e "  2. ${CYAN}./start-app.sh${NC}          # 启动应用"
echo ""
echo -e "${YELLOW}📝 注意事项：${NC}"
echo -e "  - 数据库运行在Docker容器中（端口5432）"
echo -e "  - 应用将在宿主机运行（端口3000）"
echo -e "  - 这样避免了容器内的依赖问题"