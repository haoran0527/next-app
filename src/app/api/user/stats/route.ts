import { NextRequest, NextResponse } from 'next/server'
import { protectStatsApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'

/**
 * 获取用户统计信息
 * GET /api/user/stats
 *
 * 查询参数:
 * - startDate: 开始日期 (可选)
 * - endDate: 结束日期 (可选)
 */
async function handleGetUserStats(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 构建过滤条件
    const filters: any = {}
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)

    console.log('获取统计数据 - filters:', filters)

    // 获取交易记录
    const transactionsResult = await secureDataAccess.getTransactions(filters)

    if (!transactionsResult.success) {
      return NextResponse.json(
        { error: '获取交易记录失败' },
        { status: 400 }
      )
    }

    const transactions = transactionsResult.data.transactions

    // 计算汇总统计
    let totalIncome = 0
    let totalExpense = 0
    const incomeMap = new Map()
    const expenseMap = new Map()

    // 分组统计
    transactions.forEach((t: any) => {
      const amount = Number(t.amount)

      // 汇总
      if (t.type === 'INCOME') {
        totalIncome += amount
      } else {
        totalExpense += amount
      }

      // 分类统计
      const map = t.type === 'INCOME' ? incomeMap : expenseMap
      const key = t.category

      if (!map.has(key)) {
        map.set(key, {
          category: t.category,
          type: t.type,
          total: 0,
          count: 0
        })
      }

      const stat = map.get(key)
      stat.total += amount
      stat.count += 1
    })

    // 转换为数组并计算百分比
    const incomeCategories = Array.from(incomeMap.values())
      .sort((a: any, b: any) => b.total - a.total)
      .map((item: any) => ({
        ...item,
        percentage: totalIncome > 0 ? ((item.total / totalIncome) * 100).toFixed(1) : 0
      }))

    const expenseCategories = Array.from(expenseMap.values())
      .sort((a: any, b: any) => b.total - a.total)
      .map((item: any) => ({
        ...item,
        percentage: totalExpense > 0 ? ((item.total / totalExpense) * 100).toFixed(1) : 0
      }))

    return NextResponse.json({
      success: true,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length,
      incomeCategories,
      expenseCategories
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
