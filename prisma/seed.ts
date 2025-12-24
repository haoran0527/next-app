import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

// 从环境变量获取数据库密码，默认为 'postgres'
const dbPassword = process.env.POSTGRES_PASSWORD || 'postgres'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'accounting_app',
  user: 'postgres',
  password: dbPassword,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('开始数据库种子数据...')

  // 创建超级管理员用户
  const hashedPassword = await bcrypt.hash('admin123456', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@accounting-app.com' },
    update: {},
    create: {
      email: 'admin@accounting-app.com',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('创建超级管理员:', admin)

  // 创建测试用户
  const testUserPassword = await bcrypt.hash('test123456', 12)

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      password: testUserPassword,
      role: 'USER',
    },
  })

  console.log('创建测试用户:', testUser)

  // 为测试用户创建一些示例财务记录
  const sampleTransactions = [
    {
      userId: testUser.id,
      amount: 5000,
      type: 'INCOME' as const,
      category: '工资收入',
      description: '月薪',
      date: new Date('2024-01-01'),
    },
    {
      userId: testUser.id,
      amount: 1200,
      type: 'EXPENSE' as const,
      category: '房租',
      description: '一月房租',
      date: new Date('2024-01-02'),
    },
    {
      userId: testUser.id,
      amount: 300,
      type: 'EXPENSE' as const,
      category: '餐饮',
      description: '超市购物',
      date: new Date('2024-01-03'),
    },
    {
      userId: testUser.id,
      amount: 2000,
      type: 'INCOME' as const,
      category: '奖金',
      description: '年终奖金',
      date: new Date('2024-01-15'),
    },
    {
      userId: testUser.id,
      amount: 150,
      type: 'EXPENSE' as const,
      category: '交通',
      description: '地铁卡充值',
      date: new Date('2024-01-16'),
    },
    {
      userId: testUser.id,
      amount: 800,
      type: 'EXPENSE' as const,
      category: '购物',
      description: '衣服和鞋子',
      date: new Date('2024-01-20'),
    },
    {
      userId: testUser.id,
      amount: 500,
      type: 'INCOME' as const,
      category: '兼职收入',
      description: '周末兼职',
      date: new Date('2024-01-25'),
    },
    {
      userId: testUser.id,
      amount: 200,
      type: 'EXPENSE' as const,
      category: '娱乐',
      description: '电影和聚餐',
      date: new Date('2024-01-28'),
    },
    {
      userId: testUser.id,
      amount: 100,
      type: 'EXPENSE' as const,
      category: '医疗',
      description: '药品费用',
      date: new Date('2024-02-01'),
    },
    {
      userId: testUser.id,
      amount: 50,
      type: 'EXPENSE' as const,
      category: '通讯费',
      description: '手机话费',
      date: new Date('2024-02-05'),
    }
  ]

  for (const transaction of sampleTransactions) {
    await prisma.transaction.create({
      data: transaction,
    })
  }

  console.log('创建示例财务记录完成')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
