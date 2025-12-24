@echo off
REM 打包部署文件脚本 - 包含所有部署需要的代码和脚本

setlocal enabledelayedexpansion

set PACKAGE_NAME=next-accounting-app
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo 📦 开始打包部署文件...

REM 创建临时目录
if exist "%PACKAGE_NAME%" rmdir /s /q "%PACKAGE_NAME%"
mkdir "%PACKAGE_NAME%"

echo 📁 复制必要文件...

REM 复制源代码 (排除不必要的文件)
xcopy /E /I /Q src "%PACKAGE_NAME%\src"
xcopy /E /I /Q prisma "%PACKAGE_NAME%\prisma"
xcopy /E /I /Q public "%PACKAGE_NAME%\public"

REM 复制配置文件
copy package.json "%PACKAGE_NAME%\"
copy package-lock.json "%PACKAGE_NAME%\"
copy next.config.ts "%PACKAGE_NAME%\"
copy tsconfig.json "%PACKAGE_NAME%\"
copy postcss.config.mjs "%PACKAGE_NAME%\" 2>nul
copy components.json "%PACKAGE_NAME%\" 2>nul
copy .prettierrc "%PACKAGE_NAME%\" 2>nul
copy .prettierignore "%PACKAGE_NAME%\" 2>nul
copy eslint.config.mjs "%PACKAGE_NAME%\" 2>nul
copy vitest.config.ts "%PACKAGE_NAME%\" 2>nul
copy prisma.config.ts "%PACKAGE_NAME%\" 2>nul
copy .lintstagedrc.json "%PACKAGE_NAME%\" 2>nul
copy next-env.d.ts "%PACKAGE_NAME%\" 2>nul

REM 复制 Docker 和部署配置文件
copy docker-compose.yml "%PACKAGE_NAME%\"
copy Dockerfile "%PACKAGE_NAME%\" 2>nul
copy .dockerignore "%PACKAGE_NAME%\"
copy nginx.conf "%PACKAGE_NAME%\"
copy init-db.sql "%PACKAGE_NAME%\"
copy .env.production "%PACKAGE_NAME%\"

REM 复制所有部署脚本
copy deploy.sh "%PACKAGE_NAME%\"
copy install-host-deps.sh "%PACKAGE_NAME%\"
copy install-production-deps.sh "%PACKAGE_NAME%\"
copy build-app.sh "%PACKAGE_NAME%\" 2>nul
copy upgrade-server.sh "%PACKAGE_NAME%\"
copy setup-china-mirrors.sh "%PACKAGE_NAME%\"
copy health-check.sh "%PACKAGE_NAME%\"
copy add-swap.sh "%PACKAGE_NAME%\"

REM 复制文档文件
copy "部署指南.md" "%PACKAGE_NAME%\"
copy "升级指南.md" "%PACKAGE_NAME%\"
copy README.md "%PACKAGE_NAME%\" 2>nul

REM 复制 Git 忽略文件（参考用）
copy .gitignore "%PACKAGE_NAME%\" 2>nul

REM 创建详细的 README
echo # 会计应用部署包 > "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo 这是会计应用的完整部署包，包含所有必要的文件和脚本。 >> "%PACKAGE_NAME%\README.txt"
echo 打包时间: %TIMESTAMP% >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ## 快速部署步骤: >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ### 1. 系统准备 >> "%PACKAGE_NAME%\README.txt"
echo chmod +x *.sh >> "%PACKAGE_NAME%\README.txt"
echo ./setup-china-mirrors.sh     # 配置国内镜像源 >> "%PACKAGE_NAME%\README.txt"
echo ./add-swap.sh 4G             # 添加swap空间 >> "%PACKAGE_NAME%\README.txt"
echo ./upgrade-server.sh          # 升级Node.js到22版本 >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ### 2. 环境配置 >> "%PACKAGE_NAME%\README.txt"
echo cp .env.production .env      # 复制环境变量文件 >> "%PACKAGE_NAME%\README.txt"
echo nano .env                    # 编辑环境变量 >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ### 3. 安装依赖和构建 >> "%PACKAGE_NAME%\README.txt"
echo ./install-host-deps.sh       # 安装依赖并构建应用 >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ### 4. 部署应用 >> "%PACKAGE_NAME%\README.txt"
echo ./deploy.sh --skip-pull      # 快速部署（推荐） >> "%PACKAGE_NAME%\README.txt"
echo # 或者 >> "%PACKAGE_NAME%\README.txt"
echo ./deploy.sh                  # 完整部署 >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ## 日常维护命令: >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ./deploy.sh --update         # 快速更新应用 >> "%PACKAGE_NAME%\README.txt"
echo ./deploy.sh --force          # 强制重新部署 >> "%PACKAGE_NAME%\README.txt"
echo ./deploy.sh --host-deps      # 重新安装宿主机依赖 >> "%PACKAGE_NAME%\README.txt"
echo ./install-host-deps.sh --force  # 强制重新安装依赖和构建 >> "%PACKAGE_NAME%\README.txt"
echo ./health-check.sh            # 检查应用健康状态 >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ## 包含的脚本说明: >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo - deploy.sh: 主部署脚本，支持多种部署模式 >> "%PACKAGE_NAME%\README.txt"
echo - install-host-deps.sh: 宿主机依赖安装和应用构建脚本 >> "%PACKAGE_NAME%\README.txt"
echo - install-production-deps.sh: 纯生产环境依赖安装脚本 >> "%PACKAGE_NAME%\README.txt"
echo - upgrade-server.sh: 服务器环境升级脚本 >> "%PACKAGE_NAME%\README.txt"
echo - setup-china-mirrors.sh: 国内镜像源配置脚本 >> "%PACKAGE_NAME%\README.txt"
echo - add-swap.sh: 添加swap空间脚本 >> "%PACKAGE_NAME%\README.txt"
echo - health-check.sh: 应用健康检查脚本 >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo ## 优化特性: >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo - 宿主机依赖安装：避免容器内安装，节省内存和时间 >> "%PACKAGE_NAME%\README.txt"
echo - 预构建应用：在宿主机完成构建，容器启动极快 >> "%PACKAGE_NAME%\README.txt"
echo - 国内镜像源：使用npmmirror等国内源，下载更快 >> "%PACKAGE_NAME%\README.txt"
echo - 内存优化：针对低内存服务器的特殊优化 >> "%PACKAGE_NAME%\README.txt"
echo - 多种部署模式：支持首次部署、快速更新、强制重建等 >> "%PACKAGE_NAME%\README.txt"
echo. >> "%PACKAGE_NAME%\README.txt"
echo 详细说明请查看 部署指南.md 和 升级指南.md 文件。 >> "%PACKAGE_NAME%\README.txt"

