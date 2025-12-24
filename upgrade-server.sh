#!/bin/bash

# 服务器依赖升级脚本
# 用于升级系统依赖、Docker、Node.js等环境
# 使用方法: ./upgrade-server.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 开始服务器依赖升级...${NC}"

# 检查是否为root用户或有sudo权限
if [[ $EUID -eq 0 ]]; then
    SUDO=""
else
    SUDO="sudo"
    if ! sudo -n true 2>/dev/null; then
        echo -e "${RED}❌ 需要sudo权限来升级系统依赖${NC}"
        exit 1
    fi
fi

# 检测操作系统类型
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
elif type lsb_release >/dev/null 2>&1; then
    OS=$(lsb_release -si)
    VER=$(lsb_release -sr)
else
    OS=$(uname -s)
    VER=$(uname -r)
fi

# 显示当前系统信息
echo -e "${BLUE}📊 当前系统信息:${NC}"
echo "操作系统: $OS $VER"
echo "内核版本: $(uname -r)"
echo "总内存: $(free -h | awk 'NR==2{print $2}')"
echo "可用内存: $(free -h | awk 'NR==2{print $7}')"

# 检查当前Docker版本
if command -v docker >/dev/null 2>&1; then
    echo "Docker版本: $(docker --version)"
else
    echo "Docker: 未安装"
fi

# 检查当前Node.js版本（如果安装了）
if command -v node >/dev/null 2>&1; then
    echo "Node.js版本: $(node --version)"
else
    echo "Node.js: 未安装"
fi

echo ""

# 根据操作系统选择包管理器
if [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]] || [[ "$OS" == *"AlmaLinux"* ]]; then
    PKG_MANAGER="yum"
    if command -v dnf >/dev/null 2>&1; then
        PKG_MANAGER="dnf"
    fi
    INSTALL_CMD="$PKG_MANAGER install -y"
    UPDATE_CMD="$PKG_MANAGER update -y"
    EPEL_RELEASE="epel-release"
