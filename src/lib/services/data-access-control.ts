import { User } from '../types/auth'
import { prisma } from '../prisma'

/**
 * 数据访问控制服务
 * 实现严格的数据隔离，确保用户只能访问自己的数据
 */

export interface DataAccessResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface QueryFilters {
  userId?: string
  startDate?: Date
  endDate?: Date
  type?: string
  category?: string
  limit?: number
  offset?: number
}

/**
 * 验证用户是否有权访问指定资源
 */
export async function validateUserAccess(
  currentUser: User,
  resourceUserId: string,
  resourceType: 'transaction' | 'user' | 'session' = 'transaction'
): Promise<boolean> {
  try {
    // 管理员可以访问所有资源
    if (currentUser.role === 'ADMIN') {
      return true
    }

    // 普通用户只能访问自己的资源
    if (currentUser.id === resourceUserId) {
      return true
    }

    // 对于某些资源类型，需要额外验证
    switch (resourceType) {
      case 'transaction':
        // 验证交易记录是否属于当前用户
        const transaction = await prisma.transaction.findFirst({
          where: {
            userId: resourceUserId,
            user: { id: currentUser.id }
          }
        })
        return !!transaction
      
      case 'user':
        // 用户只能访问自己的用户信息
        return currentUser.id === resourceUserId
      
      case 'session':
        // 用户只能访问自己的会话
        return currentUser.id === resourceUserId
      
      default:
        return false
    }
  } catch (error) {
    console.error('验证用户访问权限失败:', error)
    return false
  }
}

/**
 * 为查询添加用户过滤条件
 */
export function applyUserFilter(currentUser: User, baseFilters: QueryFilters = {}): QueryFilters {
  // 管理员可以查询所有数据（如果没有指定userId）
  if (currentUser.role === 'ADMIN' && !baseFilters.userId) {
    return baseFilters
  }

  // 普通用户或管理员指定了userId时，强制使用当前用户ID或指定的userId
  return {
    ...baseFilters,
    userId: currentUser.role === 'ADMIN' ? (baseFilters.userId || currentUser.id) : currentUser.id
  }
}

/**
 * 检查用户权限
 */
export function checkPermission(
  currentUser: User,
  action: 'create' | 'read' | 'update' | 'delete' | 'admin',
  resource: 'transaction' | 'user' | 'session' | 'system' = 'transaction'
): boolean {
  // 检查用户是否被禁用
  if (!currentUser.isActive) {
    return false
  }

  // 管理员权限检查
  if (currentUser.role === 'ADMIN') {
    return true // 管理员拥有所有权限
  }

  // 普通用户权限检查
  switch (action) {
    case 'admin':
      return false // 普通用户没有管理员权限
    
    case 'create':
    case 'read':
    case 'update':
    case 'delete':
      // 普通用户可以对自己的资源进行CRUD操作
      return resource !== 'system'
    
    default:
      return false
  }
}

/**
 * 验证资源所有权
 */
export async function validateResourceOwnership(
  currentUser: User,
  resourceId: string,
  resourceType: 'transaction' | 'user' | 'session'
): Promise<boolean> {
  try {
    // 管理员可以访问所有资源
    if (currentUser.role === 'ADMIN') {
      return true
    }

    switch (resourceType) {
      case 'transaction':
        const transaction = await prisma.transaction.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        })
        return transaction?.userId === currentUser.id
      
      case 'user':
        return resourceId === currentUser.id
      
      case 'session':
        const session = await prisma.session.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        })
        return session?.userId === currentUser.id
      
      default:
        return false
    }
  } catch (error) {
    console.error('验证资源所有权失败:', error)
    return false
  }
}

/**
 * 安全的数据查询包装器
 * 自动应用用户过滤条件
 */
export class SecureDataAccess {
  constructor(private currentUser: User) {}

