import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'standalone',
  // 配置子路径部署
  basePath: '/note',
  assetPrefix: '/note',
  experimental: {
    // outputFileTracingRoot 在 Next.js 16+ 中已移除
  },
}

export default nextConfig
