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

async function checkSession() {
  try {
    const token = '1ba5b65e734a306adac8087db03856e61ffc9f82738a9a912b6d93510055f7a4'

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
      console.log('❌ Session not found in database')

      // Check all sessions for this user
      const user = await prisma.user.findUnique({
        where: { username: 'test_family_1' },
        include: { sessions: true }
      })

      if (user) {
        console.log(`User ${user.username} has ${user.sessions.length} sessions:`)
        user.sessions.forEach(s => {
          console.log(`  - ${s.token.substring(0, 20)}... (expires: ${s.expiresAt})`)
        })
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSession()
