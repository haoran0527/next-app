import { prisma } from '../prisma'
import { MemberRole } from '@prisma/client'

export interface CreateFamilyGroupInput {
  name: string
  creatorId: string
}

export interface FamilyGroupStats {
  personalStats: {
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
  }
  memberStats: Array<{
    userId: string
    username: string
    nickname: string | null
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
  }>
  familyStats: {
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
    memberCount: number
  }
}

export interface FamilyGroupMember {
  userId: string
  username: string
  nickname: string | null
  role: MemberRole
  joinedAt: Date
}

/**
 * 生成8字符邀请码
 * 使用大写字母和数字，避免易混淆字符（I, O, 0, 1）
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 移除易混淆字符
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * 确保生成的邀请码唯一
 */
async function generateUniqueInviteCode(): Promise<string> {
  let code: string
  let attempts = 0
  const maxAttempts = 10

  do {
    code = generateInviteCode()
    const existing = await prisma.familyGroup.findUnique({
      where: { inviteCode: code },
      select: { id: true }
    })
    if (!existing) {
      return code!
    }
    attempts++
  } while (attempts < maxAttempts)

  throw new Error('Failed to generate unique invite code after multiple attempts')
}

/**
 * 创建家庭组
 */
export async function createFamilyGroup(input: CreateFamilyGroupInput) {
  const { name, creatorId } = input

  // 验证名称
  if (!name || name.trim().length === 0 || name.length > 100) {
    throw new Error('家庭组名称必须在1-100字符之间')
  }

  // 检查用户是否已属于其他家庭组
  const existingMembership = await prisma.familyMember.findUnique({
    where: { userId: creatorId }
  })

  if (existingMembership) {
    throw new Error('您已属于其他家庭组，无法创建新的家庭组')
  }

  // 生成唯一邀请码
  const inviteCode = await generateUniqueInviteCode()

  // 创建家庭组并添加创建者
  const familyGroup = await prisma.$transaction(async (tx) => {
    // 创建家庭组
    const group = await tx.familyGroup.create({
      data: {
        name: name.trim(),
        creatorId,
        inviteCode
      }
    })

    // 添加创建者为成员
    await tx.familyMember.create({
      data: {
        userId: creatorId,
        groupId: group.id,
        role: MemberRole.CREATOR
      }
    })

    return group
  })

  // 返回完整的家庭组信息
  const result = await prisma.familyGroup.findUnique({
    where: { id: familyGroup.id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          nickname: true
        }
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true
            }
          }
        }
      }
    }
  })

  return result!
}

/**
 * 通过邀请码加入家庭组
 */
export async function joinFamilyGroup(userId: string, inviteCode: string) {
  // 验证邀请码格式
  if (!inviteCode || inviteCode.length !== 8) {
    throw new Error('邀请码格式无效')
  }

  // 检查用户是否已属于其他家庭组
  const existingMembership = await prisma.familyMember.findUnique({
    where: { userId }
  })

  if (existingMembership) {
    throw new Error('您已属于其他家庭组，无法加入')
  }

  // 查找邀请码对应的家庭组
  const familyGroup = await prisma.familyGroup.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() }
  })

  if (!familyGroup) {
    throw new Error('邀请码无效或家庭组不存在')
  }

  // 检查是否已是该组成员
  const existingMember = await prisma.familyMember.findFirst({
    where: {
      userId,
      groupId: familyGroup.id
    }
  })

  if (existingMember) {
    throw new Error('您已在该家庭组中')
  }

  // 加入家庭组
  await prisma.familyMember.create({
    data: {
      userId,
      groupId: familyGroup.id,
      role: MemberRole.MEMBER
    }
  })

  // 返回更新后的家庭组信息
  const result = await prisma.familyGroup.findUnique({
    where: { id: familyGroup.id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          nickname: true
        }
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true
            }
          }
        }
      }
    }
  })

  return result!
}

/**
 * 退出家庭组
 */
export async function leaveFamilyGroup(userId: string) {
  // 查找用户的家庭组成员记录
  const member = await prisma.familyMember.findUnique({
    where: { userId },
    include: {
      group: true
    }
  })

  if (!member) {
    throw new Error('您不属于任何家庭组')
  }

  // 检查是否为创建者
  if (member.role === MemberRole.CREATOR) {
    throw new Error('您是家庭组创建者，无法退出。请先解散家庭组。')
  }

  // 删除成员记录
  await prisma.familyMember.delete({
    where: { id: member.id }
  })

  return { success: true, message: '已退出家庭组' }
}

/**
 * 解散家庭组（仅创建者）
 */
