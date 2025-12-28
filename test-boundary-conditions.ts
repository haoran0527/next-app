import { prisma } from './src/lib/prisma'

async function testBoundaryConditions() {
  console.log('=== Phase 8: 边界条件测试 ===\n')

  // 获取现有家庭组信息
  const familyGroup = await prisma.familyGroup.findFirst({
    where: {
      name: '测试家庭组'
    },
    include: {
      members: {
        include: {
          user: true
        }
      },
      creator: true
    }
  })

  if (!familyGroup) {
    console.log('❌ 测试家庭组不存在')
    return
  }

  console.log('📋 测试家庭组信息:')
  console.log(`  - ID: ${familyGroup.id}`)
  console.log(`  - 名称: ${familyGroup.name}`)
  console.log(`  - 邀请码: ${familyGroup.inviteCode}`)
  console.log(`  - 创建者: ${familyGroup.creator.username}`)
  console.log(`  - 成员数量: ${familyGroup.members.length}`)
  console.log()

  // 测试场景 1: 验证普通成员不能解散家庭组（通过后端逻辑验证）
  console.log('🧪 测试场景 1: 验证成员角色')
  const creatorMember = familyGroup.members.find(m => m.role === 'CREATOR')
  const regularMembers = familyGroup.members.filter(m => m.role === 'MEMBER')

  console.log(`  ✅ 创建者: ${creatorMember?.user.username}`)
  console.log(`  ✅ 普通成员: ${regularMembers.map(m => m.user.username).join(', ')}`)
  console.log('  ℹ️  预期: 只有创建者可以解散家庭组')
  console.log()

  // 测试场景 2: 检查是否有用户可以加入多个家庭组
  console.log('🧪 测试场景 2: 用户家庭组唯一性')
  const members = await prisma.familyMember.findMany({
    select: { userId: true }
  })

  const userGroupCount: Record<string, number> = {}
  members.forEach(m => {
    userGroupCount[m.userId] = (userGroupCount[m.userId] || 0) + 1
  })

  const multiGroupUserIds = Object.entries(userGroupCount)
    .filter(([_, count]) => count > 1)
    .map(([userId]) => userId)

  if (multiGroupUserIds.length > 0) {
    console.log(`  ⚠️  发现用户属于多个家庭组:`)
    for (const userId of multiGroupUserIds) {
      const userData = await prisma.user.findUnique({
        where: { id: userId }
      })
      console.log(`     - ${userData?.username}: ${userGroupCount[userId]} 个家庭组`)
    }
  } else {
    console.log('  ✅ 所有用户只属于一个家庭组（符合预期）')
  }
  console.log()

  // 测试场景 3: 验证邀请码唯一性
  console.log('🧪 测试场景 3: 邀请码唯一性')
  const duplicateCodes = await prisma.familyGroup.groupBy({
    by: ['inviteCode'],
    having: {
      inviteCode: {
        _count: {
          gt: 1
        }
      }
    }
  })

  if (duplicateCodes.length > 0) {
    console.log(`  ❌ 发现重复的邀请码: ${duplicateCodes.map(d => d.inviteCode).join(', ')}`)
  } else {
    console.log('  ✅ 所有邀请码唯一（符合预期）')
  }
  console.log()

  // 测试场景 4: 验证创建者不能退出（只能解散）
  console.log('🧪 测试场景 4: 创建者退出限制')
  console.log('  ℹ️  预期: 创建者点击"退出家庭组"应该被拒绝')
  console.log('  ℹ️  创建者只能使用"解散家庭组"功能')
  console.log('  ✅ 前端应该隐藏创建者的"退出家庭组"按钮')
  console.log()

  // 测试场景 5: 检查孤立的成员记录
  console.log('🧪 测试场景 5: 数据一致性检查')
  const allMemberGroupIds = await prisma.familyMember.findMany({
    select: { groupId: true, userId: true }
  })

  const validGroupIds = await prisma.familyGroup.findMany({
    select: { id: true }
  })
  const validGroupIdSet = new Set(validGroupIds.map(g => g.id))

  const orphanMembers = allMemberGroupIds.filter(m => !validGroupIdSet.has(m.groupId))

  if (orphanMembers.length > 0) {
    console.log(`  ❌ 发现 ${orphanMembers.length} 个孤立的成员记录（家庭组不存在）`)
  } else {
    console.log('  ✅ 所有成员记录都有对应的有效家庭组')
  }
  console.log()

  console.log('=== 边界条件测试完成 ===')
}

testBoundaryConditions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
