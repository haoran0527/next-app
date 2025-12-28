const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'accounting_app',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: ['test_family_1', 'test_family_2', 'test_family_3']
        }
      },
      select: {
        username: true,
        role: true
      }
    })

    console.log('Test users found:')
    users.forEach(u => {
      console.log(`- ${u.username} (${u.role})`)
    })

    // Check family group
    const familyGroup = await prisma.familyGroup.findFirst({
      where: { name: '测试家庭组' },
      include: {
        members: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          }
        }
      }
    })

    if (familyGroup) {
      console.log('\nFamily Group: 测试家庭组')
      console.log('Members:')
      familyGroup.members.forEach(m => {
        console.log(`- ${m.user.username} (${m.role})`)
      })
    }

    // Check transactions
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    console.log('\nRecent transactions:')
    transactions.forEach(t => {
      console.log(`- ${t.user.username}: ${t.type} ¥${t.amount} - ${t.description}`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
