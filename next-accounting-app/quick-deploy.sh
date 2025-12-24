#/bin/bash 
# 快速部署脚�?- 一键完成所有部署步�?
set -e 
 
echo "🚀 开始快速部�?.." 
 
# 设置脚本权限 
chmod +x *.sh 
 
# 检查环境变量文�?
if [  -f ".env" ]; then 
  echo "⚠️ 请先配置环境变量文件:" 
  echo "  cp .env.production .env" 
  echo "  nano .env" 
  exit 1 
fi 
 
# 安装依赖和构�?
./install-host-deps.sh 
 
# 快速部�?
./deploy.sh --skip-pull 
 
echo "�?快速部署完成！" 
echo "📱 应用访问地址: http://$(hostname -I | awk '{print $1}'):3000" 
