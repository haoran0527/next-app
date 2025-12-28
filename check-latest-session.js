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

async function checkLatestSession() {
  try {
    const token = 'd94790cd934978a3c16d039eb8404136ff18306e7ec149de50f743a6002d2bef'

    console.log('Looking for session with token:', token.substring(0, 20) + '...')

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    })

    if (session) {
      console.log('✅ Session found!')
      console.log('User:', session.user.username)
      console.log('Expires at:', session.expiresAt)
      console.log('Is valid:', new Date() < new Date(session.expiresAt))
    } else {
      console.log('❌ Session NOT found in database!')
      console.log('This is why login is failing!')
    }

    // Check all sessions for this user
    const user = await prisma.user.findUnique({
      where: { username: 'test_family_1' },
      include: { sessions: { orderBy: { createdAt: 'desc' } } }
    })

    if (user) {
      console.log(`\nUser ${user.username} has ${user.sessions.length} sessions:`)
      user.sessions.forEach((s, i) => {
        const isLatest = s.token === token
        console.log(`  ${i+1}. ${s.token.substring(0, 20)}... ${isLatest ? '← LATEST' : ''}`)
        console.log(`     Created: ${s.createdAt}`)
        console.log(`     Expires: ${s.expiresAt}`)
      })
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLatestSession()
