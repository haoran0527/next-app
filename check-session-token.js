const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSession() {
  const token = '09e014b0a9d9c33506614eb33b5b23a6b7d7c56a6be2edf796b2c0127e0e3ec9'

  console.log('查询token:', token.substring(0, 20) + '...')

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })

  if (session) {
    console.log('✅ 找到session')
    console.log('用户:', session.user.username)
    console.log('过期时间:', session.expiresAt)
    console.log('当前时间:', new Date())
    console.log('是否过期:', session.expiresAt < new Date())
  } else {
    console.log('❌ session不存在')
  }

  // 查询所有最近的session
  const allSessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: true }
  })

  console.log('\n最近5个session:')
  allSessions.forEach((s, i) => {
    console.log(`${i+1}. ${s.user.username} - ${s.token.substring(0, 20)}...`)
    console.log(`   过期: ${s.expiresAt < new Date() ? '已过期' : '有效'}`)
  })

  await prisma.$disconnect()
}

checkSession().catch(console.error)
