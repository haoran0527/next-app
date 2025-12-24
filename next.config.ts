import type { NextConfig } from 'next'

// 仅在生产环境使用 basePath，本地开发时不使用
const isProduction = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'standalone',
  // 配置子路径部署 - 仅生产环境生效
  basePath: isProduction ? '/note' : '',
  assetPrefix: isProduction ? '/note' : '',
  experimental: {
    // outputFileTracingRoot 在 Next.js 16+ 中已移除
  },
}

export default nextConfig