elif [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    PKG_MANAGER="apt"
    INSTALL_CMD="apt install -y"
    UPDATE_CMD="apt update && apt upgrade -y"
    EPEL_RELEASE=""
else
    echo -e "${RED}❌ 不支持的操作系统: $OS${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 检测到包管理器: $PKG_MANAGER${NC}"

# 1. 更新系统包管理器
echo -e "${BLUE}📦 更新系统包管理器...${NC}"
if [[ "$PKG_MANAGER" == "apt" ]]; then
    $SUDO apt update
else
    $SUDO $PKG_MANAGER makecache
fi

# 2. 升级系统包
echo -e "${BLUE}⬆️ 升级系统包...${NC}"
$SUDO $UPDATE_CMD

# 3. 安装EPEL仓库（CentOS/RHEL需要）
if [[ "$PKG_MANAGER" != "apt" ]] && [[ -n "$EPEL_RELEASE" ]]; then
    echo -e "${BLUE}📦 安装EPEL仓库...${NC}"
    $SUDO $INSTALL_CMD $EPEL_RELEASE || true
fi

# 4. 安装必要的系统依赖
echo -e "${BLUE}🔧 安装必要的系统依赖...${NC}"
if [[ "$PKG_MANAGER" == "apt" ]]; then
    $SUDO $INSTALL_CMD \
        curl \
        wget \
        gnupg \
        lsb-release \
        ca-certificates \
        software-properties-common \
        apt-transport-https \
        build-essential \
        git \
        unzip \
        htop \
        nano \
        vim
else
    $SUDO $INSTALL_CMD \
        curl \
        wget \
        gnupg2 \
        ca-certificates \
        yum-utils \
        device-mapper-persistent-data \
        lvm2 \
        gcc \
        gcc-c++ \
        make \
        git \
        unzip \
        htop \
        nano \
        vim
fi

# 5. 升级Docker
echo -e "${BLUE}🐳 升级Docker...${NC}"

# 检查Docker是否已安装
if command -v docker >/dev/null 2>&1; then
    echo "检测到已安装Docker，正在升级..."
    
    # 停止Docker服务
    $SUDO systemctl stop docker || true
    
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        # Ubuntu/Debian Docker安装
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
        $SUDO apt update
        $SUDO $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    else
        # CentOS/RHEL Docker安装
        $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
        $SUDO $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
    
    # 启动Docker服务
    $SUDO systemctl start docker
    $SUDO systemctl enable docker
    
else
    echo "Docker未安装，正在安装最新版本..."
    
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        # Ubuntu/Debian Docker安装
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
        $SUDO apt update
        $SUDO $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    else
        # CentOS/RHEL Docker安装
        $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
        $SUDO $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
    
    # 启动Docker服务
    $SUDO systemctl start docker
    $SUDO systemctl enable docker
    
    # 将当前用户添加到docker组
    $SUDO usermod -aG docker $USER
    echo -e "${YELLOW}⚠️ 请注销并重新登录以使Docker组权限生效${NC}"
fi

# 6. 安装/升级Node.js (使用NodeSource仓库)
echo -e "${BLUE}📦 升级Node.js到最新LTS版本...${NC}"

if [[ "$PKG_MANAGER" == "apt" ]]; then
    # Ubuntu/Debian Node.js安装
    curl -fsSL https://deb.nodesource.com/setup_lts.x | $SUDO -E bash -
    $SUDO $INSTALL_CMD nodejs
else
    # CentOS/RHEL Node.js安装
    curl -fsSL https://rpm.nodesource.com/setup_lts.x | $SUDO bash -
    $SUDO $INSTALL_CMD nodejs
fi

# 7. 升级npm到最新版本
echo -e "${BLUE}📦 升级npm到最新版本...${NC}"
$SUDO npm install -g npm@latest

# 8. 清理系统
echo -e "${BLUE}🧹 清理系统...${NC}"
if [[ "$PKG_MANAGER" == "apt" ]]; then
    $SUDO apt autoremove -y
    $SUDO apt autoclean
else
    $SUDO $PKG_MANAGER autoremove -y
    $SUDO $PKG_MANAGER clean all
fi

# 8. 清理Docker系统
echo -e "${BLUE}🧹 清理Docker系统...${NC}"
docker system prune -f || true

# 9. 优化系统内存设置（针对低内存服务器）
echo -e "${BLUE}⚡ 优化系统内存设置...${NC}"

# 创建或更新swap文件（如果内存小于2GB）
TOTAL_MEM=$(free -m | awk 'NR==2{printf "%d", $2}')
if [ $TOTAL_MEM -lt 2048 ]; then
    echo "检测到低内存系统($TOTAL_MEM MB)，配置swap..."
    
    # 检查是否已有swap
    if ! swapon --show | grep -q "/swapfile"; then
        # 创建2GB swap文件
        $SUDO fallocate -l 2G /swapfile || $SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048
        $SUDO chmod 600 /swapfile
        $SUDO mkswap /swapfile
        $SUDO swapon /swapfile
        
        # 添加到fstab以持久化
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab
        fi
        
        echo "✅ Swap文件创建完成"
    else
        echo "✅ Swap已存在"
    fi
    
    # 优化swap使用策略
    if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
        echo 'vm.swappiness=10' | $SUDO tee -a /etc/sysctl.conf
    fi
    if ! grep -q "vm.vfs_cache_pressure" /etc/sysctl.conf; then
        echo 'vm.vfs_cache_pressure=50' | $SUDO tee -a /etc/sysctl.conf
    fi
fi

# 10. 配置Docker内存限制
echo -e "${BLUE}🐳 配置Docker内存优化...${NC}"
$SUDO mkdir -p /etc/docker
cat << EOF | $SUDO tee /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

# 重启Docker服务
$SUDO systemctl restart docker

# 11. 显示升级后的版本信息
echo ""
echo -e "${GREEN}✅ 升级完成！${NC}"
echo ""
echo -e "${BLUE}📊 升级后的版本信息:${NC}"
echo "操作系统: $OS $VER"
echo "Docker版本: $(docker --version)"
echo "Docker Compose版本: $(docker compose version)"
echo "Node.js版本: $(node --version)"
echo "npm版本: $(npm --version)"
echo ""

# 显示内存信息
echo -e "${BLUE}📊 当前内存使用情况:${NC}"
free -h
echo ""

# 显示swap信息
echo -e "${BLUE}📊 Swap使用情况:${NC}"
swapon --show
echo ""

# 12. 重要提示
echo -e "${YELLOW}⚠️ 重要提示:${NC}"
echo "1. 如果这是首次安装Docker，请注销并重新登录以使用户组权限生效"
echo "2. 建议重启服务器以确保所有更改生效: sudo reboot"
echo "3. 重启后可以运行 ./deploy.sh 来部署应用"
echo ""

# 13. 询问是否立即重启
read -p "是否现在重启服务器？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔄 正在重启服务器...${NC}"
    $SUDO reboot
else
    echo -e "${GREEN}✅ 升级完成！请稍后手动重启服务器。${NC}"
fi