import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// 全局存储，确保在开发模式下热重载时不会创建多个实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
  adapter: PrismaPg | undefined
}

// 从环境变量获取数据库密码，默认为 'postgres'
const dbPassword = process.env.POSTGRES_PASSWORD || 'postgres'

// 创建或复用全局连接池
const pool =
  globalForPrisma.pool ??
  new Pool({
    host: 'localhost',
    port: 5432,
    database: 'accounting_app',
    user: 'postgres',
    password: dbPassword,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool

// 创建或复用全局 adapter
const adapter =
  globalForPrisma.adapter ?? new PrismaPg(pool)

if (process.env.NODE_ENV !== 'production') globalForPrisma.adapter = adapter

// 创建或复用全局 Prisma Client
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
