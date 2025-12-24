import { prisma } from '../prisma'
import { User } from '../types/auth'
import { logAdminAction, ADMIN_ACTIONS } from './audit-log-service'

/**
 * 数据备份服务
 * 提供系统数据备份和恢复功能
 */

export interface BackupData {
  metadata: {
    version: string
    createdAt: string
    createdBy: string
    totalUsers: number
    totalTransactions: number
    totalSessions: number
  }
  users: any[]
  transactions: any[]
  sessions: any[]
  adminLogs: any[]
}

export interface BackupOptions {
  includePasswords?: boolean
  includeTokens?: boolean
  includeLogs?: boolean
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  userIds?: string[]
}

/**
 * 验证管理员权限
 */
function validateAdminPermission(user: User): boolean {
  return user.role === 'ADMIN' && user.isActive
}

/**
 * 创建系统数据备份
 */
export async function createSystemBackup(
  adminUser: User,
  options: BackupOptions = {}
): Promise<BackupData> {
  // 验证管理员权限
  if (!validateAdminPermission(adminUser)) {
    throw new Error('权限不足：需要管理员权限')
  }

  const {
    includePasswords = false,
    includeTokens = false,
    includeLogs = true,
    dateRange,
    userIds
  } = options

  try {
    // 构建用户查询条件
    const userWhereClause: any = {}
    if (userIds && userIds.length > 0) {
      userWhereClause.id = { in: userIds }
    }

    // 构建日期范围查询条件
    const dateWhereClause: any = {}
    if (dateRange) {
      dateWhereClause.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    }

    // 获取用户数据
    const users = await prisma.user.findMany({
      where: userWhereClause,
      select: {
        id: true,
        email: true,
        username: true,
        password: includePasswords,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // 获取交易数据
    const transactionWhereClause: any = { ...dateWhereClause }
    if (userIds && userIds.length > 0) {
      transactionWhereClause.userId = { in: userIds }
    }

    const transactions = await prisma.transaction.findMany({
      where: transactionWhereClause,
      select: {
        id: true,
        userId: true,
        amount: true,
        type: true,
        category: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // 获取会话数据
    const sessionWhereClause: any = { ...dateWhereClause }
    if (userIds && userIds.length > 0) {
      sessionWhereClause.userId = { in: userIds }
    }

    const sessions = await prisma.session.findMany({
      where: sessionWhereClause,
      select: {
        id: true,
        userId: true,
        token: includeTokens,
        expiresAt: true,
        createdAt: true
      }
    })

    // 获取管理员日志（如果需要）
    let adminLogs: any[] = []
    if (includeLogs) {
      adminLogs = await prisma.adminLog.findMany({
        where: dateWhereClause,
        select: {
          id: true,
          adminId: true,
          action: true,
          targetId: true,
          details: true,
          createdAt: true
        }
      })
    }

    // 构建备份数据
    const backupData: BackupData = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        createdBy: adminUser.email,
        totalUsers: users.length,
        totalTransactions: transactions.length,
        totalSessions: sessions.length
      },
      users: users.map(user => ({
        ...user
      })),
      transactions: transactions.map(transaction => ({
        ...transaction,
        amount: Number(transaction.amount) // 转换 Decimal 为 number
      })),
      sessions,
      adminLogs
    }

    // 记录备份操作
    await logAdminAction(adminUser, ADMIN_ACTIONS.SYSTEM_BACKUP, undefined, {
      backupSize: {
        users: users.length,
        transactions: transactions.length,
        sessions: sessions.length,
        adminLogs: adminLogs.length
      },
      options: {
        includePasswords,
        includeTokens,
        includeLogs,
        dateRange: dateRange ? {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        } : null,
        userIds
      }
    })

    return backupData
  } catch (error) {
    console.error('创建系统备份失败:', error)
    throw new Error('创建系统备份失败')
  }
}

/**
 * 创建用户数据备份
 */
export async function createUserBackup(
  adminUser: User,
  userId: string,
  options: BackupOptions = {}
): Promise<BackupData> {
  return createSystemBackup(adminUser, {
    ...options,
    userIds: [userId]
  })
}

/**
 * 验证备份数据完整性
 */
export function validateBackupData(backupData: BackupData): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 检查必需字段
  if (!backupData.metadata) {
    errors.push('缺少备份元数据')
  }

  if (!backupData.users || !Array.isArray(backupData.users)) {
    errors.push('用户数据格式无效')
  }

  if (!backupData.transactions || !Array.isArray(backupData.transactions)) {
    errors.push('交易数据格式无效')
  }

  if (!backupData.sessions || !Array.isArray(backupData.sessions)) {
    errors.push('会话数据格式无效')
  }

  // 检查数据一致性
  if (backupData.metadata && backupData.users) {
    if (backupData.metadata.totalUsers !== backupData.users.length) {
      errors.push('用户数量与元数据不匹配')
    }
  }

  if (backupData.metadata && backupData.transactions) {
    if (backupData.metadata.totalTransactions !== backupData.transactions.length) {
      errors.push('交易数量与元数据不匹配')
    }
  }

  // 检查用户ID引用完整性
  if (backupData.users && backupData.transactions) {
    const userIds = new Set(backupData.users.map(u => u.id))
    const orphanedTransactions = backupData.transactions.filter(t => !userIds.has(t.userId))
    
    if (orphanedTransactions.length > 0) {
      errors.push(`发现 ${orphanedTransactions.length} 个孤立的交易记录`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 生成备份文件名
 */
export function generateBackupFileName(
  type: 'system' | 'user' = 'system',
  userId?: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  
  if (type === 'user' && userId) {
    return `user_backup_${userId}_${timestamp}.json`
  }
  
  return `system_backup_${timestamp}.json`
}

/**
 * 计算备份数据大小（估算）
 */
export function estimateBackupSize(backupData: BackupData): {
  totalSize: number
  breakdown: {
    metadata: number
    users: number
    transactions: number
    sessions: number
    adminLogs: number
  }
} {
  const jsonString = JSON.stringify(backupData)
  const totalSize = new Blob([jsonString]).size

  // 估算各部分大小
  const metadataSize = new Blob([JSON.stringify(backupData.metadata)]).size
  const usersSize = new Blob([JSON.stringify(backupData.users)]).size
  const transactionsSize = new Blob([JSON.stringify(backupData.transactions)]).size
  const sessionsSize = new Blob([JSON.stringify(backupData.sessions)]).size
  const adminLogsSize = new Blob([JSON.stringify(backupData.adminLogs)]).size

  return {
    totalSize,
    breakdown: {
      metadata: metadataSize,
      users: usersSize,
      transactions: transactionsSize,
      sessions: sessionsSize,
      adminLogs: adminLogsSize
    }
  }
}