#!/bin/bash

# 添加大容量 swap 空间脚本 (用于极低内存服务器)

set -e

SWAP_SIZE=${1:-4G}  # 默认 4GB swap (2GB内存服务器建议4GB swap)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}💾 为极低内存服务器添加 ${SWAP_SIZE} swap 空间...${NC}"

# 检查是否已有 swap
if swapon --show | grep -q "/swapfile"; then
    echo -e "${YELLOW}⚠️ 已存在 swap 文件${NC}"
    swapon --show
    read -p "是否要重新创建更大的swap? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🗑️ 删除现有 swap...${NC}"
        sudo swapoff /swapfile
        sudo rm -f /swapfile
    else
        exit 0
    fi
fi

# 检查磁盘空间
AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
SWAP_SIZE_KB=$(echo $SWAP_SIZE | sed 's/G//' | awk '{print $1 * 1024 * 1024}')

if [ $AVAILABLE_SPACE -lt $SWAP_SIZE_KB ]; then
    echo -e "${RED}❌ 磁盘空间不足，无法创建 ${SWAP_SIZE} swap${NC}"
    echo "可用空间: $(($AVAILABLE_SPACE / 1024 / 1024))GB"
    exit 1
fi

# 停止所有不必要的服务释放内存
echo -e "${BLUE}🛑 停止不必要的服务...${NC}"
sudo systemctl stop snapd 2>/dev/null || true
sudo systemctl stop unattended-upgrades 2>/dev/null || true
sudo systemctl stop packagekit 2>/dev/null || true

# 创建 swap 文件
echo -e "${BLUE}📝 创建 ${SWAP_SIZE} swap 文件...${NC}"
sudo fallocate -l $SWAP_SIZE /swapfile

# 设置权限
echo -e "${BLUE}🔒 设置 swap 文件权限...${NC}"
sudo chmod 600 /swapfile

# 格式化为 swap
echo -e "${BLUE}🔧 格式化 swap 文件...${NC}"
sudo mkswap /swapfile

# 启用 swap
echo -e "${BLUE}🚀 启用 swap...${NC}"
sudo swapon /swapfile

# 验证 swap
echo -e "${BLUE}✅ 验证 swap 状态:${NC}"
swapon --show
free -h

# 添加到 fstab 使其永久生效
if ! grep -q "/swapfile" /etc/fstab; then
    echo -e "${BLUE}📋 添加到 /etc/fstab...${NC}"
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 激进优化 swap 使用 (更积极地使用swap)
echo -e "${BLUE}⚙️ 激进优化 swap 设置...${NC}"
# 移除旧的设置
sudo sed -i '/vm.swappiness/d' /etc/sysctl.conf
sudo sed -i '/vm.vfs_cache_pressure/d' /etc/sysctl.conf
sudo sed -i '/vm.dirty_ratio/d' /etc/sysctl.conf
sudo sed -i '/vm.dirty_background_ratio/d' /etc/sysctl.conf

# 添加新的激进设置
echo 'vm.swappiness=60' | sudo tee -a /etc/sysctl.conf  # 更积极使用swap
echo 'vm.vfs_cache_pressure=200' | sudo tee -a /etc/sysctl.conf  # 更积极回收缓存
echo 'vm.dirty_ratio=5' | sudo tee -a /etc/sysctl.conf  # 减少脏页缓存
echo 'vm.dirty_background_ratio=2' | sudo tee -a /etc/sysctl.conf

# 应用设置
sudo sysctl vm.swappiness=60
sudo sysctl vm.vfs_cache_pressure=200
sudo sysctl vm.dirty_ratio=5
sudo sysctl vm.dirty_background_ratio=2

echo ""
echo -e "${GREEN}✅ 大容量 Swap 空间添加完成!${NC}"
echo -e "${BLUE}📊 当前内存状态:${NC}"
free -h

echo ""
echo -e "${BLUE}💡 极低内存服务器优化说明:${NC}"
echo "  - Swap 文件: /swapfile"
echo "  - 大小: $SWAP_SIZE"
echo "  - Swappiness: 60 (积极使用 swap)"
echo "  - 缓存压力: 200 (积极回收缓存)"
echo "  - 已添加到 /etc/fstab (重启后自动挂载)"
echo ""
echo -e "${YELLOW}⚠️ 注意: 由于使用了激进的swap设置，系统可能会较慢但更稳定${NC}"