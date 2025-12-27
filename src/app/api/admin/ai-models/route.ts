import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import {
  getAllAIModels,
  createAIModel
} from '@/lib/services/ai-model-service'

/**
 * 获取所有AI模型配置
 * GET /api/admin/ai-models
 */
async function handleGetAllAIModels(
  _request: NextRequest,
  _user: User
): Promise<NextResponse> {
  const result = await getAllAIModels()

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    data: result.data
  })
}

/**
 * 创建AI模型配置
 * POST /api/admin/ai-models
 *
 * Body:
 * - name: 模型名称（唯一）
 * - baseUrl: API基础URL
 * - apiKey: API密钥
 * - model: 模型标识（如 deepseek-chat）
 */
async function handleCreateAIModel(
  request: NextRequest,
  _user: User
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { name, baseUrl, apiKey, model } = body

    // 验证必填字段
    if (!name || !baseUrl || !apiKey || !model) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    const result = await createAIModel({ name, baseUrl, apiKey, model })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error('创建AI模型配置失败:', error)
    return NextResponse.json(
      { error: '创建AI模型配置失败' },
      { status: 500 }
    )
  }
}

export const GET = protectAdminApi(handleGetAllAIModels)
export const POST = protectAdminApi(handleCreateAIModel)
