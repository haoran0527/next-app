import { TransactionType } from '@prisma/client';
import { prisma } from '../prisma'
import { 
  Transaction, 
  CreateTransactionData, 
  UpdateTransactionData,
  TransactionFilters,
  PaginatedTransactions,
  TransactionStats
} from '../types/transaction'
import { 
  validateCreateTransactionData, 
  validateUpdateTransactionData 
} from '../validation/transaction-validation'
import { calculateUserBalance, validateBalanceConsistency } from './balance-service'

/**
 * 创建财务记录
 */
export async function createTransaction(
  userId: string, 
  data: CreateTransactionData
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    // 验证输入数据
    const validation = validateCreateTransactionData(data)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }

    // 创建交易记录
    const newTransaction = await prisma.transaction.create({
      data: {
        userId,
        amount: data.amount,
        type: data.type,
        category: data.category,
        description: data.description,
        date: data.date
      }
    })

    // 转换为返回类型
    const transaction: Transaction = {
      id: newTransaction.id,
      userId: newTransaction.userId,
      amount: Number(newTransaction.amount),
      type: newTransaction.type as 'INCOME' | 'EXPENSE',
      category: newTransaction.category,
      description: newTransaction.description || undefined,
      date: newTransaction.date,
      createdAt: newTransaction.createdAt,
      updatedAt: newTransaction.updatedAt
    }

    return {
      success: true,
      transaction
    }
  } catch (error) {
    console.error('创建财务记录失败:', error)
    return {
      success: false,
      error: '创建记录失败，请稍后重试'
    }
  }
}/**
 * 获取用户的财务记录列表（增强版查询服务）
 */
export async function getTransactions(
  userId: string, 
  filters?: TransactionFilters
): Promise<PaginatedTransactions> {
  try {
    const where: any = { userId }
    
    // 增强的日期范围筛选
    if (filters?.startDate || filters?.endDate) {
      where.date = {}
      if (filters.startDate) {
        // 确保开始日期从当天00:00:00开始
        const startDate = new Date(filters.startDate)
        startDate.setHours(0, 0, 0, 0)
        where.date.gte = startDate
      }
      if (filters.endDate) {
        // 确保结束日期到当天23:59:59结束
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        where.date.lte = endDate
      }
    }
    
    // 交易类型筛选
    if (filters?.type) {
      where.type = filters.type
    }
    
    // 分类筛选（支持模糊匹配）
    if (filters?.category) {
      where.category = {
        contains: filters.category,
        mode: 'insensitive'
      }
    }

    // 分页参数验证和优化
    const limit = Math.min(Math.max(filters?.limit || 20, 1), 100) // 限制在1-100之间
    const offset = Math.max(filters?.offset || 0, 0) // 确保非负数
    
    // 性能优化：并行执行计数和查询
    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' } // 二级排序确保稳定性
        ],
        take: limit,
        skip: offset,
        // 性能优化：只选择需要的字段
        select: {
          id: true,
          userId: true,
          amount: true,
          type: true,
          category: true,
          description: true,
          date: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ])

    // 转换数据类型
    const formattedTransactions: Transaction[] = transactions.map(t => ({
      id: t.id,
      userId: t.userId,
      amount: Number(t.amount),
      type: t.type as 'INCOME' | 'EXPENSE',
      category: t.category,
      description: t.description || undefined,
      date: t.date,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }))

    // 计算分页信息
    const currentPage = Math.floor(offset / limit) + 1
    const totalPages = Math.ceil(total / limit)

    return {
      transactions: formattedTransactions,
      total,
      page: currentPage,
      limit,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    }
  } catch (error) {
    console.error('获取财务记录失败:', error)
    return {
      transactions: [],
      total: 0,
      page: 1,
      limit: filters?.limit || 20,
      hasNext: false,
      hasPrev: false
    }
  }
}

/**
 * 根据ID获取单个财务记录
 */
