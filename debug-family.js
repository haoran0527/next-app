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

async function debugFamily() {
  try {
    // Get all family members
    const members = await prisma.familyMember.findMany({
      include: {
        user: {
          select: {
            username: true
          }
        },
        group: {
          select: {
            name: true,
            creatorId: true
          }
        }
      }
    })

    console.log('All family members:')
    members.forEach(m => {
      console.log(`- ${m.user.username} in "${m.group.name}" (${m.role})`)
      console.log(`  Group ID: ${m.groupId}`)
      console.log(`  User ID: ${m.userId}`)
      console.log(`  Creator ID: ${m.group.creatorId}`)
    })

    // Get test_family_1's memberships
    const test1 = await prisma.user.findUnique({
      where: { username: 'test_family_1' },
      include: {
        sessions: true,
        familyMembers: {
          include: {
            group: true
          }
        }
      }
    })

    console.log('\ntest_family_1 sessions:', test1.sessions.length)
    console.log('test_family_1 family memberships:', test1.familyMembers.length)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugFamily()
