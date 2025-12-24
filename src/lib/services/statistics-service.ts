import { prisma } from '../prisma'
import { CategoryStats, MonthlyStats } from '../types/transaction'
import { getMonthlyStats } from './balance-service'

// 简单的内存缓存实现
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // 生存时间（毫秒）
}

class StatisticsCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5分钟

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear(): void {
    this.cache.clear()
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// 全局缓存实例
const statsCache = new StatisticsCache()

// 定期清理过期缓存
setInterval(() => {
  statsCache.cleanup()
}, 10 * 60 * 1000) // 每10分钟清理一次

/**
 * 获取分类统计（增强版，支持缓存）
 */
export async function getCategoryStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CategoryStats[]> {
  try {
    // 生成缓存键
    const cacheKey = `category_stats_${userId}_${startDate?.getTime() || 'null'}_${endDate?.getTime() || 'null'}`
    
    // 尝试从缓存获取
    const cached = statsCache.get<CategoryStats[]>(cacheKey)
    if (cached) {
      return cached
    }

    const where: any = { userId }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.date.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.date.lte = end
      }
    }

    // 获取所有交易记录
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        category: true,
        type: true,
        amount: true
      }
    })

    // 按分类和类型分组统计
    const categoryMap = new Map<string, {
      type: 'INCOME' | 'EXPENSE'
      total: number
      count: number
    }>()

    let totalAmount = 0

    for (const transaction of transactions) {
      const key = `${transaction.category}-${transaction.type}`
      const amount = Number(transaction.amount)
      totalAmount += amount

      if (categoryMap.has(key)) {
        const existing = categoryMap.get(key)!
        existing.total += amount
        existing.count += 1
      } else {
        categoryMap.set(key, {
          type: transaction.type as 'INCOME' | 'EXPENSE',
          total: amount,
          count: 1
        })
      }
    }

    // 转换为结果格式
    const result: CategoryStats[] = []
    const entries = Array.from(categoryMap.entries())
    for (const [key, data] of entries) {
      const category = key.split('-')[0]
      result.push({
        category,
        type: data.type,
        total: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0
      })
    }

    // 按总额降序排序
    const sortedResult = result.sort((a, b) => b.total - a.total)
    
    // 缓存结果
    statsCache.set(cacheKey, sortedResult)
    
    return sortedResult
  } catch (error) {
    console.error('获取分类统计失败:', error)
    return []
  }
}

/**
 * 获取月度统计（增强版，支持缓存）
 */
export async function getUserMonthlyStats(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyStats> {
  const cacheKey = `monthly_stats_${userId}_${year}_${month}`
  
  // 尝试从缓存获取
  const cached = statsCache.get<MonthlyStats>(cacheKey)
  if (cached) {
    return cached
  }

  const result = await getMonthlyStats(userId, year, month)
  
  // 缓存结果
  statsCache.set(cacheKey, result)
  
  return result
}

/**
 * 获取年度统计
 */
export async function getYearlyStats(
  userId: string,
  year: number
): Promise<{
  year: number
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
  monthlyBreakdown: MonthlyStats[]
}> {
  try {
    const monthlyStats: MonthlyStats[] = []
    
    // 获取每个月的统计
    for (let month = 1; month <= 12; month++) {
      const stats = await getMonthlyStats(userId, year, month)
      monthlyStats.push(stats)
    }

    // 计算年度总计
    const totalIncome = monthlyStats.reduce((sum, stats) => sum + stats.totalIncome, 0)
    const totalExpense = monthlyStats.reduce((sum, stats) => sum + stats.totalExpense, 0)
    const balance = totalIncome - totalExpense
    const transactionCount = monthlyStats.reduce((sum, stats) => sum + stats.transactionCount, 0)

    return {
      year,
      totalIncome,
      totalExpense,
      balance,
      transactionCount,
      monthlyBreakdown: monthlyStats
    }
  } catch (error) {
    console.error('获取年度统计失败:', error)
    return {
      year,
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0,
      monthlyBreakdown: []
    }
  }
}/**
 * 获取收
支趋势数据
 */
export async function getIncomeExpenseTrend(
  userId: string,
  months: number = 12
): Promise<{
  month: string
  income: number
  expense: number
  balance: number
}[]> {
  try {
    const result = []
    const currentDate = new Date()
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      
      const stats = await getMonthlyStats(userId, year, month)
      
      result.push({
        month: `${year}-${month.toString().padStart(2, '0')}`,
        income: stats.totalIncome,
        expense: stats.totalExpense,
        balance: stats.balance
      })
    }
    
    return result
  } catch (error) {
    console.error('获取收支趋势失败:', error)
    return []
  }
}

