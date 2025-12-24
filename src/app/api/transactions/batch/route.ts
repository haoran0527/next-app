import { NextRequest, NextResponse } from 'next/server'
import { protectTransactionApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'

/**
 * 批量创建交易记录
 * POST /api/transactions/batch
 */
async function handleBatchCreateTransactions(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { transactions } = body

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的交易记录数组' },
        { status: 400 }
      )
    }

    if (transactions.length > 100) {
      return NextResponse.json(
        { error: '批量创建最多支持100条记录' },
        { status: 400 }
      )
    }

    // 验证每个交易记录
    const validationErrors: string[] = []
    const validTransactions: any[] = []

    transactions.forEach((transaction, index) => {
      const { amount, type, category, description, date } = transaction
      
      if (!amount || !type || !category || !date) {
        validationErrors.push(`第${index + 1}条记录缺少必需字段`)
        return
      }

      if (!['INCOME', 'EXPENSE'].includes(type)) {
        validationErrors.push(`第${index + 1}条记录的交易类型无效`)
        return
      }

      const numAmount = parseFloat(amount)
      if (isNaN(numAmount) || numAmount <= 0) {
        validationErrors.push(`第${index + 1}条记录的金额无效`)
        return
      }

      validTransactions.push({
        amount: numAmount,
        type,
        category,
        description: description || null,
        date: new Date(date)
      })
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: '数据验证失败',
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // 批量创建交易记录
    const results = []
    const errors = []

    for (let i = 0; i < validTransactions.length; i++) {
      try {
        const result = await secureDataAccess.createTransaction(validTransactions[i])
        if (result.success) {
          results.push(result.data)
        } else {
          errors.push(`第${i + 1}条记录创建失败: ${result.error}`)
        }
      } catch (error) {
        errors.push(`第${i + 1}条记录创建失败: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: results,
        errors: errors,
        summary: {
          total: transactions.length,
          successful: results.length,
          failed: errors.length
        }
      }
    }, { status: 201 })
  } catch (error) {
    console.error('批量创建交易记录失败:', error)
    return NextResponse.json(
      { error: '批量创建交易记录失败' },
      { status: 500 }
    )
  }
}

/**
 * 批量删除交易记录
 * DELETE /api/transactions/batch
 */
async function handleBatchDeleteTransactions(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的ID数组' },
        { status: 400 }
      )
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { error: '批量删除最多支持50条记录' },
        { status: 400 }
      )
    }

    // 批量删除交易记录
    const results = []
    const errors = []

    for (let i = 0; i < ids.length; i++) {
      try {
        const result = await secureDataAccess.deleteTransaction(ids[i])
        if (result.success) {
          results.push(ids[i])
        } else {
          errors.push(`ID ${ids[i]} 删除失败: ${result.error}`)
        }
      } catch (error) {
        errors.push(`ID ${ids[i]} 删除失败: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: results,
        errors: errors,
        summary: {
          total: ids.length,
          successful: results.length,
          failed: errors.length
        }
      }
    })
  } catch (error) {
    console.error('批量删除交易记录失败:', error)
    return NextResponse.json(
      { error: '批量删除交易记录失败' },
      { status: 500 }
    )
  }
}

// 导出受保护的API处理器
export const POST = protectTransactionApi(handleBatchCreateTransactions, 'create')
export const DELETE = protectTransactionApi(handleBatchDeleteTransactions, 'delete')