export async function getTransactionById(
  userId: string, 
  transactionId: string
): Promise<Transaction | null> {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId // 确保数据隔离
      }
    })

    if (!transaction) {
      return null
    }

    return {
      id: transaction.id,
      userId: transaction.userId,
      amount: Number(transaction.amount),
      type: transaction.type as 'INCOME' | 'EXPENSE',
      category: transaction.category,
      description: transaction.description || undefined,
      date: transaction.date,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    }
  } catch (error) {
    console.error('获取财务记录失败:', error)
    return null
  }
}

/**
 * 更新财务记录
 */
export async function updateTransaction(
  userId: string, 
  transactionId: string, 
  data: UpdateTransactionData
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    // 验证输入数据
    const validation = validateUpdateTransactionData(data)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }

    // 检查记录是否存在且属于当前用户
    const existingTransaction = await getTransactionById(userId, transactionId)
    if (!existingTransaction) {
      return {
        success: false,
        error: '记录不存在或无权限访问'
      }
    }

    // 更新记录
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.date !== undefined && { date: data.date })
      }
    })

    // 转换为返回类型
    const transaction: Transaction = {
      id: updatedTransaction.id,
      userId: updatedTransaction.userId,
      amount: Number(updatedTransaction.amount),
      type: updatedTransaction.type as 'INCOME' | 'EXPENSE',
      category: updatedTransaction.category,
      description: updatedTransaction.description || undefined,
      date: updatedTransaction.date,
      createdAt: updatedTransaction.createdAt,
      updatedAt: updatedTransaction.updatedAt
    }

    return {
      success: true,
      transaction
    }
  } catch (error) {
    console.error('更新财务记录失败:', error)
    return {
      success: false,
      error: '更新记录失败，请稍后重试'
    }
  }
}

/**
 * 删除财务记录
 */
export async function deleteTransaction(
  userId: string, 
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查记录是否存在且属于当前用户
    const existingTransaction = await getTransactionById(userId, transactionId)
    if (!existingTransaction) {
      return {
        success: false,
        error: '记录不存在或无权限访问'
      }
    }

    // 删除记录
    await prisma.transaction.delete({
      where: { id: transactionId }
    })

    return {
      success: true
    }
  } catch (error) {
    console.error('删除财务记录失败:', error)
    return {
      success: false,
      error: '删除记录失败，请稍后重试'
    }
  }
}

/**
 * 获取用户账户余额
 */
export async function getUserBalance(userId: string): Promise<number> {
  return await calculateUserBalance(userId)
}

/**
 * 获取用户财务统计
 */
export async function getUserStats(userId: string): Promise<TransactionStats> {
  try {
    const incomeResult = await prisma.transaction.aggregate({
      where: { 
        userId,
        type: 'INCOME'
      },
      _sum: {
        amount: true
      },
      _count: true
    })

    const expenseResult = await prisma.transaction.aggregate({
      where: { 
        userId,
        type: 'EXPENSE'
      },
      _sum: {
        amount: true
      },
      _count: true
    })

    const totalIncome = Number(incomeResult._sum.amount || 0)
    const totalExpense = Number(expenseResult._sum.amount || 0)
    const balance = totalIncome - totalExpense
    const transactionCount = incomeResult._count + expenseResult._count

    return {
      totalIncome,
      totalExpense,
      balance,
      transactionCount
    }
  } catch (error) {
    console.error('获取用户统计失败:', error)
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0
    }
  }
}
/**

 * 验证用户余额一致性
 */
