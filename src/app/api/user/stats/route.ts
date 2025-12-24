import { NextRequest, NextResponse } from 'next/server'
import { protectStatsApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'

/**
 * 获取用户统计信息
 * GET /api/user/stats
 */
async function handleGetUserStats(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    // 使用安全数据访问获取用户统计
    const statsResult = await secureDataAccess.getUserStats()

    if (!statsResult.success) {
      return NextResponse.json(
        { error: statsResult.error },
        { status: 400 }
      )
    }

    // 获取所有交易记录用于分类统计
    const transactionsResult = await secureDataAccess.getTransactions({})
    
    let categoryStats: any[] = []
    let monthlyStats: any[] = []

    if (transactionsResult.success) {
      const transactions = transactionsResult.data.transactions

      // 计算分类统计
      const categoryMap = new Map()
      let totalIncome = 0
      let totalExpense = 0

      transactions.forEach((t: any) => {
        const key = `${t.category}-${t.type}`
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            category: t.category,
            type: t.type,
            total: 0,
            count: 0
          })
        }
        const stat = categoryMap.get(key)
        stat.total += Number(t.amount)
        stat.count += 1

        if (t.type === 'INCOME') {
          totalIncome += Number(t.amount)
        } else {
          totalExpense += Number(t.amount)
        }
      })

      // 计算百分比
      categoryStats = Array.from(categoryMap.values()).map((stat: any) => ({
        ...stat,
        percentage: stat.type === 'INCOME' 
          ? totalIncome > 0 ? (stat.total / totalIncome) * 100 : 0
          : totalExpense > 0 ? (stat.total / totalExpense) * 100 : 0
      }))

      // 计算月度统计（简化版，只返回当前月）
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      
      const currentMonthTransactions = transactions.filter((t: any) => {
        const tDate = new Date(t.date)
        return tDate.getMonth() + 1 === currentMonth && tDate.getFullYear() === currentYear
      })

      const monthlyIncome = currentMonthTransactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
      
      const monthlyExpense = currentMonthTransactions
        .filter((t: any) => t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

      monthlyStats = [{
        year: currentYear,
        month: currentMonth,
        totalIncome: monthlyIncome,
        totalExpense: monthlyExpense,
        balance: monthlyIncome - monthlyExpense,
        transactionCount: currentMonthTransactions.length
      }]
    }

    // 构建仪表板摘要
    const summary: {
      currentBalance: number
      monthlyIncome: number
      monthlyExpense: number
      monthlyTransactionCount: number
      topIncomeCategory: { category: string; amount: number } | null
      topExpenseCategory: { category: string; amount: number } | null
      recentTransactionTrend: 'stable' | 'up' | 'down'
      comparedToLastMonth: {
        incomeChange: number
        expenseChange: number
        balanceChange: number
      }
    } = {
      currentBalance: statsResult.data.balance,
      monthlyIncome: monthlyStats[0]?.totalIncome || 0,
      monthlyExpense: monthlyStats[0]?.totalExpense || 0,
      monthlyTransactionCount: monthlyStats[0]?.transactionCount || 0,
      topIncomeCategory: null,
      topExpenseCategory: null,
      recentTransactionTrend: 'stable',
      comparedToLastMonth: {
        incomeChange: 0,
        expenseChange: 0,
        balanceChange: 0
      }
    }

    // 找出最大收入和支出分类
    const incomeCategories = categoryStats.filter(s => s.type === 'INCOME')
    const expenseCategories = categoryStats.filter(s => s.type === 'EXPENSE')

    if (incomeCategories.length > 0) {
      const topIncome = incomeCategories.reduce((max, current) => 
        current.total > max.total ? current : max
      )
      summary.topIncomeCategory = {
        category: topIncome.category,
        amount: topIncome.total
      }
    }

    if (expenseCategories.length > 0) {
      const topExpense = expenseCategories.reduce((max, current) => 
        current.total > max.total ? current : max
      )
      summary.topExpenseCategory = {
        category: topExpense.category,
        amount: topExpense.total
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      categoryStats,
      monthlyStats
    })
  } catch (error) {
    console.error('获取用户统计失败:', error)
    return NextResponse.json(
      { error: '获取用户统计失败' },
      { status: 500 }
    )
  }
}

// 导出受保护的API处理器
export const GET = protectStatsApi(handleGetUserStats)