export async function dissolveFamilyGroup(groupId: string, creatorId: string) {
  // 验证家庭组是否存在
  const familyGroup = await prisma.familyGroup.findUnique({
    where: { id: groupId },
    include: {
      members: true
    }
  })

  if (!familyGroup) {
    throw new Error('家庭组不存在')
  }

  // 验证用户是否为创建者
  if (familyGroup.creatorId !== creatorId) {
    throw new Error('只有创建者可以解散家庭组')
  }

  // 删除所有成员记录（由于设置了 Cascade，会自动删除）
  await prisma.familyMember.deleteMany({
    where: { groupId }
  })

  // 删除家庭组
  await prisma.familyGroup.delete({
    where: { id: groupId }
  })

  return { success: true, message: '家庭组已解散' }
}

/**
 * 获取家庭组成员列表
 */
export async function getFamilyMembers(groupId: string): Promise<FamilyGroupMember[]> {
  const members = await prisma.familyMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          nickname: true
        }
      }
    },
    orderBy: {
      joinedAt: 'asc'
    }
  })

  return members.map((member) => ({
    userId: member.user.id,
    username: member.user.username,
    nickname: member.user.nickname,
    role: member.role,
    joinedAt: member.joinedAt
  }))
}

/**
 * 根据用户ID获取其家庭组
 */
export async function getFamilyGroupByUserId(userId: string) {
  const member = await prisma.familyMember.findFirst({
    where: { userId },
    include: {
      group: {
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              nickname: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  nickname: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!member) {
    return null
  }

  return member.group
}

/**
 * 获取家庭组成员ID列表
 */
export async function getFamilyGroupMemberIds(groupId: string): Promise<string[]> {
  const members = await prisma.familyMember.findMany({
    where: { groupId },
    select: { userId: true }
  })

  return members.map((m) => m.userId)
}

/**
 * 获取家庭组统计信息
 */
export async function getFamilyGroupStats(groupId: string, currentUserId: string): Promise<FamilyGroupStats> {
  // 验证用户是否属于该家庭组
  const member = await prisma.familyMember.findFirst({
    where: { userId: currentUserId, groupId }
  })

  if (!member) {
    throw new Error('您不属于该家庭组')
  }

  // 获取所有成员
  const members = await prisma.familyMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          nickname: true
        }
      }
    }
  })

  const memberIds = members.map((m) => m.user.id)

  // 计算每个成员的统计
  const memberStats = await Promise.all(
    members.map(async (member) => {
      const [incomeResult, expenseResult, countResult] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            userId: member.user.id,
            type: 'INCOME'
          },
          _sum: { amount: true }
        }),
        prisma.transaction.aggregate({
          where: {
            userId: member.user.id,
            type: 'EXPENSE'
          },
          _sum: { amount: true }
        }),
        prisma.transaction.count({
          where: { userId: member.user.id }
        })
      ])

      const totalIncome = Number(incomeResult._sum.amount || 0)
      const totalExpense = Number(expenseResult._sum.amount || 0)

      return {
        userId: member.user.id,
        username: member.user.username,
        nickname: member.user.nickname,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: countResult
      }
    })
  )

  // 计算家庭总统计
  const [familyIncome, familyExpense, familyCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId: { in: memberIds },
        type: 'INCOME'
      },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: {
        userId: { in: memberIds },
        type: 'EXPENSE'
      },
      _sum: { amount: true }
    }),
    prisma.transaction.count({
      where: { userId: { in: memberIds } }
    })
  ])

  const familyTotalIncome = Number(familyIncome._sum.amount || 0)
  const familyTotalExpense = Number(familyExpense._sum.amount || 0)

  // 获取当前用户的个人统计
  const personalStats = memberStats.find((s) => s.userId === currentUserId) || {
    userId: currentUserId,
    username: '',
    nickname: null,
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    transactionCount: 0
  }

  return {
    personalStats: {
      totalIncome: personalStats.totalIncome,
      totalExpense: personalStats.totalExpense,
      balance: personalStats.balance,
      transactionCount: personalStats.transactionCount
    },
    memberStats,
    familyStats: {
      totalIncome: familyTotalIncome,
      totalExpense: familyTotalExpense,
      balance: familyTotalIncome - familyTotalExpense,
      transactionCount: familyCount,
      memberCount: members.length
    }
  }
}

/**
 * 验证用户是否为家庭组成员
 */
export async function validateFamilyGroupMembership(userId: string, groupId: string): Promise<boolean> {
  const member = await prisma.familyMember.findFirst({
    where: { userId, groupId }
  })

  return !!member
}

/**
 * 验证用户是否为家庭组创建者
 */
export async function validateFamilyGroupCreator(userId: string, groupId: string): Promise<boolean> {
  const group = await prisma.familyGroup.findUnique({
    where: { id: groupId },
    select: { creatorId: true }
  })

  return group ? group.creatorId === userId : false
}
