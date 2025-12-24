#!/bin/bash

# 宿主机依赖安装和构建脚本
# 一键完成：安装依赖 -> 生成Prisma客户端 -> 构建应用
# 使用方法: ./install-host-deps.sh [--force]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

FORCE_INSTALL=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_INSTALL=true
            shift
            ;;
        *)
            echo "未知参数: $1"
            echo "使用方法: ./install-host-deps.sh [--force]"
            echo "  --force  强制重新安装和构建"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 宿主机依赖安装和构建${NC}"
echo ""

# 检查Node.js环境
echo -e "${BLUE}📋 检查Node.js环境${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js版本: $NODE_VERSION${NC}"
    
    # 检查版本是否符合要求
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -lt 20 ]; then
        echo -e "${RED}❌ Node.js版本过低，需要20+版本${NC}"
        echo -e "${YELLOW}💡 请运行 ./upgrade-server.sh 升级Node.js${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ 未找到Node.js${NC}"
    echo -e "${YELLOW}💡 请运行 ./upgrade-server.sh 安装Node.js${NC}"
    exit 1
fi

# 检查npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm版本: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ 未找到npm${NC}"
    exit 1
fi

echo ""

# 检查项目文件
echo -e "${BLUE}📋 检查项目文件${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 未找到package.json文件${NC}"
    exit 1
fi
echo -e "${GREEN}✅ package.json文件存在${NC}"

# 检查是否需要安装依赖
NEED_INSTALL=false
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️ node_modules目录不存在${NC}"
    NEED_INSTALL=true
elif [ "$FORCE_INSTALL" = true ]; then
    echo -e "${YELLOW}⚠️ 强制重新安装模式${NC}"
    NEED_INSTALL=true
elif [ "package.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}⚠️ package.json比node_modules更新${NC}"
    NEED_INSTALL=true
else
    echo -e "${GREEN}✅ node_modules已存在且是最新的${NC}"
fi

echo ""

# 配置npm环境
echo -e "${BLUE}🔧 配置npm环境${NC}"
npm config set registry https://registry.npmmirror.com
CURRENT_REGISTRY=$(npm config get registry)
echo -e "${GREEN}✅ npm镜像源: $CURRENT_REGISTRY${NC}"

echo ""

# 安装依赖
if [ "$NEED_INSTALL" = true ]; then
    echo -e "${BLUE}📦 安装依赖${NC}"
    
    echo -e "${CYAN}🧹 清理npm缓存...${NC}"
    npm cache clean --force
    
    # 如果强制安装，先删除node_modules
    if [ "$FORCE_INSTALL" = true ] && [ -d "node_modules" ]; then
        echo -e "${CYAN}🗑️ 删除现有node_modules...${NC}"
        rm -rf node_modules
    fi
    
    echo -e "${CYAN}📦 开始安装所有依赖...${NC}"
    echo -e "${YELLOW}💡 这可能需要几分钟时间，请耐心等待...${NC}"
    
    # 设置生产环境变量，但安装所有依赖（包括devDependencies）
    export NODE_ENV=production
    
    # 删除 package-lock.json 并重新生成，确保依赖完整
    if [ -f "package-lock.json" ]; then
        echo -e "${CYAN}🗑️ 删除旧的 package-lock.json...${NC}"
        rm package-lock.json
    fi
    
    # 使用 npm install 重新生成锁定文件并安装所有依赖
    npm install --no-audit --no-fund --progress=true
    
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 跳过依赖安装（已是最新）${NC}"
fi

echo ""

# 检查关键依赖
echo -e "${BLUE}🔍 检查关键依赖${NC}"
CRITICAL_DEPS=("next" "@prisma/client" "prisma" "react" "react-dom")
MISSING_DEPS=()

for dep in "${CRITICAL_DEPS[@]}"; do
    if [ -d "node_modules/$dep" ]; then
        echo -e "${GREEN}  ✅ $dep${NC}"
    else
        echo -e "${RED}  ❌ $dep${NC}"
        MISSING_DEPS+=("$dep")
    fi
done

# 检查可选依赖（不阻止继续）
echo -e "${BLUE}🔍 检查可选依赖${NC}"
OPTIONAL_DEPS=("@tailwindcss/postcss" "tailwindcss")
for dep in "${OPTIONAL_DEPS[@]}"; do
    if [ -d "node_modules/$dep" ]; then
        echo -e "${GREEN}  ✅ $dep${NC}"
    else
        echo -e "${YELLOW}  ⚠️ $dep (将在后续步骤中安装)${NC}"
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${RED}❌ 缺少以下关键依赖: ${MISSING_DEPS[*]}${NC}"
    echo -e "${YELLOW}💡 尝试重新安装: ./install-host-deps.sh --force${NC}"
    exit 1
fi

echo ""

# 添加缺失的依赖
echo -e "${BLUE}📦 检查并添加缺失的依赖${NC}"

# 检查并安装缺失的依赖
MISSING_PACKAGES=()

if [ ! -d "node_modules/zod" ]; then
    MISSING_PACKAGES+=("zod")
fi

if [ ! -d "node_modules/@tailwindcss/postcss" ]; then
    MISSING_PACKAGES+=("@tailwindcss/postcss@^4")
fi

if [ ! -d "node_modules/tailwindcss" ]; then
    MISSING_PACKAGES+=("tailwindcss@^4")
fi

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️ 缺少以下依赖，正在强制安装: ${MISSING_PACKAGES[*]}${NC}"
    npm install "${MISSING_PACKAGES[@]}" --save-dev
    echo -e "${GREEN}✅ 缺失依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 所有必要依赖都已存在${NC}"
fi

# 再次检查关键依赖
echo -e "${BLUE}🔍 再次检查关键依赖${NC}"
ALL_GOOD=true
for dep in "${CRITICAL_DEPS[@]}"; do
    if [ -d "node_modules/$dep" ]; then
        echo -e "${GREEN}  ✅ $dep${NC}"
    else
        echo -e "${RED}  ❌ $dep${NC}"
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = false ]; then
    echo -e "${RED}❌ 仍有依赖缺失，尝试手动安装...${NC}"
    npm install @tailwindcss/postcss@^4 tailwindcss@^4 zod --save-dev