REM 创建快速部署脚本
echo #!/bin/bash > "%PACKAGE_NAME%\quick-deploy.sh"
echo # 快速部署脚本 - 一键完成所有部署步骤 >> "%PACKAGE_NAME%\quick-deploy.sh"
echo set -e >> "%PACKAGE_NAME%\quick-deploy.sh"
echo. >> "%PACKAGE_NAME%\quick-deploy.sh"
echo echo "🚀 开始快速部署..." >> "%PACKAGE_NAME%\quick-deploy.sh"
echo. >> "%PACKAGE_NAME%\quick-deploy.sh"
echo # 设置脚本权限 >> "%PACKAGE_NAME%\quick-deploy.sh"
echo chmod +x *.sh >> "%PACKAGE_NAME%\quick-deploy.sh"
echo. >> "%PACKAGE_NAME%\quick-deploy.sh"
echo # 检查环境变量文件 >> "%PACKAGE_NAME%\quick-deploy.sh"
echo if [ ! -f ".env" ]; then >> "%PACKAGE_NAME%\quick-deploy.sh"
echo   echo "⚠️ 请先配置环境变量文件:" >> "%PACKAGE_NAME%\quick-deploy.sh"
echo   echo "  cp .env.production .env" >> "%PACKAGE_NAME%\quick-deploy.sh"
echo   echo "  nano .env" >> "%PACKAGE_NAME%\quick-deploy.sh"
echo   exit 1 >> "%PACKAGE_NAME%\quick-deploy.sh"
echo fi >> "%PACKAGE_NAME%\quick-deploy.sh"
echo. >> "%PACKAGE_NAME%\quick-deploy.sh"
echo # 安装依赖和构建 >> "%PACKAGE_NAME%\quick-deploy.sh"
echo ./install-host-deps.sh >> "%PACKAGE_NAME%\quick-deploy.sh"
echo. >> "%PACKAGE_NAME%\quick-deploy.sh"
echo # 快速部署 >> "%PACKAGE_NAME%\quick-deploy.sh"
echo ./deploy.sh --skip-pull >> "%PACKAGE_NAME%\quick-deploy.sh"
echo. >> "%PACKAGE_NAME%\quick-deploy.sh"
echo echo "✅ 快速部署完成！" >> "%PACKAGE_NAME%\quick-deploy.sh"
echo echo "📱 应用访问地址: http://$(hostname -I | awk '{print $1}'):3000" >> "%PACKAGE_NAME%\quick-deploy.sh"

REM 创建压缩包 (如果有 7zip)
where 7z >nul 2>nul
if %errorlevel% == 0 (
    echo 🗜️ 创建压缩包...
    7z a -tzip "%PACKAGE_NAME%_%TIMESTAMP%.zip" "%PACKAGE_NAME%"
    echo ✅ 压缩包已创建: %PACKAGE_NAME%_%TIMESTAMP%.zip
) else (
    echo ⚠️ 未找到 7zip，跳过压缩步骤
    echo 💡 您可以手动压缩 %PACKAGE_NAME% 文件夹
)

echo.
echo ✅ 打包完成!
echo 📁 部署文件夹: %PACKAGE_NAME%
echo.
echo 📋 包含的主要文件和脚本:
echo.
echo 🔧 部署脚本:
echo   - deploy.sh (主部署脚本)
echo   - install-host-deps.sh (依赖安装和构建)
echo   - install-production-deps.sh (纯生产依赖安装)
echo   - quick-deploy.sh (一键快速部署)
echo   - upgrade-server.sh (服务器环境升级)
echo   - setup-china-mirrors.sh (国内镜像源配置)
echo   - add-swap.sh (添加swap空间)
echo   - health-check.sh (健康检查)
echo.
echo 📄 配置文件:
echo   - docker-compose.yml (Docker编排配置)
echo   - nginx.conf (Nginx配置)
echo   - .env.production (生产环境变量模板)
echo   - package.json (Node.js依赖配置)
echo.
echo 📚 文档:
echo   - README.txt (快速部署指南)
echo   - 部署指南.md (详细部署文档)
echo   - 升级指南.md (升级维护文档)
echo.
echo 💻 源代码:
echo   - src/ (应用源代码)
echo   - prisma/ (数据库模式和种子)
echo   - public/ (静态资源)
echo.
echo 🚀 推荐的部署流程:
echo 1. 上传 %PACKAGE_NAME% 到服务器
echo 2. cd %PACKAGE_NAME%
echo 3. chmod +x *.sh
echo 4. cp .env.production .env && nano .env
echo 5. ./quick-deploy.sh
echo.
echo 📖 详细部署说明请查看 README.txt 和 部署指南.md 文件

pause