export async function verifyUserBalanceConsistency(userId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const validation = await validateBalanceConsistency(userId)
    
    if (!validation.isConsistent) {
      return {
        success: false,
        error: `余额不一致: 计算值=${validation.calculatedBalance}, 实际值=${validation.actualBalance}`
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('验证余额一致性失败:', error)
    return {
      success: false,
      error: '验证失败'
    }
  }
}

/**
 * 高级查询：按多个条件搜索交易记录
 */
export async function searchTransactions(
  userId: string,
  searchParams: {
    keyword?: string // 在描述中搜索关键词
    categories?: string[] // 多个分类筛选
    types?: TransactionType[] // 多个类型筛选
    amountRange?: { min?: number; max?: number } // 金额范围
    dateRange?: { start?: Date; end?: Date } // 日期范围
    sortBy?: 'date' | 'amount' | 'category' // 排序字段
    sortOrder?: 'asc' | 'desc' // 排序方向
    limit?: number
    offset?: number
  }
): Promise<PaginatedTransactions> {
  try {
    const where: any = { userId }
    
    // 关键词搜索（在描述中）
    if (searchParams.keyword) {
      where.description = {
        contains: searchParams.keyword,
        mode: 'insensitive'
      }
    }
    
    // 多分类筛选
    if (searchParams.categories && searchParams.categories.length > 0) {
      where.category = {
        in: searchParams.categories
      }
    }
    
    // 多类型筛选
    if (searchParams.types && searchParams.types.length > 0) {
      where.type = {
        in: searchParams.types
      }
    }
    
    // 金额范围筛选
    if (searchParams.amountRange) {
      where.amount = {}
      if (searchParams.amountRange.min !== undefined) {
        where.amount.gte = searchParams.amountRange.min
      }
      if (searchParams.amountRange.max !== undefined) {
        where.amount.lte = searchParams.amountRange.max
      }
    }
    
    // 日期范围筛选
    if (searchParams.dateRange) {
      where.date = {}
      if (searchParams.dateRange.start) {
        const startDate = new Date(searchParams.dateRange.start)
        startDate.setHours(0, 0, 0, 0)
        where.date.gte = startDate
      }
      if (searchParams.dateRange.end) {
        const endDate = new Date(searchParams.dateRange.end)
        endDate.setHours(23, 59, 59, 999)
        where.date.lte = endDate
      }
    }

    // 排序配置
    const orderBy: any = {}
    const sortBy = searchParams.sortBy || 'date'
    const sortOrder = searchParams.sortOrder || 'desc'
    orderBy[sortBy] = sortOrder
    
    // 如果不是按日期排序，添加日期作为二级排序
    if (sortBy !== 'date') {
      orderBy.date = 'desc'
    }

    // 分页参数
    const limit = Math.min(Math.max(searchParams.limit || 20, 1), 100)
    const offset = Math.max(searchParams.offset || 0, 0)
    
    // 并行执行查询
    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      })
    ])

    // 转换数据类型
    const formattedTransactions: Transaction[] = transactions.map(t => ({
      id: t.id,
      userId: t.userId,
      amount: Number(t.amount),
      type: t.type as 'INCOME' | 'EXPENSE',
      category: t.category,
      description: t.description || undefined,
      date: t.date,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }))

    const currentPage = Math.floor(offset / limit) + 1
    const totalPages = Math.ceil(total / limit)

    return {
      transactions: formattedTransactions,
      total,
      page: currentPage,
      limit,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    }
  } catch (error) {
    console.error('搜索交易记录失败:', error)
    return {
      transactions: [],
      total: 0,
      page: 1,
      limit: searchParams.limit || 20,
      hasNext: false,
      hasPrev: false
    }
  }
}

/**
 * 获取用户的所有分类列表
 */
export async function getUserCategories(userId: string): Promise<{
  incomeCategories: string[]
  expenseCategories: string[]
}> {
  try {
    const categories = await prisma.transaction.findMany({
      where: { userId },
      select: {
        category: true,
        type: true
      },
      distinct: ['category', 'type']
    })

    const incomeCategories: string[] = []
    const expenseCategories: string[] = []

    categories.forEach(item => {
      if (item.type === 'INCOME' && !incomeCategories.includes(item.category)) {
        incomeCategories.push(item.category)
      } else if (item.type === 'EXPENSE' && !expenseCategories.includes(item.category)) {
        expenseCategories.push(item.category)
      }
    })

    return {
      incomeCategories: incomeCategories.sort(),
      expenseCategories: expenseCategories.sort()
    }
  } catch (error) {
    console.error('获取用户分类失败:', error)
    return {
      incomeCategories: [],
      expenseCategories: []
    }
  }
}