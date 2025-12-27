/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { protectApiRoute } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { parseNaturalLanguageToTransaction } from '@/lib/services/agent-service'

async function handleParseTransaction(
  request: NextRequest,
  user?: User
): Promise<NextResponse> {
  if (!user) {
    return NextResponse.json(
      { error: '未授权访问' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { input } = body

    console.log('[AI Parse] 收到解析请求:', { input, body })

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的输入文本' },
        { status: 400 }
      )
    }

    console.log('[AI Parse] 开始调用 AI 解析...')
    const result = await parseNaturalLanguageToTransaction(input)
    console.log('[AI Parse] AI 解析结果:', result)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          rawResponse: result.rawResponse 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction
    })
  } catch (error) {
    console.error('解析财务记录失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '解析失败，请稍后重试' 
      },
      { status: 500 }
    )
  }
}



async function handleCreateFromNaturalLanguage(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { input } = body

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的输入文本' },
        { status: 400 }
      )
    }

    const parseResult = await parseNaturalLanguageToTransaction(input)

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: parseResult.error,
          rawResponse: parseResult.rawResponse 
        },
        { status: 400 }
      )
    }

    const transaction = parseResult.transaction

    if (!transaction) {
      return NextResponse.json(
        { 
          success: false, 
          error: '解析结果无效' 
        },
        { status: 400 }
      )
    }

    const createResult = await secureDataAccess.createTransaction({
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      date: transaction.date || new Date()
    })

    if (!createResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: createResult.error 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction: createResult.data,
      parsedFrom: input
    }, { status: 201 })
  } catch (error) {
    console.error('创建财务记录失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '创建失败，请稍后重试' 
      },
      { status: 500 }
    )
  }
}

export const POST = protectApiRoute(
  handleParseTransaction,
  {
    requireAuth: true,
    enableDataIsolation: false
  }
)


