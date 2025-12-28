const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const dbPassword = process.env.POSTGRES_PASSWORD || 'postgres'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'accounting_app',
  user: 'postgres',
  password: dbPassword,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
})

async function cleanupTestData() {
  try {
    console.log('Checking for test users...')

    // Find test users
    const testUsers = await prisma.user.findMany({
      where: {
        username: {
          startsWith: 'test_family_'
        }
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    })

    console.log(`Found ${testUsers.length} test users:`, testUsers)

    if (testUsers.length === 0) {
      console.log('No test users found. Database is clean.')
      return
    }

    // Get all user IDs to delete
    const userIds = testUsers.map(u => u.id)

    // Delete family members for these users
    console.log('Deleting family members...')
    await prisma.familyMember.deleteMany({
      where: {
        userId: {
          in: userIds
        }
      }
    })

    // Delete family groups where creator is a test user
    console.log('Deleting family groups...')
    await prisma.familyGroup.deleteMany({
      where: {
        creatorId: {
          in: userIds
        }
      }
    })

    // Delete transactions
    console.log('Deleting transactions...')
    await prisma.transaction.deleteMany({
      where: {
        userId: {
          in: userIds
        }
      }
    })

    // Delete sessions
    console.log('Deleting sessions...')
    await prisma.session.deleteMany({
      where: {
        userId: {
          in: userIds
        }
      }
    })

    // Delete users
    console.log('Deleting users...')
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds
        }
      }
    })

    console.log('✅ Test data cleanup completed successfully!')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

cleanupTestData()