/**
 * 获取最近交易统计
 */
export async function getRecentTransactionStats(
  userId: string,
  days: number = 7
): Promise<{
  totalTransactions: number
  totalIncome: number
  totalExpense: number
  averageTransactionAmount: number
  mostUsedCategory: string | null
}> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate
        }
      },
      select: {
        amount: true,
        type: true,
        category: true
      }
    })

    let totalIncome = 0
    let totalExpense = 0
    const categoryCount = new Map<string, number>()

    for (const transaction of transactions) {
      const amount = Number(transaction.amount)
      
      if (transaction.type === 'INCOME') {
        totalIncome += amount
      } else {
        totalExpense += amount
      }

      // 统计分类使用频率
      const count = categoryCount.get(transaction.category) || 0
      categoryCount.set(transaction.category, count + 1)
    }

    // 找出最常用的分类
    let mostUsedCategory: string | null = null
    let maxCount = 0
    const categoryEntries = Array.from(categoryCount.entries())
    for (const [category, count] of categoryEntries) {
      if (count > maxCount) {
        maxCount = count
        mostUsedCategory = category
      }
    }

    const totalAmount = totalIncome + totalExpense
    const averageTransactionAmount = transactions.length > 0 ? totalAmount / transactions.length : 0

    return {
      totalTransactions: transactions.length,
      totalIncome,
      totalExpense,
      averageTransactionAmount,
      mostUsedCategory
    }
  } catch (error) {
    console.error('获取最近交易统计失败:', error)
    return {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpense: 0,
      averageTransactionAmount: 0,
      mostUsedCategory: null
    }
  }
}
/**
 *
 生成饼图数据（用于分类统计）
 */
export async function generatePieChartData(
  userId: string,
  type: 'INCOME' | 'EXPENSE',
  startDate?: Date,
  endDate?: Date
): Promise<{
  labels: string[]
  data: number[]
  colors: string[]
  total: number
}> {
  try {
    const cacheKey = `pie_chart_${userId}_${type}_${startDate?.getTime() || 'null'}_${endDate?.getTime() || 'null'}`
    
    // 尝试从缓存获取
    const cached = statsCache.get<any>(cacheKey)
    if (cached) {
      return cached
    }

    const categoryStats = await getCategoryStats(userId, startDate, endDate)
    const filteredStats = categoryStats.filter(stat => stat.type === type)
    
    // 预定义颜色数组
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ]
    
    const labels = filteredStats.map(stat => stat.category)
    const data = filteredStats.map(stat => stat.total)
    const total = data.reduce((sum, value) => sum + value, 0)
    
    const result = {
      labels,
      data,
      colors: colors.slice(0, labels.length),
      total
    }
    
    // 缓存结果
    statsCache.set(cacheKey, result)
    
    return result
  } catch (error) {
    console.error('生成饼图数据失败:', error)
    return {
      labels: [],
      data: [],
      colors: [],
      total: 0
    }
  }
}

/**
 * 生成柱状图数据（用于月度趋势）
 */
