# 使用Node.js 22 Alpine作为基础镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 配置Alpine镜像源（使用多个备选源）
RUN echo 'https://mirrors.aliyun.com/alpine/v3.21/main' > /etc/apk/repositories && \
    echo 'https://mirrors.aliyun.com/alpine/v3.21/community' >> /etc/apk/repositories && \
    echo 'https://mirrors.ustc.edu.cn/alpine/v3.21/main' >> /etc/apk/repositories && \
    echo 'https://mirrors.ustc.edu.cn/alpine/v3.21/community' >> /etc/apk/repositories

# 安装系统依赖
RUN apk update --no-cache && \
    apk add --no-cache libc6-compat && \
    rm -rf /var/cache/apk/*

# 配置npm镜像源（只设置registry）
RUN npm config set registry https://registry.npmmirror.com

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production --no-audit --no-fund --timeout=600000

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]