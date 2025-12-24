import { prisma } from '../prisma'
import { User } from '../types/auth'

/**
 * 审计日志服务
 * 记录管理员操作和系统重要事件
 */

export interface AuditLogEntry {
  id: string
  adminId: string
  action: string
  targetId?: string
  details?: any
  createdAt: Date
}

export interface AuditLogFilters {
  adminId?: string
  action?: string
  targetId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * 记录管理员操作日志
 */
export async function logAdminAction(
  adminUser: User,
  action: string,
  targetId?: string,
  details?: any
): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: adminUser.id,
        action,
        targetId,
        details: details ? JSON.parse(JSON.stringify(details)) : null
      }
    })
  } catch (error) {
    console.error('记录管理员操作日志失败:', error)
    // 不抛出错误，避免影响主要操作
  }
}

/**
 * 获取审计日志列表
 */
export async function getAuditLogs(
  adminUser: User,
  filters: AuditLogFilters = {}
): Promise<PaginatedAuditLogs> {
  // 验证管理员权限
  if (adminUser.role !== 'ADMIN' || !adminUser.isActive) {
    throw new Error('权限不足：需要管理员权限')
  }

  const {
    adminId,
    action,
    targetId,
    startDate,
    endDate,
    page = 1,
    limit = 50
  } = filters

  const offset = (page - 1) * limit

  // 构建查询条件
  const whereClause: any = {}

  if (adminId) whereClause.adminId = adminId
  if (action) whereClause.action = { contains: action, mode: 'insensitive' }
  if (targetId) whereClause.targetId = targetId

  if (startDate || endDate) {
    whereClause.createdAt = {}
    if (startDate) whereClause.createdAt.gte = startDate
    if (endDate) whereClause.createdAt.lte = endDate
  }

  try {
    const [logs, totalCount] = await Promise.all([
      prisma.adminLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.adminLog.count({ where: whereClause })
    ])

    return {
      logs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
  } catch (error) {
    console.error('获取审计日志失败:', error)
    throw new Error('获取审计日志失败')
  }
}

/**
 * 获取特定管理员的操作历史
 */
export async function getAdminActionHistory(
  adminUser: User,
  targetAdminId: string,
  options: {
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<PaginatedAuditLogs> {
  return getAuditLogs(adminUser, {
    ...options,
    adminId: targetAdminId
  })
}

/**
 * 获取特定资源的操作历史
 */
export async function getResourceActionHistory(
  adminUser: User,
  resourceId: string,
  options: {
    page?: number
    limit?: number
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<PaginatedAuditLogs> {
  return getAuditLogs(adminUser, {
    ...options,
    targetId: resourceId
  })
}

/**
 * 预定义的操作类型常量
 */
export const ADMIN_ACTIONS = {
  // 用户管理
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_DISABLE: 'USER_DISABLE',
  USER_ENABLE: 'USER_ENABLE',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  
  // 数据管理
  TRANSACTION_VIEW: 'TRANSACTION_VIEW',
  TRANSACTION_UPDATE: 'TRANSACTION_UPDATE',
  TRANSACTION_DELETE: 'TRANSACTION_DELETE',
  
  // 系统管理
  SYSTEM_BACKUP: 'SYSTEM_BACKUP',
  SYSTEM_STATS_VIEW: 'SYSTEM_STATS_VIEW',
  SYSTEM_MONITORING_VIEW: 'SYSTEM_MONITORING_VIEW',
  SYSTEM_CLEANUP_SESSIONS: 'SYSTEM_CLEANUP_SESSIONS',
  SYSTEM_CLEANUP_LOGS: 'SYSTEM_CLEANUP_LOGS',
  SYSTEM_DATABASE_STATS: 'SYSTEM_DATABASE_STATS',
  BACKUP_HISTORY_VIEW: 'BACKUP_HISTORY_VIEW',
  
  // 权限管理
  ROLE_CHANGE: 'ROLE_CHANGE',
  PERMISSION_GRANT: 'PERMISSION_GRANT',
  PERMISSION_REVOKE: 'PERMISSION_REVOKE',
  
  // 数据导出
  USER_DATA_EXPORT: 'USER_DATA_EXPORT',
  
  // 审计日志管理
  AUDIT_LOG_CLEANUP: 'AUDIT_LOG_CLEANUP'
} as const

/**
 * 带日志记录的管理员操作包装器
 */
export function withAuditLog<T extends any[], R>(
  action: string,
  operation: (...args: T) => Promise<R>
) {
  return async (adminUser: User, ...args: T): Promise<R> => {
    try {
      const result = await operation(...args)
      
      // 记录成功操作
      await logAdminAction(adminUser, action, undefined, {
        success: true,
        timestamp: new Date().toISOString()
      })
      
      return result
    } catch (error) {
      // 记录失败操作
      await logAdminAction(adminUser, action, undefined, {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      })
      
      throw error
    }
  }
}

/**
 * 清理旧的审计日志
 * 保留指定天数的日志记录
 */
export async function cleanupOldAuditLogs(
  adminUser: User,
  retentionDays: number = 90
): Promise<number> {
  // 验证管理员权限
  if (adminUser.role !== 'ADMIN' || !adminUser.isActive) {
    throw new Error('权限不足：需要管理员权限')
  }

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.adminLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    })

    // 记录清理操作
    await logAdminAction(adminUser, 'AUDIT_LOG_CLEANUP', undefined, {
      retentionDays,
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString()
    })

    return result.count
  } catch (error) {
    console.error('清理审计日志失败:', error)
    throw new Error('清理审计日志失败')
  }
}