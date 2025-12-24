import { describe, it, expect, beforeEach } from 'vitest'
import { 
  validateQueryIsolation,
  addUserIsolation,
  validateUpdateIsolation,
  createSecureQuery 
} from '../data-isolation-validator'
import { User } from '../../types/auth'

describe('数据隔离验证工具测试', () => {
  let regularUser: User
  let adminUser: User

  beforeEach(() => {
    regularUser = {
      id: 'user-1',
      email: 'user1@example.com',
      username: 'user1',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    adminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      username: 'admin',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  describe('查询隔离验证', () => {
    it('应该验证包含正确userId的交易查询', () => {
      const whereClause = { userId: regularUser.id }
      const result = validateQueryIsolation(whereClause, regularUser, 'transaction')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝缺少userId的交易查询（普通用户）', () => {
      const whereClause = { category: 'food' }
      const result = validateQueryIsolation(whereClause, regularUser, 'transaction')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('交易记录查询缺少userId过滤条件')
    })

    it('应该拒绝访问其他用户数据的查询', () => {
      const whereClause = { userId: 'other-user-id' }
      const result = validateQueryIsolation(whereClause, regularUser, 'transaction')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('尝试访问其他用户的交易记录')
    })

    it('管理员应该能够查询任何数据', () => {
      const whereClause = { userId: 'any-user-id' }
      const result = validateQueryIsolation(whereClause, adminUser, 'transaction')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该对OR条件发出警告', () => {
      const whereClause = { 
        userId: regularUser.id,
        OR: [{ category: 'food' }, { category: 'transport' }]
      }
      const result = validateQueryIsolation(whereClause, regularUser, 'transaction')
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('使用OR条件可能绕过数据隔离，请仔细检查')
    })
  })

  describe('用户隔离条件添加', () => {
    it('应该为普通用户自动添加userId过滤', () => {
      const whereClause = { category: 'food' }
      const result = addUserIsolation(whereClause, regularUser, 'transaction')
      
      expect(result.userId).toBe(regularUser.id)
      expect(result.category).toBe('food')
    })

    it('管理员查询应该保持原样', () => {
      const whereClause = { category: 'food' }
      const result = addUserIsolation(whereClause, adminUser, 'transaction')
      
      expect(result.userId).toBeUndefined()
      expect(result.category).toBe('food')
    })

    it('应该为用户查询添加正确的隔离条件', () => {
      const whereClause = { isActive: true }
      const result = addUserIsolation(whereClause, regularUser, 'user')
      
      expect(result.id).toBe(regularUser.id)
      expect(result.isActive).toBe(true)
    })
  })

  describe('更新隔离验证', () => {
    it('应该允许普通用户更新自己的数据', () => {
      const updateData = { category: 'new-category' }
      const result = validateUpdateIsolation(updateData, regularUser, 'transaction')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该阻止普通用户修改userId', () => {
      const updateData = { userId: 'other-user-id' }
      const result = validateUpdateIsolation(updateData, regularUser, 'transaction')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('不能将交易记录分配给其他用户')
    })

    it('应该阻止普通用户修改角色', () => {
      const updateData = { role: 'ADMIN' }
      const result = validateUpdateIsolation(updateData, regularUser, 'user')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('普通用户不能修改角色')
    })

    it('管理员应该能够修改任何数据', () => {
      const updateData = { role: 'ADMIN', userId: 'any-user-id' }
      const result = validateUpdateIsolation(updateData, adminUser, 'user')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('安全查询构建器', () => {
    it('应该创建带有用户隔离的查询构建器', () => {
      const builder = createSecureQuery(regularUser, 'transaction')
      const whereClause = builder.build()
      
      expect(whereClause.userId).toBe(regularUser.id)
    })

    it('应该允许添加额外的查询条件', () => {
      const builder = createSecureQuery(regularUser, 'transaction')
        .where('category', 'food')
        .where('amount', { gte: 100 })
      
      const whereClause = builder.build()
      
      expect(whereClause.userId).toBe(regularUser.id)
      expect(whereClause.category).toBe('food')
      expect(whereClause.amount).toEqual({ gte: 100 })
    })

    it('应该支持日期范围查询', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      
      const builder = createSecureQuery(regularUser, 'transaction')
        .dateRange('date', startDate, endDate)
      
      const whereClause = builder.build()
      
      expect(whereClause.userId).toBe(regularUser.id)
      expect(whereClause.date).toEqual({
        gte: startDate,
        lte: endDate
      })
    })

    it('应该支持IN查询', () => {
      const categories = ['food', 'transport', 'entertainment']
      
      const builder = createSecureQuery(regularUser, 'transaction')
        .whereIn('category', categories)
      
      const whereClause = builder.build()
      
      expect(whereClause.userId).toBe(regularUser.id)
      expect(whereClause.category).toEqual({ in: categories })
    })

    it('应该在验证失败时抛出错误', () => {
      const builder = createSecureQuery(regularUser, 'transaction')
      // 手动修改内部状态来模拟无效查询
      builder['whereClause'] = { userId: 'other-user-id' }
      
      expect(() => builder.build()).toThrow('查询验证失败')
    })
  })
})