import { prisma } from '../prisma'
import { User } from '../types/auth'

/**
 * 管理员服务
 * 提供管理员专用的功能，包括用户管理、系统统计等
 */

export interface AdminUserDetails extends User {
  transactionCount: number
  sessionCount: number
  totalIncome: number
  totalExpense: number
  balance: number
  lastLoginAt?: Date
}

export interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalTransactions: number
  totalIncome: number
  totalExpense: number
  systemBalance: number
  newUsersThisMonth: number
  transactionsThisMonth: number
}

export interface PaginatedUsers {
  users: AdminUserDetails[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface UserFilters {
  search?: string
  role?: 'USER' | 'ADMIN'
  isActive?: boolean
  page?: number
  limit?: number
}

/**
 * 验证管理员权限
 */
export function validateAdminPermission(user: User): boolean {
  return user.role === 'ADMIN' && user.isActive
}

/**
 * 获取所有用户列表（分页）
 */
export async function getAllUsers(
  adminUser: User,
  filters: UserFilters = {}
): Promise<PaginatedUsers> {
  // 验证管理员权限
  if (!validateAdminPermission(adminUser)) {
    throw new Error('权限不足：需要管理员权限')
  }

  const {
    search,
    role,
    isActive,
    page = 1,
    limit = 20
  } = filters

  const offset = (page - 1) * limit

  // 构建查询条件
  const whereClause: any = {}

  if (search) {
    whereClause.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } }
    ]
  }

  if (role) {
    whereClause.role = role
  }

  if (isActive !== undefined) {
    whereClause.isActive = isActive
  }

  try {
    // 获取用户列表和总数
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              transactions: true,
              sessions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.user.count({ where: whereClause })
    ])

    // 获取每个用户的财务统计
    const usersWithStats: AdminUserDetails[] = await Promise.all(
      users.map(async (user) => {
        const [incomeStats, expenseStats, lastSession] = await Promise.all([
          prisma.transaction.aggregate({
            where: { userId: user.id, type: 'INCOME' },
            _sum: { amount: true }
          }),
          prisma.transaction.aggregate({
            where: { userId: user.id, type: 'EXPENSE' },
            _sum: { amount: true }
          }),
          prisma.session.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
          })
        ])

        const totalIncome = Number(incomeStats._sum.amount || 0)
        const totalExpense = Number(expenseStats._sum.amount || 0)

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role as 'USER' | 'ADMIN',
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          transactionCount: user._count.transactions,
          sessionCount: user._count.sessions,
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          lastLoginAt: lastSession?.createdAt
        }
      })
    )

    return {
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    throw new Error('获取用户列表失败')
  }
}

/**
 * 获取用户详细信息
 */
export async function getUserDetails(
  adminUser: User,
  userId: string
): Promise<AdminUserDetails> {
  // 验证管理员权限
  if (!validateAdminPermission(adminUser)) {
    throw new Error('权限不足：需要管理员权限')
  }

  try {
    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            transactions: true,
            sessions: true
          }
        }
      }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    // 获取财务统计
    const [incomeStats, expenseStats, lastSession] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'INCOME' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE' },
        _sum: { amount: true }
      }),
      prisma.session.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])

    const totalIncome = Number(incomeStats._sum.amount || 0)
    const totalExpense = Number(expenseStats._sum.amount || 0)

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as 'USER' | 'ADMIN',
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      transactionCount: user._count.transactions,
      sessionCount: user._count.sessions,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      lastLoginAt: lastSession?.createdAt
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
    throw error
  }
}

/**
 * 获取系统统计信息
 */
export async function getSystemStats(adminUser: User): Promise<SystemStats> {
  // 验证管理员权限
  if (!validateAdminPermission(adminUser)) {
    throw new Error('权限不足：需要管理员权限')
  }

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      incomeStats,
      expenseStats,
      newUsersThisMonth,
      transactionsThisMonth
    ] = await Promise.all([
      // 总用户数
      prisma.user.count(),
      // 活跃用户数
      prisma.user.count({ where: { isActive: true } }),
      // 总交易数
      prisma.transaction.count(),
      // 总收入
      prisma.transaction.aggregate({
        where: { type: 'INCOME' },
        _sum: { amount: true }
      }),
      // 总支出
      prisma.transaction.aggregate({
        where: { type: 'EXPENSE' },
        _sum: { amount: true }
      }),
      // 本月新用户
      prisma.user.count({
        where: {
          createdAt: { gte: startOfMonth }
        }
      }),
      // 本月交易数
      prisma.transaction.count({
        where: {
          createdAt: { gte: startOfMonth }
        }
      })
    ])

    const totalIncome = Number(incomeStats._sum.amount || 0)
    const totalExpense = Number(expenseStats._sum.amount || 0)

    return {
      totalUsers,
      activeUsers,
      totalTransactions,
      totalIncome,
      totalExpense,
      systemBalance: totalIncome - totalExpense,
      newUsersThisMonth,
      transactionsThisMonth
    }
  } catch (error) {
    console.error('获取系统统计失败:', error)
    throw new Error('获取系统统计失败')
  }
}

/**
 * 获取用户的交易记录（管理员查看）
 */
export async function getUserTransactions(
  adminUser: User,
  userId: string,
  options: {
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
    type?: 'INCOME' | 'EXPENSE'
    category?: string
  } = {}
) {
  // 验证管理员权限
  if (!validateAdminPermission(adminUser)) {
    throw new Error('权限不足：需要管理员权限')
  }

  const {
    page = 1,
    limit = 20,
    startDate,
    endDate,
    type,
    category
  } = options

  const offset = (page - 1) * limit

  // 构建查询条件
  const whereClause: any = { userId }

  if (startDate || endDate) {
    whereClause.date = {}
    if (startDate) whereClause.date.gte = startDate
    if (endDate) whereClause.date.lte = endDate
  }

  if (type) whereClause.type = type
  if (category) whereClause.category = category

  try {
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.transaction.count({ where: whereClause })
    ])

    return {
      transactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
  } catch (error) {
    console.error('获取用户交易记录失败:', error)
    throw new Error('获取用户交易记录失败')
  }
}

/**
 * 跨用户数据访问 - 管理员专用
 * 允许管理员访问任何用户的数据
 */
export class AdminDataAccess {
  constructor(private adminUser: User) {
    if (!validateAdminPermission(adminUser)) {
      throw new Error('权限不足：需要管理员权限')
    }
  }

  /**
   * 获取任意用户的交易记录
   */
  async getTransactionsByUserId(userId: string, filters: any = {}) {
    const whereClause = { userId, ...filters }
    
    return prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    })
  }

  /**
   * 获取任意用户的统计信息
   */
  async getStatsByUserId(userId: string) {
    const [incomeStats, expenseStats, transactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'INCOME' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE' },
        _sum: { amount: true }
      }),
      prisma.transaction.count({ where: { userId } })
    ])

    const totalIncome = Number(incomeStats._sum.amount || 0)
    const totalExpense = Number(expenseStats._sum.amount || 0)

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount
    }
  }

  /**
   * 获取所有用户的汇总数据
   */
  async getAllUsersData() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    const usersWithData = await Promise.all(
      users.map(async (user) => {
        const stats = await this.getStatsByUserId(user.id)
        return {
          ...user,
          ...stats
        }
      })
    )

    return usersWithData
  }
}

/**
 * 创建管理员数据访问实例
 */
export function createAdminDataAccess(adminUser: User): AdminDataAccess {
  return new AdminDataAccess(adminUser)
}