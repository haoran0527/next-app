import { NextRequest, NextResponse } from 'next/server'
import { protectTransactionApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'

/**
 * 获取用户的交易记录
 * GET /api/transactions
 */
async function handleGetTransactions(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    
    // 从查询参数获取过滤条件
    const filters = {
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      type: searchParams.get('type') || undefined,
      category: searchParams.get('category') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    }

    // 使用安全数据访问获取交易记录
    const result = await secureDataAccess.getTransactions(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transactions: result.data.transactions,
      total: result.data.total,
      page: result.data.page,
      limit: result.data.limit,
      hasNext: result.data.hasNext,
      hasPrev: result.data.hasPrev
    })
  } catch (error) {
    console.error('获取交易记录失败:', error)
    return NextResponse.json(
      { error: '获取交易记录失败' },
      { status: 500 }
    )
  }
}

/**
 * 创建新的交易记录
 * POST /api/transactions
 */
async function handleCreateTransaction(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    const body = await request.json()
    
    // 验证必需字段
    const { amount, type, category, description, date } = body
    
    if (!amount || !type || !category || !date) {
      return NextResponse.json(
        { error: '缺少必需字段' },
        { status: 400 }
      )
    }

    // 验证交易类型
    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json(
        { error: '无效的交易类型' },
        { status: 400 }
      )
    }

    // 验证金额
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: '无效的金额' },
        { status: 400 }
      )
    }

    // 使用安全数据访问创建交易记录
    const result = await secureDataAccess.createTransaction({
      amount: numAmount,
      type,
      category,
      description: description || null,
      date: new Date(date)
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction: result.data
    }, { status: 201 })
  } catch (error) {
    console.error('创建交易记录失败:', error)
    return NextResponse.json(
      { error: '创建交易记录失败' },
      { status: 500 }
    )
  }
}

// 导出受保护的API处理器
export const GET = protectTransactionApi(handleGetTransactions, 'read')
export const POST = protectTransactionApi(handleCreateTransaction, 'create')