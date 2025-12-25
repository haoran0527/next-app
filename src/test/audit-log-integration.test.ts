import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../lib/prisma'
import { User } from '../lib/types/auth'
import { logAdminAction, getAuditLogs, ADMIN_ACTIONS } from '../lib/services/audit-log-service'

describe('审计日志集成测试', () => {
  let adminUser: User
  let regularUser: User

  beforeEach(async () => {
    // 清理测试数据
    await prisma.adminLog.deleteMany()
    await prisma.user.deleteMany()

    // 创建测试用户
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@integration.test',
        username: 'admin_integration',
        password: 'hashedpassword',
        role: 'ADMIN',
        isActive: true
      }
    })

    regularUser = await prisma.user.create({
      data: {
        email: 'user@integration.test',
        username: 'user_integration',
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

  describe('管理员操作审计', () => {
    it('应该记录用户创建操作', async () => {
      // 模拟管理员创建用户操作
      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.USER_CREATE,
        regularUser.id,
        {
          targetUser: {
            email: regularUser.email,
            username: regularUser.username,
            role: regularUser.role
          }
        }
      )

      // 验证日志记录
      const logs = await getAuditLogs(adminUser)
      expect(logs.logs).toHaveLength(1)
      
      const log = logs.logs[0]
      expect(log.adminId).toBe(adminUser.id)
      expect(log.action).toBe(ADMIN_ACTIONS.USER_CREATE)
      expect(log.targetId).toBe(regularUser.id)
      expect(log.details).toMatchObject({
        targetUser: {
          email: regularUser.email,
          username: regularUser.username,
          role: regularUser.role
        }
      })
    })

    it('应该记录用户更新操作', async () => {
      // 模拟管理员更新用户操作
      const changes = {
        email: 'newemail@test.com',
        isActive: false
      }

      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.USER_UPDATE,
        regularUser.id,
        {
          changes,
          targetUser: {
            email: regularUser.email,
            username: regularUser.username,
            role: regularUser.role
          }
        }
      )

      // 验证日志记录
      const logs = await getAuditLogs(adminUser, { action: 'USER_UPDATE' })
      expect(logs.logs).toHaveLength(1)
      
      const log = logs.logs[0]
      expect(log.details.changes).toMatchObject(changes)
    })

    it('应该记录用户删除操作', async () => {
      // 模拟管理员删除用户操作
      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.USER_DELETE,
        regularUser.id,
        {
          deletedUser: {
            email: regularUser.email,
            username: regularUser.username,
            role: regularUser.role,
            transactionCount: 0,
            sessionCount: 0
          }
        }
      )

      // 验证日志记录
      const logs = await getAuditLogs(adminUser, { targetId: regularUser.id })
      expect(logs.logs).toHaveLength(1)
      
      const log = logs.logs[0]
      expect(log.action).toBe(ADMIN_ACTIONS.USER_DELETE)
      expect(log.details.deletedUser).toBeDefined()
    })

    it('应该记录系统统计查看操作', async () => {
      // 模拟管理员查看系统统计
      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.SYSTEM_STATS_VIEW,
        undefined,
        {
          timestamp: new Date().toISOString()
        }
      )

      // 验证日志记录
      const logs = await getAuditLogs(adminUser, { action: 'SYSTEM_STATS_VIEW' })
      expect(logs.logs).toHaveLength(1)
      
      const log = logs.logs[0]
      expect(log.targetId).toBeNull()
      expect(log.details.timestamp).toBeDefined()
    })

    it('应该记录数据备份操作', async () => {
      // 模拟管理员执行数据备份
      const backupDetails = {
        backupSize: {
          users: 2,
          transactions: 0,
          sessions: 0,
          adminLogs: 0
        },
        options: {
          includePasswords: false,
          includeTokens: false,
          includeLogs: true
        }
      }

      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.SYSTEM_BACKUP,
        undefined,
        backupDetails
      )

      // 验证日志记录
      const logs = await getAuditLogs(adminUser, { action: 'SYSTEM_BACKUP' })
      expect(logs.logs).toHaveLength(1)
      
      const log = logs.logs[0]
      expect(log.details.backupSize).toMatchObject(backupDetails.backupSize)
      expect(log.details.options).toMatchObject(backupDetails.options)
    })
  })

  describe('审计日志查询功能', () => {
    beforeEach(async () => {
      // 创建多个测试日志
      const actions = [
        { action: ADMIN_ACTIONS.USER_CREATE, targetId: regularUser.id },
        { action: ADMIN_ACTIONS.USER_UPDATE, targetId: regularUser.id },
        { action: ADMIN_ACTIONS.SYSTEM_STATS_VIEW, targetId: undefined },
        { action: ADMIN_ACTIONS.SYSTEM_BACKUP, targetId: undefined }
      ]

      for (const actionData of actions) {
        await logAdminAction(
          adminUser,
          actionData.action,
          actionData.targetId,
          { test: true }
        )
      }
    })

    it('应该支持按操作类型筛选', async () => {
      const userLogs = await getAuditLogs(adminUser, { action: 'USER' })
      expect(userLogs.logs.length).toBeGreaterThan(0)
      expect(userLogs.logs.every(log => log.action.includes('USER'))).toBe(true)
    })

    it('应该支持按目标资源筛选', async () => {
      const userTargetLogs = await getAuditLogs(adminUser, { targetId: regularUser.id })
      expect(userTargetLogs.logs.length).toBe(2) // CREATE 和 UPDATE
      expect(userTargetLogs.logs.every(log => log.targetId === regularUser.id)).toBe(true)
    })

    it('应该支持分页查询', async () => {
      const page1 = await getAuditLogs(adminUser, { page: 1, limit: 2 })
      expect(page1.logs).toHaveLength(2)
      expect(page1.pagination.page).toBe(1)
      expect(page1.pagination.totalPages).toBe(2)

      const page2 = await getAuditLogs(adminUser, { page: 2, limit: 2 })
      expect(page2.logs).toHaveLength(2)
      expect(page2.pagination.page).toBe(2)
    })

    it('应该按时间倒序返回日志', async () => {
      const logs = await getAuditLogs(adminUser)
      
      // 验证时间顺序（最新的在前）
      for (let i = 1; i < logs.logs.length; i++) {
        const current = new Date(logs.logs[i].createdAt)
        const previous = new Date(logs.logs[i - 1].createdAt)
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime())
      }
    })
  })

  describe('审计日志完整性验证', () => {
    it('应该包含所有必需的字段', async () => {
      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.USER_CREATE,
        regularUser.id,
        { test: 'data' }
      )

      const logs = await getAuditLogs(adminUser)
      const log = logs.logs[0]

      // 验证必需字段
      expect(log.id).toBeDefined()
      expect(log.adminId).toBe(adminUser.id)
      expect(log.action).toBe(ADMIN_ACTIONS.USER_CREATE)
      expect(log.targetId).toBe(regularUser.id)
      expect(log.details).toMatchObject({ test: 'data' })
      expect(log.createdAt).toBeDefined()
      expect(new Date(log.createdAt)).toBeInstanceOf(Date)
    })

    it('应该正确处理JSON详情数据', async () => {
      const complexDetails = {
        user: { id: regularUser.id, email: regularUser.email },
        changes: { isActive: false, role: 'USER' },
        metadata: { source: 'admin_panel', timestamp: new Date().toISOString() }
      }

      await logAdminAction(
        adminUser,
        ADMIN_ACTIONS.USER_UPDATE,
        regularUser.id,
        complexDetails
      )

      const logs = await getAuditLogs(adminUser)
      const log = logs.logs[0]

      expect(log.details).toMatchObject(complexDetails)
    })
  })
})