import { NextRequest, NextResponse } from 'next/server'
import { dissolveFamilyGroup, getFamilyGroupByUserId, validateFamilyGroupMembership } from '@/lib/services/family-group-service'
import { User } from '@/lib/types/auth'

// GET /api/family-groups/[id] - 获取家庭组详情
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
    // 验证用户是否属于该家庭组
    const isMember = await validateFamilyGroupMembership(user.id, id)

    if (!isMember) {
      return NextResponse.json(
        { error: '您不属于该家庭组' },
        { status: 403 }
      )
    }

    // 获取用户的家庭组（应该与请求的ID匹配）
    const familyGroup = await getFamilyGroupByUserId(user.id)

    if (!familyGroup || familyGroup.id !== id) {
      return NextResponse.json(
        { error: '家庭组不存在或无权访问' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: familyGroup
    })
  } catch (error) {
    console.error('获取家庭组详情失败:', error)
    return NextResponse.json(
      { error: '获取家庭组详情失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/family-groups/[id] - 解散家庭组
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
    const result = await dissolveFamilyGroup(id, user.id)

    return NextResponse.json({
      success: true,
      message: result.message
    })
  } catch (error) {
    console.error('解散家庭组失败:', error)
    const errorMessage = error instanceof Error ? error.message : '解散家庭组失败'

    if (errorMessage.includes('只有创建者')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      )
    }

    if (errorMessage.includes('不存在')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '解散家庭组失败' },
      { status: 500 }
    )
  }
}
