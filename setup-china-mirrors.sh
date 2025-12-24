#!/bin/bash

# 配置国内镜像源脚本
# 用于加速Docker镜像拉取和npm包安装

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 配置国内镜像源...${NC}"

# 配置 Docker 镜像源
echo -e "${BLUE}🐳 配置 Docker 镜像源...${NC}"
sudo mkdir -p /etc/docker

# 创建 Docker daemon 配置
cat > /tmp/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo mv /tmp/daemon.json /etc/docker/daemon.json

# 重启 Docker 服务
echo -e "${BLUE}🔄 重启 Docker 服务...${NC}"
sudo systemctl daemon-reload
sudo systemctl restart docker

# 验证 Docker 配置
echo -e "${BLUE}✅ 验证 Docker 镜像源配置...${NC}"
docker info | grep -A 10 "Registry Mirrors" || echo "Docker 镜像源配置完成"

# 配置系统级 npm 镜像源 (如果有 npm)
if command -v npm >/dev/null 2>&1; then
    echo -e "${BLUE}📦 配置系统 npm 镜像源...${NC}"
    npm config set registry https://registry.npmmirror.com
    
    echo -e "${GREEN}✅ npm 镜像源配置完成${NC}"
    npm config get registry
fi

# 配置 Alpine 镜像源 (用于容器内)
echo -e "${BLUE}🏔️ 优化 Alpine 镜像源配置...${NC}"

# 更新 docker-compose.yml 中的 Alpine 源配置
if [ -f "docker-compose.yml" ]; then
    echo -e "${BLUE}📝 检查 docker-compose.yml 中的 Alpine 源配置...${NC}"
    if grep -q "dl-cdn.alpinelinux.org" docker-compose.yml; then
        echo -e "${GREEN}✅ docker-compose.yml 已包含 Alpine 源配置${NC}"
    else
        echo -e "${YELLOW}⚠️ docker-compose.yml 可能需要手动更新 Alpine 源配置${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ 未找到 docker-compose.yml 文件${NC}"
fi

# 创建 Alpine 镜像源配置脚本 (备用)
cat > alpine-mirrors.sh << 'EOF'
#!/bin/sh
# Alpine 镜像源配置脚本 (在容器内使用)
echo "配置 Alpine 镜像源..."
sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
apk update
EOF

chmod +x alpine-mirrors.sh

echo ""
echo -e "${GREEN}✅ 国内镜像源配置完成!${NC}"
echo ""
echo -e "${BLUE}📋 配置的镜像源:${NC}"
echo "  Docker: 中科大、网易、百度、腾讯云"
echo "  npm: npmmirror.com (淘宝镜像)"
echo "  Alpine: 中科大镜像 (已在 docker-compose.yml 中配置)"
echo ""
echo -e "${BLUE}💡 使用说明:${NC}"
echo "  - Docker 镜像拉取已加速"
echo "  - 容器内 npm 和 Alpine 安装已配置国内源"
echo "  - 部署时会自动使用国内镜像源"
echo ""
echo -e "${GREEN}🚀 现在可以运行部署脚本:${NC}"
echo "  ./deploy.sh    # 完整部署"
echo "  ./update-app.sh # 快速应用更新"