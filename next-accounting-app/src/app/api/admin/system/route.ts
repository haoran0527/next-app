import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/services/audit-log-service'

/**
 * 获取系统监控信息（管理员专用）
 * GET /api/admin/system
 */
async function handleGetSystemMonitoring(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('details') === 'true'

    // 获取基础系统信息
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      // 用户统计
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      
      // 交易统计
      totalTransactions,
      transactionsToday,
      transactionsThisWeek,
      transactionsThisMonth,
      
      // 会话统计
      activeSessions,
      totalSessions,
      
      // 数据库统计
      auditLogCount
    ] = await Promise.all([
      // 用户统计
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      
      // 交易统计
      prisma.transaction.count(),
      prisma.transaction.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.transaction.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.transaction.count({ where: { createdAt: { gte: startOfMonth } } }),
      
      // 会话统计
      prisma.session.count({ where: { expiresAt: { gt: now } } }),
      prisma.session.count(),
      
      // 审计日志统计
      prisma.adminLog.count()
    ])

    // 获取财务统计
    const [incomeStats, expenseStats] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'INCOME' },
        _sum: { amount: true },
        _avg: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { type: 'EXPENSE' },
        _sum: { amount: true },
        _avg: { amount: true }
      })
    ])

    const systemStats = {
      timestamp: now.toISOString(),
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth
      },
      transactions: {
        total: totalTransactions,
        today: transactionsToday,
        thisWeek: transactionsThisWeek,
        thisMonth: transactionsThisMonth,
        totalIncome: Number(incomeStats._sum.amount || 0),
        totalExpense: Number(expenseStats._sum.amount || 0),
        averageIncome: Number(incomeStats._avg.amount || 0),
        averageExpense: Number(expenseStats._avg.amount || 0)
      },
      sessions: {
        active: activeSessions,
        total: totalSessions,
        expired: totalSessions - activeSessions
      },
      system: {
        auditLogs: auditLogCount,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      }
    }

    // 如果需要详细信息，获取额外数据
    let detailedStats = null
    if (includeDetails) {
      const [
        usersByRole,
        transactionsByType,
        transactionsByCategory,
        recentUsers,
        recentTransactions
      ] = await Promise.all([
        // 按角色分组的用户
        prisma.user.groupBy({
          by: ['role'],
          _count: { id: true }
        }),
        
        // 按类型分组的交易
        prisma.transaction.groupBy({
          by: ['type'],
          _count: { id: true },
          _sum: { amount: true }
        }),
        
        // 按分类分组的交易
        prisma.transaction.groupBy({
          by: ['category'],
          _count: { id: true },
          _sum: { amount: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        
        // 最近注册的用户
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        
        // 最近的交易
        prisma.transaction.findMany({
          select: {
            id: true,
            amount: true,
            type: true,
            category: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        })
      ])

      detailedStats = {
        usersByRole: usersByRole.map(item => ({
          role: item.role,
          count: item._count.id
        })),
        transactionsByType: transactionsByType.map(item => ({
          type: item.type,
          count: item._count.id,
          totalAmount: Number(item._sum.amount || 0)
        })),
        transactionsByCategory: transactionsByCategory.map(item => ({
          category: item.category,
          count: item._count.id,
          totalAmount: Number(item._sum.amount || 0)
        })),
        recentUsers: recentUsers.map(user => ({
          ...user,
          // 不返回敏感信息
          email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2')
        })),
        recentTransactions: recentTransactions.map(t => ({
          ...t,
          amount: Number(t.amount),
          user: {
            username: t.user.username,
            email: t.user.email.replace(/(.{2}).*(@.*)/, '$1***$2')
          }
        }))
      }
    }

    // 记录管理员查看系统监控的操作
    await logAdminAction(user, ADMIN_ACTIONS.SYSTEM_MONITORING_VIEW, undefined, {
      includeDetails,
      timestamp: now.toISOString()
    })

    return NextResponse.json({
      success: true,
      data: {
        stats: systemStats,
        details: detailedStats
      }
    })
  } catch (error) {
    console.error('获取系统监控信息失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '获取系统监控信息失败'
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    )
  }
}

/**
 * 系统维护操作（管理员专用）
 * POST /api/admin/system
 */
async function handleSystemMaintenance(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, ...actionData } = body

    let result: any = {}
    let auditAction = ''
    let auditDetails: any = {}

    switch (action) {
      case 'cleanup-expired-sessions':
        // 清理过期会话
        const deletedSessions = await prisma.session.deleteMany({
          where: {
            expiresAt: { lt: new Date() }
          }
        })
        
        result = {
          message: '过期会话清理完成',
          deletedCount: deletedSessions.count
        }
        auditAction = 'SYSTEM_CLEANUP_SESSIONS'
        auditDetails = { deletedCount: deletedSessions.count }
        break

      case 'cleanup-old-audit-logs':
        // 清理旧的审计日志
        const { retentionDays = 90 } = actionData
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
        
        const deletedLogs = await prisma.adminLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate }
          }
        })
        
        result = {
          message: `清理了 ${retentionDays} 天前的审计日志`,
          deletedCount: deletedLogs.count,
          retentionDays
        }
        auditAction = 'SYSTEM_CLEANUP_LOGS'
        auditDetails = { deletedCount: deletedLogs.count, retentionDays }
        break

      case 'database-stats':
        // 获取数据库统计信息
        const dbStats = await Promise.all([
          prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`,
          prisma.$queryRaw`SELECT COUNT(*) as count FROM "Transaction"`,
          prisma.$queryRaw`SELECT COUNT(*) as count FROM "Session"`,
          prisma.$queryRaw`SELECT COUNT(*) as count FROM "AdminLog"`
        ])
        
        result = {
          message: '数据库统计信息',
          tables: {
            users: Number((dbStats[0] as any[])[0].count),
            transactions: Number((dbStats[1] as any[])[0].count),
            sessions: Number((dbStats[2] as any[])[0].count),
            adminLogs: Number((dbStats[3] as any[])[0].count)
          }
        }
        auditAction = 'SYSTEM_DATABASE_STATS'
        auditDetails = { tables: result.tables }
        break

      default:
        return NextResponse.json(
          { 
            success: false,
            error: '无效的维护操作' 
          },
          { status: 400 }
        )
    }

    // 记录管理员操作
    await logAdminAction(user, auditAction, undefined, auditDetails)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('系统维护操作失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '系统维护操作失败'
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    )
  }
}

// 导出受保护的API处理器
export const GET = protectAdminApi(handleGetSystemMonitoring)
export const POST = protectAdminApi(handleSystemMaintenance)