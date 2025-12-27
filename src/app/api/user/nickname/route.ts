import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth-middleware'
import { User } from '@/lib/types/auth'
import { prisma } from '@/lib/prisma'

/**
 * 更新用户昵称
 * PUT /api/user/nickname
 */
async function handleUpdateNickname(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { nickname } = body

    if (nickname === undefined) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少昵称参数' 
        },
        { status: 400 }
      )
    }

    if (typeof nickname !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: '昵称必须是字符串' 
        },
        { status: 400 }
      )
    }

    if (nickname.length > 50) {
      return NextResponse.json(
        { 
          success: false,
          error: '昵称长度不能超过50个字符' 
        },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { nickname },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedUser
    })
  } catch (error) {
    console.error('更新昵称失败:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '更新昵称失败' 
      },
      { status: 500 }
    )
  }
}

export const PUT = withAuth(handleUpdateNickname)
