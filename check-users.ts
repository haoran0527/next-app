import { prisma } from './src/lib/prisma'

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
    },
    orderBy: {
      username: 'asc',
    },
  })

  console.log('Users in database:')
  console.log(JSON.stringify(users, null, 2))

  // Check family groups
  const familyGroups = await prisma.familyGroup.findMany({
    include: {
      members: {
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      creator: {
        select: {
          username: true,
        },
      },
    },
  })

  console.log('\nFamily Groups:')
  console.log(JSON.stringify(familyGroups, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
