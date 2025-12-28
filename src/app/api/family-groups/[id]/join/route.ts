import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth-middleware'
import { joinFamilyGroup } from '@/lib/services/family-group-service'
import { User } from '@/lib/types/auth'

// POST /api/family-groups/[id]/join - 通过邀请码加入家庭组
// 注意：这里的 id 参数实际上是邀请码，而不是家庭组ID
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 手动实现认证，因为 id 是邀请码而不是家庭组ID
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
  const { id: inviteCode } = await params

  try {
    const familyGroup = await joinFamilyGroup(user.id, inviteCode)

    return NextResponse.json({
      success: true,
      data: familyGroup,
      message: '成功加入家庭组'
    }, { status: 200 })
  } catch (error: any) {
    console.error('加入家庭组失败:', error)

    if (error.message.includes('已属于其他家庭组') || error.message.includes('已在该家庭组中') || error.message.includes('邀请码无效')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '加入家庭组失败' },
      { status: 500 }
    )
  }
}
