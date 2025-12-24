import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/services/audit-log-service'

/**
 * 导出用户数据（管理员专用）
 * GET /api/admin/users/[id]/export
 */
async function handleExportUserData(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/')[4] // 从 /api/admin/users/[id]/export 中提取 id
    const format = url.searchParams.get('format') || 'json'

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少用户ID' 
        },
        { status: 400 }
      )
    }

    // 检查用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { 
          success: false,
          error: '用户不存在' 
        },
        { status: 404 }
      )
    }

    // 获取用户的所有数据
    const [transactions, sessions] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
      }),
      prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          token: true, // 注意：在实际应用中可能不应该导出token
          expiresAt: true,
          createdAt: true
        }
      })
    ])

    // 计算统计信息
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const exportData = {
      user: targetUser,
      statistics: {
        totalTransactions: transactions.length,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        activeSessions: sessions.filter(s => s.expiresAt > new Date()).length,
        totalSessions: sessions.length
      },
      transactions: transactions.map(t => ({
        ...t,
        amount: Number(t.amount) // 转换 Decimal 为 number
      })),
      sessions,
      exportInfo: {
        exportedBy: user.email,
        exportedAt: new Date().toISOString(),
        format
      }
    }

    // 记录管理员操作
    await logAdminAction(user, ADMIN_ACTIONS.USER_DATA_EXPORT, userId, {
      targetUser: { email: targetUser.email, username: targetUser.username },
      format,
      dataSize: {
        transactions: transactions.length,
        sessions: sessions.length
      }
    })

    if (format === 'csv') {
      // 生成CSV格式
      const csvLines = [
        // 用户信息
        'User Information',
        'Field,Value',
        `Email,${targetUser.email}`,
        `Username,${targetUser.username}`,
        `Role,${targetUser.role}`,
        `Active,${targetUser.isActive}`,
        `Created At,${targetUser.createdAt.toISOString()}`,
        '',
        // 交易记录
        'Transactions',
        'Date,Type,Amount,Category,Description',
        ...transactions.map(t => 
          `${t.date.toISOString()},${t.type},${t.amount},${t.category},"${t.description || ''}"`
        ),
        '',
        // 统计信息
        'Statistics',
        'Metric,Value',
        `Total Transactions,${transactions.length}`,
        `Total Income,${totalIncome}`,
        `Total Expense,${totalExpense}`,
        `Balance,${totalIncome - totalExpense}`
      ]

      const csvContent = csvLines.join('\n')
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="user_${targetUser.username}_data.csv"`
        }
      })
    } else {
      // 返回JSON格式
      return NextResponse.json({
        success: true,
        data: exportData
      })
    }
  } catch (error) {
    console.error('导出用户数据失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '导出用户数据失败'
    
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
export const GET = protectAdminApi(handleExportUserData)