fi

echo ""

# 生成 Prisma 客户端
echo -e "${BLUE}🔧 生成 Prisma 客户端${NC}"

# 检查是否需要生成 Prisma 客户端
NEED_PRISMA_GENERATE=false
if [ ! -d "node_modules/.prisma" ]; then
    echo -e "${YELLOW}⚠️ Prisma 客户端不存在${NC}"
    NEED_PRISMA_GENERATE=true
elif [ "$FORCE_INSTALL" = true ]; then
    echo -e "${YELLOW}⚠️ 强制重新生成模式${NC}"
    NEED_PRISMA_GENERATE=true
elif [ "prisma/schema.prisma" -nt "node_modules/.prisma" ]; then
    echo -e "${YELLOW}⚠️ Prisma schema 比客户端更新${NC}"
    NEED_PRISMA_GENERATE=true
else
    echo -e "${GREEN}✅ Prisma 客户端已存在且是最新的${NC}"
fi

if [ "$NEED_PRISMA_GENERATE" = true ]; then
    echo -e "${CYAN}🔧 生成 Prisma 客户端...${NC}"
    
    # 临时重命名配置文件以避免dotenv依赖问题
    if [ -f "prisma.config.ts" ]; then
        mv prisma.config.ts prisma.config.ts.bak
        echo -e "${CYAN}📝 临时重命名 prisma.config.ts${NC}"
    fi
    
    # 直接使用schema文件生成客户端
    npx prisma generate --schema=prisma/schema.prisma
    
    # 恢复配置文件
    if [ -f "prisma.config.ts.bak" ]; then
        mv prisma.config.ts.bak prisma.config.ts
        echo -e "${CYAN}📝 恢复 prisma.config.ts${NC}"
    fi
    
    echo -e "${GREEN}✅ Prisma 客户端生成完成${NC}"
fi

echo ""

# 构建应用
echo -e "${BLUE}🏗️ 构建应用${NC}"

# 检查是否需要构建应用
NEED_BUILD=false
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}⚠️ 构建产物不存在${NC}"
    NEED_BUILD=true
elif [ "$FORCE_INSTALL" = true ]; then
    echo -e "${YELLOW}⚠️ 强制重新构建模式${NC}"
    NEED_BUILD=true
elif [ "package.json" -nt ".next" ] || [ "next.config.ts" -nt ".next" ]; then
    echo -e "${YELLOW}⚠️ 源代码比构建产物更新${NC}"
    NEED_BUILD=true
else
    echo -e "${GREEN}✅ 构建产物已存在且是最新的${NC}"
fi

if [ "$NEED_BUILD" = true ]; then
    echo -e "${CYAN}🏗️ 构建 Next.js 应用...${NC}"
    echo -e "${YELLOW}💡 这可能需要几分钟时间，请耐心等待...${NC}"
    
    # 设置构建环境变量
    export NODE_ENV=production
    
    # 构建应用
    npm run build
    
    echo -e "${GREEN}✅ 应用构建完成${NC}"
    
    # 显示构建产物大小
    if [ -d ".next" ]; then
        BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "未知")
        echo -e "${CYAN}📊 构建产物大小: $BUILD_SIZE${NC}"
    fi
fi

echo ""

# 最终验证
echo -e "${BLUE}🔍 最终验证${NC}"

# 检查关键构建文件
BUILD_FILES=(".next" "node_modules/.prisma" "node_modules")
MISSING_BUILD=()

for file in "${BUILD_FILES[@]}"; do
    if [ -d "$file" ]; then
        echo -e "${GREEN}  ✅ $file${NC}"
    else
        echo -e "${RED}  ❌ $file${NC}"
        MISSING_BUILD+=("$file")
    fi
done

if [ ${#MISSING_BUILD[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ 所有构建产物都已正确生成${NC}"
else
    echo -e "${RED}❌ 缺少以下构建产物: ${MISSING_BUILD[*]}${NC}"
    exit 1
fi

# 显示统计信息
if [ -d "node_modules" ]; then
    NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "未知")
    echo -e "${CYAN}📊 node_modules大小: $NODE_MODULES_SIZE${NC}"
fi

DEPS_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
echo -e "${CYAN}📊 已安装依赖包数量: $((DEPS_COUNT - 1))${NC}"

echo ""
echo -e "${GREEN}🎉 宿主机依赖安装和构建完成！${NC}"
echo ""
echo -e "${BLUE}💡 接下来可以运行:${NC}"
echo -e "  ${CYAN}./debug-deploy.sh${NC}      # 调试部署（推荐）"
echo -e "  ${CYAN}./deploy.sh --skip-pull${NC} # 快速部署"
echo -e "  ${CYAN}./deploy.sh${NC}             # 正常部署"
echo ""
echo -e "${YELLOW}📝 注意事项:${NC}"
echo -e "  - 所有依赖已安装（包括开发依赖）"
echo -e "  - Prisma 客户端已生成"
echo -e "  - Next.js 应用已构建完成"
echo -e "  - Docker容器将直接使用这些预构建产物"
echo -e "  - 容器启动将非常快速（几秒钟内完成）"