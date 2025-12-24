import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../../prisma'
import { 
  searchTransactions, 
  getUserCategories 
} from '../transaction-service'
import { 
  getCategoryStats, 
  generatePieChartData,
  generateBarChartData,
  getDashboardSummary
} from '../statistics-service'

describe('查询和统计功能测试', () => {
  const testUserId = 'test-user-query-stats'
  
  beforeEach(async () => {
    // 清理测试数据
    await prisma.transaction.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
    
    // 创建测试用户
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'test-query@example.com',
        username: 'testqueryuser',
        password: 'hashedpassword',
        role: 'USER'
      }
    })
    
    // 创建测试数据
    await prisma.transaction.createMany({
      data: [
        {
          userId: testUserId,
          amount: 1000,
          type: 'INCOME',
          category: '工资收入',
          description: '月薪',
          date: new Date('2024-01-15')
        },
        {
          userId: testUserId,
          amount: 500,
          type: 'EXPENSE',
          category: '餐饮',
          description: '午餐',
          date: new Date('2024-01-16')
        },
        {
          userId: testUserId,
          amount: 200,
          type: 'EXPENSE',
          category: '交通',
          description: '地铁费',
          date: new Date('2024-01-17')
        }
      ]
    })
  })
  
  afterEach(async () => {
    // 清理测试数据
    await prisma.transaction.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
  })

  describe('高级搜索功能', () => {
    it('应该能够按关键词搜索', async () => {
      const result = await searchTransactions(testUserId, {
        keyword: '午餐'
      })
      
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].description).toBe('午餐')
    })

    it('应该能够按分类筛选', async () => {
      const result = await searchTransactions(testUserId, {
        categories: ['餐饮', '交通']
      })
      
      expect(result.transactions).toHaveLength(2)
      expect(result.transactions.every(t => ['餐饮', '交通'].includes(t.category))).toBe(true)
    })

    it('应该能够按金额范围筛选', async () => {
      const result = await searchTransactions(testUserId, {
        amountRange: { min: 100, max: 600 }
      })
      
      expect(result.transactions).toHaveLength(2)
      expect(result.transactions.every(t => t.amount >= 100 && t.amount <= 600)).toBe(true)
    })
  })

  describe('分类统计功能', () => {
    it('应该能够获取用户分类列表', async () => {
      const categories = await getUserCategories(testUserId)
      
      expect(categories.incomeCategories).toContain('工资收入')
      expect(categories.expenseCategories).toContain('餐饮')
      expect(categories.expenseCategories).toContain('交通')
    })

    it('应该能够获取分类统计', async () => {
      const stats = await getCategoryStats(testUserId)
      
      expect(stats).toHaveLength(3)
      
      const incomeStats = stats.find(s => s.type === 'INCOME')
      expect(incomeStats?.total).toBe(1000)
      
      const expenseStats = stats.filter(s => s.type === 'EXPENSE')
      expect(expenseStats).toHaveLength(2)
    })
  })

  describe('图表数据生成', () => {
    it('应该能够生成饼图数据', async () => {
      const pieData = await generatePieChartData(testUserId, 'EXPENSE')
      
      expect(pieData.labels).toContain('餐饮')
      expect(pieData.labels).toContain('交通')
      expect(pieData.total).toBe(700) // 500 + 200
      expect(pieData.data).toHaveLength(pieData.labels.length)
    })

    it('应该能够生成柱状图数据', async () => {
      const barData = await generateBarChartData(testUserId, 3)
      
      expect(barData.labels).toHaveLength(3)
      expect(barData.incomeData).toHaveLength(3)
      expect(barData.expenseData).toHaveLength(3)
      expect(barData.balanceData).toHaveLength(3)
    })
  })

  describe('仪表板摘要', () => {
    it('应该能够获取仪表板摘要数据', async () => {
      const summary = await getDashboardSummary(testUserId)
      
      expect(summary.currentBalance).toBe(300) // 1000 - 500 - 200
      expect(summary.monthlyIncome).toBeGreaterThanOrEqual(0)
      expect(summary.monthlyExpense).toBeGreaterThanOrEqual(0)
      expect(summary.recentTransactionTrend).toMatch(/^(up|down|stable)$/)
    })
  })
})