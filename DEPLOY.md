# 部署脚本使用说明

## 概述

本项目提供了自动化部署脚本，用于将本地代码部署到生产服务器。

## 脚本说明

### 1. 本地部署脚本

- **Windows**: `deploy.bat`
- **Linux/Mac**: `deploy.sh`

功能：
- 创建代码压缩包（排除 .env、node_modules、.next、.git 等文件）
- 上传压缩包到服务器
- 触发服务器端部署脚本
- 清理本地临时文件

### 2. 服务器端部署脚本

- **文件**: `deploy-server.sh`

功能：
- 停止当前运行的服务
- 备份并恢复 .env 配置文件
- 解压新的代码
- 重新构建项目
- 启动服务

## 使用方法

### Windows 用户

在项目根目录下运行：

```bash
deploy.bat
```

### Linux/Mac 用户

在项目根目录下运行：

```bash
bash deploy.sh
```

或赋予执行权限后运行：

```bash
chmod +x deploy.sh
./deploy.sh
```

## 配置说明

### 本地脚本配置

在 `deploy.bat` 或 `deploy.sh` 中可以修改以下配置：

```bash
SERVER_IP="121.89.202.27"      # 服务器 IP 地址
SERVER_USER="root"              # SSH 用户名
SSH_KEY="C:/Users/haora/.ssh/next_app_key"  # SSH 密钥路径
SERVER_DIR="/root/next-accounting-app"       # 服务器部署目录
```

### 服务器端脚本配置

在 `deploy-server.sh` 中可以修改以下配置：

```bash
SERVER_DIR="/root/next-accounting-app"       # 服务器部署目录
ARCHIVE_NAME="/root/next-accounting-app.tar.gz"  # 压缩包路径
LOG_FILE="/tmp/accounting-app.log"            # 应用日志文件路径
```

## 部署流程

1. **创建压缩包**: 排除敏感文件和依赖，创建代码压缩包
2. **上传代码**: 使用 SCP 将压缩包上传到服务器
3. **停止服务**: 在服务器上停止当前运行的应用
4. **备份配置**: 备份现有的 .env 文件
5. **解压代码**: 解压新的代码到部署目录
6. **恢复配置**: 恢复 .env 文件（确保服务器配置不被覆盖）
7. **重新构建**: 运行 `npm run build` 重新构建项目
8. **启动服务**: 使用 `nohup npm start` 启动服务

## 注意事项

1. **环境变量**: 脚本会自动备份和恢复服务器的 .env 文件，确保本地和服务器使用不同的配置
2. **数据库**: 脚本不会修改或重新初始化数据库
3. **依赖包**: 脚本不会重新安装依赖包，确保服务器上已安装所需依赖
4. **日志**: 应用日志保存在 `/tmp/accounting-app.log`，可以使用 `tail -f /tmp/accounting-app.log` 查看实时日志

## 故障排查

### 查看服务器日志

```bash
ssh -i C:\Users\haora\.ssh\next_app_key root@121.89.202.27 "tail -f /tmp/accounting-app.log"
```

### 检查服务状态

```bash
ssh -i C:\Users\haora\.ssh\next_app_key root@121.89.202.27 "ps aux | grep -E 'node|next|npm' | grep -v grep"
```

### 手动重启服务

```bash
ssh -i C:\Users\haora\.ssh\next_app_key root@121.89.202.27 "cd /root/next-accounting-app && pkill -f 'npm start' && nohup npm start > /tmp/accounting-app.log 2>&1 &"
```

## 安全性

- SSH 密钥文件权限应设置为 600 或 400
- .env 文件包含敏感信息，不会被上传到服务器
- 压缩包中不包含 node_modules 和 .next 目录
