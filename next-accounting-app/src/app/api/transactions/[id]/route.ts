import { NextRequest, NextResponse } from 'next/server'
import { protectTransactionApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'

/**
 * 获取单个交易记录
 * GET /api/transactions/[id]
 */
async function handleGetTransaction(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return NextResponse.json(
        { error: '缺少交易记录ID' },
        { status: 400 }
      )
    }

    // 使用安全数据访问获取单个交易记录
    const result = await secureDataAccess.getTransactionById(id)

    if (!result.success) {
      const statusCode = result.error === '无权访问该资源' ? 403 : 
                        result.error === '交易记录不存在' ? 404 : 400
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
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
 * 更新交易记录
 * PUT /api/transactions/[id]
 */
async function handleUpdateTransaction(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return NextResponse.json(
        { error: '缺少交易记录ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // 验证更新数据
    const updateData: any = {}
    
    if (body.amount !== undefined) {
      const numAmount = parseFloat(body.amount)
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: '无效的金额' },
          { status: 400 }
        )
      }
      updateData.amount = numAmount
    }

    if (body.type !== undefined) {
      if (!['INCOME', 'EXPENSE'].includes(body.type)) {
        return NextResponse.json(
          { error: '无效的交易类型' },
          { status: 400 }
        )
      }
      updateData.type = body.type
    }

    if (body.category !== undefined) {
      updateData.category = body.category
    }

    if (body.description !== undefined) {
      updateData.description = body.description
    }

    if (body.date !== undefined) {
      updateData.date = new Date(body.date)
    }

    // 使用安全数据访问更新交易记录
    const result = await secureDataAccess.updateTransaction(id, updateData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error('更新交易记录失败:', error)
    return NextResponse.json(
      { error: '更新交易记录失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除交易记录
 * DELETE /api/transactions/[id]
 */
async function handleDeleteTransaction(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return NextResponse.json(
        { error: '缺少交易记录ID' },
        { status: 400 }
      )
    }

    // 使用安全数据访问删除交易记录
    const result = await secureDataAccess.deleteTransaction(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '交易记录已删除'
    })
  } catch (error) {
    console.error('删除交易记录失败:', error)
    return NextResponse.json(
      { error: '删除交易记录失败' },
      { status: 500 }
    )
  }
}

// 导出受保护的API处理器
export const GET = protectTransactionApi(handleGetTransaction, 'read')
export const PUT = protectTransactionApi(handleUpdateTransaction, 'update')
export const DELETE = protectTransactionApi(handleDeleteTransaction, 'delete')