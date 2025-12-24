import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  transactionsToCsv, 
  exportUserTransactionsCsv,
  validateExportPermission,
  getExportStats
} from '../export-service'
import { Transaction } from '../../types/transaction'

// Mock transaction-service
vi.mock('../transaction-service', () => ({
  getTransactions: vi.fn()
}))

import { getTransactions } from '../transaction-service'

describe('Export Service', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      userId: 'user1',
      amount: 100.50,
      type: 'INCOME',
      category: '工资收入',
      description: '月薪',
      date: new Date('2024-01-15'),
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z')
    },
    {
      id: '2',
      userId: 'user1',
      amount: 50.25,
      type: 'EXPENSE',
      category: '餐饮',
      description: '午餐,包含"特殊"字符',
      date: new Date('2024-01-16'),
      createdAt: new Date('2024-01-16T12:00:00Z'),
      updatedAt: new Date('2024-01-16T12:00:00Z')
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('transactionsToCsv', () => {
    it('应该正确转换交易记录为CSV格式', () => {
      const csv = transactionsToCsv(mockTransactions)
      
      expect(csv).toContain('日期,类型,分类,金额,描述,创建时间')
      expect(csv).toContain('收入')
      expect(csv).toContain('支出')
      expect(csv).toContain('100.50')
      expect(csv).toContain('50.25')
    })

    it('应该正确处理CSV中的特殊字符', () => {
      const csv = transactionsToCsv(mockTransactions)
      
      // 包含逗号和引号的描述应该被正确转义
      expect(csv).toContain('"午餐,包含""特殊""字符"')
    })

    it('应该支持不包含头部的选项', () => {
      const csv = transactionsToCsv(mockTransactions, { includeHeaders: false })
      
      expect(csv).not.toContain('日期,类型,分类,金额,描述,创建时间')
      expect(csv).toContain('100.50')
    })

    it('应该支持ISO日期格式', () => {
      const csv = transactionsToCsv(mockTransactions, { dateFormat: 'ISO' })
      
      expect(csv).toContain('2024-01-15')
      expect(csv).toContain('2024-01-16')
    })
  })

  describe('validateExportPermission', () => {
    it('应该允许用户导出自己的数据', () => {
      const result = validateExportPermission('user1', 'user1')
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('应该拒绝用户导出其他用户的数据', () => {
      const result = validateExportPermission('user1', 'user2')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('无权限导出其他用户的数据')
    })
  })

  describe('exportUserTransactionsCsv', () => {
    it('应该成功导出用户的财务记录', async () => {
      // Mock getTransactions 返回
      vi.mocked(getTransactions).mockResolvedValue({
        transactions: mockTransactions,
        total: 2,
        page: 1,
        limit: 10000,
        hasNext: false,
        hasPrev: false
      })

      const result = await exportUserTransactionsCsv('user1')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.filename).toBeDefined()
      expect(result.filename).toMatch(/财务记录_\d{8}\.csv/)
    })

    it('应该处理没有记录的情况', async () => {
      // Mock getTransactions 返回空结果
      vi.mocked(getTransactions).mockResolvedValue({
        transactions: [],
        total: 0,
        page: 1,
        limit: 10000,
        hasNext: false,
        hasPrev: false
      })

      const result = await exportUserTransactionsCsv('user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('没有找到符合条件的财务记录')
    })

    it('应该处理日期范围导出', async () => {
      vi.mocked(getTransactions).mockResolvedValue({
        transactions: mockTransactions,
        total: 2,
        page: 1,
        limit: 10000,
        hasNext: false,
        hasPrev: false
      })

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      
      const result = await exportUserTransactionsCsv('user1', {
        startDate,
        endDate
      })

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/财务记录_20240101_20240131\.csv/)
      
      // 验证getTransactions被正确调用
      expect(getTransactions).toHaveBeenCalledWith('user1', {
        startDate,
        endDate,
        limit: 10000
      })
    })
  })

  describe('getExportStats', () => {
    it('应该返回正确的导出统计信息', async () => {
      vi.mocked(getTransactions).mockResolvedValue({
        transactions: [],
        total: 150,
        page: 1,
        limit: 1,
        hasNext: false,
        hasPrev: false
      })

      const stats = await getExportStats('user1')

      expect(stats.totalRecords).toBe(150)
      expect(stats.estimatedFileSize).toBe(15000) // 150 * 100
      expect(stats.dateRange).toEqual({})
    })

    it('应该包含日期范围信息', async () => {
      vi.mocked(getTransactions).mockResolvedValue({
        transactions: [],
        total: 50,
        page: 1,
        limit: 1,
        hasNext: false,
        hasPrev: false
      })

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      
      const stats = await getExportStats('user1', { startDate, endDate })

      expect(stats.dateRange.start).toEqual(startDate)
      expect(stats.dateRange.end).toEqual(endDate)
    })
  })
})