export async function generateBarChartData(
  userId: string,
  months: number = 12
): Promise<{
  labels: string[]
  incomeData: number[]
  expenseData: number[]
  balanceData: number[]
}> {
  try {
    const cacheKey = `bar_chart_${userId}_${months}`
    
    // 尝试从缓存获取
    const cached = statsCache.get<any>(cacheKey)
    if (cached) {
      return cached
    }

    const trendData = await getIncomeExpenseTrend(userId, months)
    
    const labels = trendData.map(item => item.month)
    const incomeData = trendData.map(item => item.income)
    const expenseData = trendData.map(item => item.expense)
    const balanceData = trendData.map(item => item.balance)
    
    const result = {
      labels,
      incomeData,
      expenseData,
      balanceData
    }
    
    // 缓存结果
    statsCache.set(cacheKey, result)
    
    return result
  } catch (error) {
    console.error('生成柱状图数据失败:', error)
    return {
      labels: [],
      incomeData: [],
      expenseData: [],
      balanceData: []
    }
  }
}

/**
 * 生成折线图数据（用于余额趋势）
 */
export async function generateLineChartData(
  userId: string,
  days: number = 30
): Promise<{
  labels: string[]
  balanceData: number[]
  cumulativeIncomeData: number[]
  cumulativeExpenseData: number[]
}> {
  try {
    const cacheKey = `line_chart_${userId}_${days}`
    
    // 尝试从缓存获取
    const cached = statsCache.get<any>(cacheKey)
    if (cached) {
      return cached
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 获取指定时间范围内的所有交易
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // 生成每日数据
    const labels: string[] = []
    const balanceData: number[] = []
    const cumulativeIncomeData: number[] = []
    const cumulativeExpenseData: number[] = []
    
    let cumulativeIncome = 0
    let cumulativeExpense = 0
    let currentBalance = 0

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      const dateStr = currentDate.toISOString().split('T')[0]
      labels.push(dateStr)
      
      // 计算当天的交易
      const dayTransactions = transactions.filter(t => {
        const transactionDate = t.date.toISOString().split('T')[0]
        return transactionDate === dateStr
      })
      
      let dayIncome = 0
      let dayExpense = 0
      
      dayTransactions.forEach(t => {
        const amount = Number(t.amount)
        if (t.type === 'INCOME') {
          dayIncome += amount
          cumulativeIncome += amount
          currentBalance += amount
        } else {
          dayExpense += amount
          cumulativeExpense += amount
          currentBalance -= amount
        }
      })
      
      cumulativeIncomeData.push(cumulativeIncome)
      cumulativeExpenseData.push(cumulativeExpense)
      balanceData.push(currentBalance)
    }
    
    const result = {
      labels,
      balanceData,
      cumulativeIncomeData,
      cumulativeExpenseData
    }
    
    // 缓存结果
    statsCache.set(cacheKey, result)
    
    return result
  } catch (error) {
    console.error('生成折线图数据失败:', error)
    return {
      labels: [],
      balanceData: [],
      cumulativeIncomeData: [],
      cumulativeExpenseData: []
    }
  }
}

/**
 * 获取仪表板统计摘要
 */
