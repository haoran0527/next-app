import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateAdminPermission } from '../admin-service'
import { User } from '../../types/auth'

// Mock Prisma
vi.mock('../../prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn()
    },
    transaction: {
      aggregate: vi.fn(),
      count: vi.fn()
    },
    session: {
      findFirst: vi.fn()
    }
  }
}))

describe('管理员服务测试', () => {
  describe('管理员权限验证', () => {
    it('应该验证有效的管理员用户', () => {
      const adminUser: User = {
        id: 'admin-1',
        email: 'admin@test.com',
        username: 'admin',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = validateAdminPermission(adminUser)
      expect(result).toBe(true)
    })

    it('应该拒绝普通用户', () => {
      const regularUser: User = {
        id: 'user-1',
        email: 'user@test.com',
        username: 'user',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = validateAdminPermission(regularUser)
      expect(result).toBe(false)
    })

    it('应该拒绝被禁用的管理员', () => {
      const inactiveAdmin: User = {
        id: 'admin-2',
        email: 'admin2@test.com',
        username: 'admin2',
        role: 'ADMIN',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = validateAdminPermission(inactiveAdmin)
      expect(result).toBe(false)
    })
  })
})