import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import {
  getAIModelById,
  updateAIModel,
  deleteAIModel
} from '@/lib/services/ai-model-service'

/**
 * 从请求 URL 中提取 ID
 */
function extractIdFromUrl(request: NextRequest): string {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  return pathSegments[pathSegments.length - 1] || ''
}

/**
 * 获取单个AI模型配置
 * GET /api/admin/ai-models/:id
 */
async function handleGetAIModel(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  const id = extractIdFromUrl(request)
  const result = await getAIModelById(id)

  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error || 'AI模型配置不存在' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      ...result.data,
      apiKey: maskApiKey(result.data.apiKey)
    }
  })
}

/**
 * 更新AI模型配置
 * PUT /api/admin/ai-models/:id
 *
 * Body:
 * - name?: 模型名称
 * - baseUrl?: API基础URL
 * - apiKey?: API密钥
 * - model?: 模型标识
 */
async function handleUpdateAIModel(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const id = extractIdFromUrl(request)
    const body = await request.json()
    const { name, baseUrl, apiKey, model } = body

    const updateData: Record<string, string> = {}
    if (name !== undefined) updateData.name = name
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl
    if (apiKey !== undefined) updateData.apiKey = apiKey
    if (model !== undefined) updateData.model = model

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '没有提供要更新的字段' },
        { status: 400 }
      )
    }

    const result = await updateAIModel(id, updateData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error('更新AI模型配置失败:', error)
    return NextResponse.json(
      { error: '更新AI模型配置失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除AI模型配置
 * DELETE /api/admin/ai-models/:id
 */
async function handleDeleteAIModel(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  const id = extractIdFromUrl(request)
  const result = await deleteAIModel(id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '****'
  }
  const prefix = apiKey.substring(0, 8)
  const suffix = apiKey.substring(apiKey.length - 4)
  const maskedLength = Math.max(8, apiKey.length - 12)
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`
}

export const GET = protectAdminApi(handleGetAIModel)
export const PUT = protectAdminApi(handleUpdateAIModel)
export const DELETE = protectAdminApi(handleDeleteAIModel)