export async function getDashboardSummary(userId: string): Promise<{
  currentBalance: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyTransactionCount: number
  topIncomeCategory: { category: string; amount: number } | null
  topExpenseCategory: { category: string; amount: number } | null
  recentTransactionTrend: 'up' | 'down' | 'stable'
  comparedToLastMonth: {
    incomeChange: number // 百分比
    expenseChange: number // 百分比
    balanceChange: number // 绝对值
  }
}> {
  try {
    const cacheKey = `dashboard_summary_${userId}`
    
    // 尝试从缓存获取（较短的缓存时间）
    const cached = statsCache.get<any>(cacheKey)
    if (cached) {
      return cached
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    // 获取当月统计
    const currentMonthStats = await getUserMonthlyStats(userId, currentYear, currentMonth)
    
    // 获取上月统计（用于比较）
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const lastMonthStats = await getUserMonthlyStats(userId, lastMonthYear, lastMonth)
    
    // 获取当前余额
    const currentBalance = await getUserBalance(userId)
    
    // 获取当月分类统计
    const monthStart = new Date(currentYear, currentMonth - 1, 1)
    const monthEnd = new Date(currentYear, currentMonth, 0)
    const categoryStats = await getCategoryStats(userId, monthStart, monthEnd)
    
    // 找出收入和支出最高的分类
    const incomeCategories = categoryStats.filter(stat => stat.type === 'INCOME')
    const expenseCategories = categoryStats.filter(stat => stat.type === 'EXPENSE')
    
    const topIncomeCategory = incomeCategories.length > 0 
      ? { category: incomeCategories[0].category, amount: incomeCategories[0].total }
      : null
      
    const topExpenseCategory = expenseCategories.length > 0
      ? { category: expenseCategories[0].category, amount: expenseCategories[0].total }
      : null
    
    // 计算与上月的变化
    const incomeChange = lastMonthStats.totalIncome > 0 
      ? ((currentMonthStats.totalIncome - lastMonthStats.totalIncome) / lastMonthStats.totalIncome) * 100
      : 0
      
    const expenseChange = lastMonthStats.totalExpense > 0
      ? ((currentMonthStats.totalExpense - lastMonthStats.totalExpense) / lastMonthStats.totalExpense) * 100
      : 0
      
    const balanceChange = currentMonthStats.balance - lastMonthStats.balance
    
    // 判断最近交易趋势（基于最近7天的交易数量）
    const recentStats = await getRecentTransactionStats(userId, 7)
    const previousWeekStats = await getRecentTransactionStats(userId, 14) // 前两周
    
    let recentTransactionTrend: 'up' | 'down' | 'stable' = 'stable'
    if (recentStats.totalTransactions > previousWeekStats.totalTransactions * 0.5) {
      recentTransactionTrend = 'up'
    } else if (recentStats.totalTransactions < previousWeekStats.totalTransactions * 0.3) {
      recentTransactionTrend = 'down'
    }
    
    const result = {
      currentBalance,
      monthlyIncome: currentMonthStats.totalIncome,
      monthlyExpense: currentMonthStats.totalExpense,
      monthlyTransactionCount: currentMonthStats.transactionCount,
      topIncomeCategory,
      topExpenseCategory,
      recentTransactionTrend,
      comparedToLastMonth: {
        incomeChange,
        expenseChange,
        balanceChange
      }
    }
    
    // 缓存结果（1分钟缓存）
    statsCache.set(cacheKey, result, 60 * 1000)
    
    return result
  } catch (error) {
    console.error('获取仪表板摘要失败:', error)
    return {
      currentBalance: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
      monthlyTransactionCount: 0,
      topIncomeCategory: null,
      topExpenseCategory: null,
      recentTransactionTrend: 'stable',
      comparedToLastMonth: {
        incomeChange: 0,
        expenseChange: 0,
        balanceChange: 0
      }
    }
  }
}

/**
 * 清除用户相关的统计缓存
 */
export function clearUserStatsCache(userId: string): void {
  // 清除所有包含该用户ID的缓存项
  const keysToDelete: string[] = []
  
  // 由于Map没有直接的方法来获取所有键，我们需要通过反射访问
  // 这里我们简单地清除整个缓存
  statsCache.clear()
}

// 导入getUserBalance函数
async function getUserBalance(userId: string): Promise<number> {
  try {
    const result = await prisma.transaction.aggregate({
      where: { userId },
      _sum: {
        amount: true
      }
    })
    
    const incomeSum = await prisma.transaction.aggregate({
      where: { 
        userId,
        type: 'INCOME'
      },
      _sum: {
        amount: true
      }
    })
    
    const expenseSum = await prisma.transaction.aggregate({
      where: { 
        userId,
        type: 'EXPENSE'
      },
      _sum: {
        amount: true
      }
    })
    
    const totalIncome = Number(incomeSum._sum.amount || 0)
    const totalExpense = Number(expenseSum._sum.amount || 0)
    
    return totalIncome - totalExpense
  } catch (error) {
    console.error('获取用户余额失败:', error)
    return 0
  }
}