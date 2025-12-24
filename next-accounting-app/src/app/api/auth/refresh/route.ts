import { NextRequest, NextResponse } from 'next/server'
import { refreshSession } from '@/lib/services/auth-service'

/**
 * 会话刷新API
 * 用于延长用户会话的有效期
 */
export async function POST(request: NextRequest) {
  try {
    // 从Cookie获取会话令牌
    const token = request.cookies.get('session-token')?.value

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: '未找到会话令牌' 
        },
        { status: 401 }
      )
    }

    // 获取请求体中的rememberMe选项
    const body = await request.json().catch(() => ({}))
    const { rememberMe = false } = body

    // 刷新会话
    const result = await refreshSession(token, rememberMe)

    if (!result.success) {
      // 清除无效的Cookie
      const response = NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 401 }
      )

      response.cookies.set('session-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      })

      return response
    }

    // 更新Cookie
    const response = NextResponse.json(
      {
        success: true,
        message: '会话刷新成功',
        user: {
          id: result.user!.id,
          email: result.user!.email,
          username: result.user!.username,
          role: result.user!.role
        }
      },
      { status: 200 }
    )

    // 更新会话Cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7天或1天
      path: '/'
    }

    response.cookies.set('session-token', result.session!.token, cookieOptions)

    return response
  } catch (error) {
    console.error('会话刷新API错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误' 
      },
      { status: 500 }
    )
  }
}