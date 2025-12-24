import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth-middleware'
import { User } from '@/lib/types/auth'

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
async function handleGetCurrentUser(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}

// 导出受保护的API处理器
export const GET = withAuth(handleGetCurrentUser)