  /**
   * 安全查询交易记录
   */
  async getTransactions(filters: QueryFilters = {}): Promise<DataAccessResult> {
    try {
      // 应用用户过滤
      const secureFilters = applyUserFilter(this.currentUser, filters)
      
      const whereClause: any = {
        userId: secureFilters.userId
      }

      // 添加其他过滤条件
      if (secureFilters.startDate || secureFilters.endDate) {
        whereClause.date = {}
        if (secureFilters.startDate) {
          whereClause.date.gte = secureFilters.startDate
        }
        if (secureFilters.endDate) {
          whereClause.date.lte = secureFilters.endDate
        }
      }

      if (secureFilters.type) {
        whereClause.type = secureFilters.type
      }

      if (secureFilters.category) {
        whereClause.category = secureFilters.category
      }

      // 并行获取总数和数据
      const [total, transactions] = await Promise.all([
        prisma.transaction.count({ where: whereClause }),
        prisma.transaction.findMany({
          where: whereClause,
          orderBy: { date: 'desc' },
          take: secureFilters.limit,
          skip: secureFilters.offset
        })
      ])

      return {
        success: true,
        data: {
          transactions,
          total,
          page: Math.floor((secureFilters.offset || 0) / (secureFilters.limit || 50)) + 1,
          limit: secureFilters.limit || 50,
          hasNext: (secureFilters.offset || 0) + (secureFilters.limit || 50) < total,
          hasPrev: (secureFilters.offset || 0) > 0
        }
      }
    } catch (error) {
      console.error('安全查询交易记录失败:', error)
      return {
        success: false,
        error: '查询失败'
      }
    }
  }

  /**
   * 安全查询单个交易记录
   */
  async getTransactionById(id: string): Promise<DataAccessResult> {
    try {
      // 验证资源所有权
      const hasAccess = await validateResourceOwnership(this.currentUser, id, 'transaction')
      if (!hasAccess) {
        return {
          success: false,
          error: '无权访问该资源'
        }
      }

      const transaction = await prisma.transaction.findUnique({
        where: { id }
      })

      if (!transaction) {
        return {
          success: false,
          error: '交易记录不存在'
        }
      }

      return {
        success: true,
        data: transaction
      }
    } catch (error) {
      console.error('安全查询单个交易记录失败:', error)
      return {
        success: false,
        error: '查询失败'
      }
    }
  }

  /**
   * 安全创建交易记录
   */
  async createTransaction(data: any): Promise<DataAccessResult> {
    try {
      // 强制设置为当前用户ID
      const transactionData = {
        ...data,
        userId: this.currentUser.id
      }

      const transaction = await prisma.transaction.create({
        data: transactionData
      })

      return {
        success: true,
        data: transaction
      }
    } catch (error) {
      console.error('安全创建交易记录失败:', error)
      return {
        success: false,
        error: '创建失败'
      }
    }
  }

  /**
   * 安全更新交易记录
   */
  async updateTransaction(id: string, data: any): Promise<DataAccessResult> {
    try {
      // 验证资源所有权
      const hasAccess = await validateResourceOwnership(this.currentUser, id, 'transaction')
      if (!hasAccess) {
        return {
          success: false,
          error: '无权访问该资源'
        }
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data
      })

      return {
        success: true,
        data: transaction
      }
    } catch (error) {
      console.error('安全更新交易记录失败:', error)
      return {
        success: false,
        error: '更新失败'
      }
    }
  }

  /**
   * 安全删除交易记录
   */
  async deleteTransaction(id: string): Promise<DataAccessResult> {
    try {
      // 验证资源所有权
      const hasAccess = await validateResourceOwnership(this.currentUser, id, 'transaction')
      if (!hasAccess) {
        return {
          success: false,
          error: '无权访问该资源'
        }
      }

      await prisma.transaction.delete({
        where: { id }
      })

      return {
        success: true
      }
    } catch (error) {
      console.error('安全删除交易记录失败:', error)
      return {
        success: false,
        error: '删除失败'
      }
    }
  }

  /**
   * 安全获取用户统计信息
   */
  async getUserStats(): Promise<DataAccessResult> {
    try {
      const userId = this.currentUser.id

      // 获取总收入
      const totalIncome = await prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME'
        },
        _sum: {
          amount: true
        }
      })

      // 获取总支出
      const totalExpense = await prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE'
        },
        _sum: {
          amount: true
        }
      })

      // 获取交易数量
      const transactionCount = await prisma.transaction.count({
        where: { userId }
      })

      const stats = {
        totalIncome: Number(totalIncome._sum.amount || 0),
        totalExpense: Number(totalExpense._sum.amount || 0),
        balance: Number(totalIncome._sum.amount || 0) - Number(totalExpense._sum.amount || 0),
        transactionCount
      }

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('安全获取用户统计失败:', error)
      return {
        success: false,
        error: '获取统计失败'
      }
    }
  }
}

/**
 * 创建安全数据访问实例
 */
export function createSecureDataAccess(user: User): SecureDataAccess {
  return new SecureDataAccess(user)
}