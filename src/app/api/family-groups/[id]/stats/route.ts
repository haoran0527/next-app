import { NextRequest, NextResponse } from 'next/server'
import { getFamilyGroupStats } from '@/lib/services/family-group-service'
import { User } from '@/lib/types/auth'

// GET /api/family-groups/[id]/stats - 获取家庭组统计
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 手动实现认证，因为需要使用 params
  const authHeader = request.headers.get('authorization')
  const cookieToken = request.cookies.get('session-token')?.value
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken

  if (!token) {
    return NextResponse.json(
      { error: '未提供认证令牌' },
      { status: 401 }
    )
  }

  // 动态导入以避免循环依赖
  const { validateSession } = await import('@/lib/services/session-service')
  const sessionData = await validateSession(token)

  if (!sessionData) {
    return NextResponse.json(
      { error: '会话无效或已过期' },
      { status: 401 }
    )
  }

  const user = sessionData.user
  const { id } = await params

  try {
    const stats = await getFamilyGroupStats(id, user.id)

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error: any) {
    console.error('获取家庭组统计失败:', error)

    if (error.message.includes('不属于该家庭组')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: '获取家庭组统计失败' },
      { status: 500 }
    )
  }
}
