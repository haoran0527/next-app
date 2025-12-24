import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../../prisma'
import { User } from '../../types/auth'
import {
  logAdminAction,
  getAuditLogs,
  getAdminActionHistory,
  getResourceActionHistory,
  cleanupOldAuditLogs,
  ADMIN_ACTIONS
} from '../audit-log-service'

describe('审计日志服务测试', () => {
  let adminUser: User
  let regularUser: User

  beforeEach(async () => {
    // 清理测试数据
    await prisma.adminLog.deleteMany()
    await prisma.user.deleteMany()

    // 创建测试用户
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        username: 'admin',
        password: 'hashedpassword',
        role: 'ADMIN',
        isActive: true
      }
    })

    regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        username: 'user',
        password: 'hashedpassword',
        role: 'USER',
        isActive: true
      }
    })
  })

  afterEach(async () => {
    // 清理测试数据
    await prisma.adminLog.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('记录管理员操作', () => {
    it('应该成功记录管理员操作', async () => {
      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.USER_CREATE,
        regularUser.id,
        { targetUser: { email: regularUser.email } }
      )

      const logs = await prisma.adminLog.findMany()
      expect(logs).toHaveLength(1)
      expect(logs[0].adminId).toBe(adminUser.id)
      expect(logs[0].action).toBe(ADMIN_ACTIONS.USER_CREATE)
      expect(logs[0].targetId).toBe(regularUser.id)
    })

    it('应该处理没有目标ID的操作', async () => {
      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.SYSTEM_STATS_VIEW,
        undefined,
        { timestamp: new Date().toISOString() }
      )

      const logs = await prisma.adminLog.findMany()
      expect(logs).toHaveLength(1)
      expect(logs[0].targetId).toBeNull()
    })

    it('应该处理记录失败而不抛出错误', async () => {
      // 使用无效的管理员ID来模拟错误
      const invalidAdmin = { ...adminUser, id: 'invalid-id' }
      
      // 这不应该抛出错误
      await expect(
        logAdminAction(invalidAdmin, ADMIN_ACTIONS.USER_CREATE)
      ).resolves.toBeUndefined()
    })
  })

  describe('获取审计日志', () => {
    beforeEach(async () => {
      // 创建测试日志数据
      await prisma.adminLog.createMany({
        data: [
          {
            adminId: adminUser.id,
            action: ADMIN_ACTIONS.USER_CREATE,
            targetId: regularUser.id,
            details: { test: 'data1' }
          },
          {
            adminId: adminUser.id,
            action: ADMIN_ACTIONS.USER_UPDATE,
            targetId: regularUser.id,
            details: { test: 'data2' }
          },
          {
            adminId: adminUser.id,
            action: ADMIN_ACTIONS.SYSTEM_STATS_VIEW,
            details: { test: 'data3' }
          }
        ]
      })
    })

    it('应该获取所有审计日志', async () => {
      const result = await getAuditLogs(adminUser)
      
      expect(result.logs).toHaveLength(3)
      expect(result.pagination.total).toBe(3)
      expect(result.pagination.page).toBe(1)
    })

    it('应该支持分页', async () => {
      const result = await getAuditLogs(adminUser, { page: 1, limit: 2 })
      
      expect(result.logs).toHaveLength(2)
      expect(result.pagination.total).toBe(3)
      expect(result.pagination.totalPages).toBe(2)
    })

    it('应该支持按管理员ID筛选', async () => {
      const result = await getAuditLogs(adminUser, { adminId: adminUser.id })
      
      expect(result.logs).toHaveLength(3)
      expect(result.logs.every(log => log.adminId === adminUser.id)).toBe(true)
    })

    it('应该支持按操作类型筛选', async () => {
      const result = await getAuditLogs(adminUser, { action: 'USER_CREATE' })
      
      expect(result.logs).toHaveLength(1)
      expect(result.logs[0].action).toBe(ADMIN_ACTIONS.USER_CREATE)
    })

    it('应该支持按目标ID筛选', async () => {
      const result = await getAuditLogs(adminUser, { targetId: regularUser.id })
      
      expect(result.logs).toHaveLength(2)
      expect(result.logs.every(log => log.targetId === regularUser.id)).toBe(true)
    })

    it('应该支持日期范围筛选', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
      
      const result = await getAuditLogs(adminUser, {
        startDate: oneHourAgo,
        endDate: oneHourLater
      })
      
      expect(result.logs).toHaveLength(3)
    })

    it('应该拒绝非管理员用户', async () => {
      await expect(getAuditLogs(regularUser)).rejects.toThrow('权限不足：需要管理员权限')
    })

    it('应该拒绝被禁用的管理员', async () => {
      const disabledAdmin = { ...adminUser, isActive: false }
      await expect(getAuditLogs(disabledAdmin)).rejects.toThrow('权限不足：需要管理员权限')
    })
  })

  describe('获取管理员操作历史', () => {
    beforeEach(async () => {
      await prisma.adminLog.create({
        data: {
          adminId: adminUser.id,
          action: ADMIN_ACTIONS.USER_CREATE,
          targetId: regularUser.id
        }
      })
    })

    it('应该获取特定管理员的操作历史', async () => {
      const result = await getAdminActionHistory(adminUser, adminUser.id)
      
      expect(result.logs).toHaveLength(1)
      expect(result.logs[0].adminId).toBe(adminUser.id)
    })
  })

  describe('获取资源操作历史', () => {
    beforeEach(async () => {
      await prisma.adminLog.create({
        data: {
          adminId: adminUser.id,
          action: ADMIN_ACTIONS.USER_UPDATE,
          targetId: regularUser.id
        }
      })
    })

    it('应该获取特定资源的操作历史', async () => {
      const result = await getResourceActionHistory(adminUser, regularUser.id)
      
      expect(result.logs).toHaveLength(1)
      expect(result.logs[0].targetId).toBe(regularUser.id)
    })
  })

  describe('清理旧审计日志', () => {
    beforeEach(async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 100) // 100天前

      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 10) // 10天前

      // 创建旧日志
      await prisma.adminLog.create({
        data: {
          adminId: adminUser.id,
          action: ADMIN_ACTIONS.USER_CREATE,
          createdAt: oldDate
        }
      })

      // 创建新日志
      await prisma.adminLog.create({
        data: {
          adminId: adminUser.id,
          action: ADMIN_ACTIONS.USER_UPDATE,
          createdAt: recentDate
        }
      })
    })

    it('应该清理指定天数之前的日志', async () => {
      const deletedCount = await cleanupOldAuditLogs(adminUser, 30)
      
      expect(deletedCount).toBe(1)
      
      const remainingLogs = await prisma.adminLog.findMany()
      expect(remainingLogs).toHaveLength(2) // 1个剩余的旧日志 + 1个清理操作日志
    })

    it('应该拒绝非管理员用户', async () => {
      await expect(cleanupOldAuditLogs(regularUser, 30)).rejects.toThrow('权限不足：需要管理员权限')
    })

    it('应该记录清理操作', async () => {
      await cleanupOldAuditLogs(adminUser, 30)
      
      const logs = await prisma.adminLog.findMany({
        where: { action: 'AUDIT_LOG_CLEANUP' }
      })
      
      expect(logs).toHaveLength(1)
    })
  })

  describe('操作常量', () => {
    it('应该定义所有必需的操作类型', async () => {
      expect(ADMIN_ACTIONS.USER_CREATE).toBe('USER_CREATE')
      expect(ADMIN_ACTIONS.USER_UPDATE).toBe('USER_UPDATE')
      expect(ADMIN_ACTIONS.USER_DELETE).toBe('USER_DELETE')
      expect(ADMIN_ACTIONS.USER_DISABLE).toBe('USER_DISABLE')
      expect(ADMIN_ACTIONS.USER_ENABLE).toBe('USER_ENABLE')
      expect(ADMIN_ACTIONS.USER_PASSWORD_RESET).toBe('USER_PASSWORD_RESET')
      expect(ADMIN_ACTIONS.SYSTEM_BACKUP).toBe('SYSTEM_BACKUP')
      expect(ADMIN_ACTIONS.SYSTEM_STATS_VIEW).toBe('SYSTEM_STATS_VIEW')
      expect(ADMIN_ACTIONS.BACKUP_HISTORY_VIEW).toBe('BACKUP_HISTORY_VIEW')
      expect(ADMIN_ACTIONS.USER_DATA_EXPORT).toBe('USER_DATA_EXPORT')
      expect(ADMIN_ACTIONS.AUDIT_LOG_CLEANUP).toBe('AUDIT_LOG_CLEANUP')
    })
  })
})