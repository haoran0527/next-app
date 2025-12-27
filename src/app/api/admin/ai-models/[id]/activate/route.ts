import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { activateAIModel } from '@/lib/services/ai-model-service'

/**
 * 切换激活的AI模型
 * POST /api/admin/ai-models/:id/activate
 */
async function handleActivateAIModel(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  // 从 URL 中提取 ID
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  // 找到 "activate" 前面的那一段（即 ID）
  const activateIndex = pathSegments.indexOf('activate')
  const id = activateIndex > 0 ? pathSegments[activateIndex - 1] : ''

  if (!id) {
    return NextResponse.json({ error: '无效的模型ID' }, { status: 400 })
  }

  const result = await activateAIModel(id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export const POST = protectAdminApi(handleActivateAIModel)
