import { prisma } from '../prisma'
import { BalanceHistory, MonthlyStats } from '../types/transaction'

/**
 * 实时计算用户余额
 */
export async function calculateUserBalance(userId: string): Promise<number> {
  try {
    // 分别计算收入和支出总额
    const [incomeResult, expenseResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { 
          userId,
          type: 'INCOME'
        },
        _sum: {
          amount: true
        }
      }),
      prisma.transaction.aggregate({
        where: { 
          userId,
          type: 'EXPENSE'
        },
        _sum: {
          amount: true
        }
      })
    ])

    const totalIncome = Number(incomeResult._sum.amount || 0)
    const totalExpense = Number(expenseResult._sum.amount || 0)
    
    return totalIncome - totalExpense
  } catch (error) {
    console.error('计算用户余额失败:', error)
    return 0
  }
}

/**
 * 获取指定日期的余额
 */
export async function getBalanceAtDate(userId: string, date: Date): Promise<number> {
  try {
    // 计算指定日期之前的所有交易
    const [incomeResult, expenseResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { 
          userId,
          type: 'INCOME',
          date: {
            lte: date
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.transaction.aggregate({
        where: { 
          userId,
          type: 'EXPENSE',
          date: {
            lte: date
          }
        },
        _sum: {
          amount: true
        }
      })
    ])

    const totalIncome = Number(incomeResult._sum.amount || 0)
    const totalExpense = Number(expenseResult._sum.amount || 0)
    
    return totalIncome - totalExpense
  } catch (error) {
    console.error('获取指定日期余额失败:', error)
    return 0
  }
}

/**
 * 获取余额历史记录
 */
export async function getBalanceHistory(
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<BalanceHistory[]> {
  try {
    // 获取指定时间范围内的所有交易日期
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        date: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    // 获取唯一的日期
    const dateStrings = transactions.map(t => t.date.toDateString())
    const uniqueDateStrings = Array.from(new Set(dateStrings))
    const uniqueDates = uniqueDateStrings
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime())

    // 为每个日期计算余额
    const balanceHistory: BalanceHistory[] = []
    
    for (const date of uniqueDates) {
      const balance = await getBalanceAtDate(userId, date)
      balanceHistory.push({
        date,
        balance
      })
    }

    return balanceHistory
  } catch (error) {
    console.error('获取余额历史失败:', error)
    return []
  }
}

/**
 * 获取月度统计
 */
export async function getMonthlyStats(
  userId: string, 
  year: number, 
  month: number
): Promise<MonthlyStats> {
  try {
    // 计算月份的开始和结束日期
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // 获取该月的收入和支出统计
    const [incomeResult, expenseResult, transactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.transaction.count({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    ])

    const totalIncome = Number(incomeResult._sum.amount || 0)
    const totalExpense = Number(expenseResult._sum.amount || 0)
    const balance = totalIncome - totalExpense

    return {
      year,
      month,
      totalIncome,
      totalExpense,
      balance,
      transactionCount
    }
  } catch (error) {
    console.error('获取月度统计失败:', error)
    return {
      year,
      month,
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0
    }
  }
}/**

 * 余额一致性检查
 * 验证计算的余额是否与实际交易记录一致
 */
export async function validateBalanceConsistency(userId: string): Promise<{
  isConsistent: boolean
  calculatedBalance: number
  actualBalance: number
  error?: string
}> {
  try {
    // 方法1: 直接计算收入减支出
    const calculatedBalance = await calculateUserBalance(userId)

    // 方法2: 通过所有交易记录验证
    const allTransactions = await prisma.transaction.findMany({
      where: { userId },
      select: {
        amount: true,
        type: true
      }
    })

    let actualBalance = 0
    for (const transaction of allTransactions) {
      const amount = Number(transaction.amount)
      if (transaction.type === 'INCOME') {
        actualBalance += amount
      } else {
        actualBalance -= amount
      }
    }

    const isConsistent = Math.abs(calculatedBalance - actualBalance) < 0.01 // 允许小数精度误差

    return {
      isConsistent,
      calculatedBalance,
      actualBalance
    }
  } catch (error) {
    console.error('余额一致性检查失败:', error)
    return {
      isConsistent: false,
      calculatedBalance: 0,
      actualBalance: 0,
      error: '检查失败'
    }
  }
}

/**
 * 批量更新用户余额（用于数据修复）
 */
export async function recalculateUserBalance(userId: string): Promise<{
  success: boolean
  newBalance: number
  error?: string
}> {
  try {
    // 重新计算余额
    const newBalance = await calculateUserBalance(userId)
    
    // 验证一致性
    const validation = await validateBalanceConsistency(userId)
    
    if (!validation.isConsistent) {
      return {
        success: false,
        newBalance: 0,
        error: '余额计算不一致'
      }
    }

    return {
      success: true,
      newBalance
    }
  } catch (error) {
    console.error('重新计算余额失败:', error)
    return {
      success: false,
      newBalance: 0,
      error: '计算失败'
    }
  }
}

/**
 * 获取余额变化趋势
 */
export async function getBalanceTrend(
  userId: string, 
  days: number = 30
): Promise<BalanceHistory[]> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return await getBalanceHistory(userId, startDate, endDate)
  } catch (error) {
    console.error('获取余额趋势失败:', error)
    return []
  }
}