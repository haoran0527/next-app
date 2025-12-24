# 会计应用部署�?
 
这是会计应用的完整部署包，包含所有必要的文件和脚本�?
打包时间: 20251224_144355 
 
## 快速部署步�? 
 
### 1. 系统准备 
chmod +x *.sh 
./setup-china-mirrors.sh     # 配置国内镜像�?
./add-swap.sh 4G             # 添加swap空间 
./upgrade-server.sh          # 升级Node.js�?2版本 
 
### 2. 环境配置 
cp .env.production .env      # 复制环境变量文件 
nano .env                    # 编辑环境变量 
 
### 3. 安装依赖和构�?
./install-host-deps.sh       # 安装依赖并构建应�?
 
### 4. 部署应用 
./deploy.sh --skip-pull      # 快速部署（推荐�?
# 或�?
./deploy.sh                  # 完整部署 
 
## 日常维护命令: 
 
./deploy.sh --update         # 快速更新应�?
./deploy.sh --force          # 强制重新部署 
./deploy.sh --host-deps      # 重新安装宿主机依�?
./install-host-deps.sh --force  # 强制重新安装依赖和构�?
./health-check.sh            # 检查应用健康状�?
 
## 包含的脚本说�? 
 
- deploy.sh: 主部署脚本，支持多种部署模式 
- install-host-deps.sh: 宿主机依赖安装和应用构建脚本 
- install-production-deps.sh: 纯生产环境依赖安装脚�?
- upgrade-server.sh: 服务器环境升级脚�?
- setup-china-mirrors.sh: 国内镜像源配置脚�?
- add-swap.sh: 添加swap空间脚本 
- health-check.sh: 应用健康检查脚�?
 
## 优化特�? 
 
- 宿主机依赖安装：避免容器内安装，节省内存和时�?
- 预构建应用：在宿主机完成构建，容器启动极�?
- 国内镜像源：使用npmmirror等国内源，下载更�?
- 内存优化：针对低内存服务器的特殊优化 
- 多种部署模式：支持首次部署、快速更新、强制重建等 
 
详细说明请查�?部署指南.md �?升级指南.md 文件�?
