import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { getUserTransactions } from '@/lib/services/admin-service'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/services/audit-log-service'

/**
 * 获取用户交易记录（管理员专用）
 * GET /api/admin/users/[id]/transactions
 */
async function handleGetUserTransactions(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/')[4] // 从 /api/admin/users/[id]/transactions 中提取 id
    const { searchParams } = url

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少用户ID' 
        },
        { status: 400 }
      )
    }

    // 解析日期参数
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    // 解析查询参数
    const options: {
      page: number
      limit: number
      type?: 'INCOME' | 'EXPENSE'
      category?: string
      startDate?: Date
      endDate?: Date
    } = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      type: searchParams.get('type') as 'INCOME' | 'EXPENSE' | undefined,
      category: searchParams.get('category') || undefined,
      startDate: startDateStr ? new Date(startDateStr) : undefined,
      endDate: endDateStr ? new Date(endDateStr) : undefined
    }

    // 获取用户交易记录
    const result = await getUserTransactions(user, userId, options)

    // 记录管理员查看用户交易的操作
    await logAdminAction(user, ADMIN_ACTIONS.TRANSACTION_VIEW, userId, {
      filters: options,
      resultCount: result.transactions.length
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取用户交易记录失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '获取用户交易记录失败'
    
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
export const GET = protectAdminApi(handleGetUserTransactions)