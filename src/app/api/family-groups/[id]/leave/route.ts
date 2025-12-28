import { NextRequest, NextResponse } from 'next/server'
import { leaveFamilyGroup, validateFamilyGroupMembership } from '@/lib/services/family-group-service'
import { User } from '@/lib/types/auth'

// DELETE /api/family-groups/[id]/leave - 退出家庭组
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    // 验证用户是否属于该家庭组
    const isMember = await validateFamilyGroupMembership(user.id, id)

    if (!isMember) {
      return NextResponse.json(
        { error: '您不属于该家庭组' },
        { status: 403 }
      )
    }

    const result = await leaveFamilyGroup(user.id)

    return NextResponse.json({
      success: true,
      message: result.message
    })
  } catch (error: any) {
    console.error('退出家庭组失败:', error)

    if (error.message.includes('创建者')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    if (error.message.includes('不属于任何家庭组')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '退出家庭组失败' },
      { status: 500 }
    )
  }
}
