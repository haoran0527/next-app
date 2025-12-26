import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/services/auth-service'
import { LoginCredentials } from '@/lib/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, rememberMe }: LoginCredentials & { username?: string; rememberMe?: boolean } = body

    // 验证必填字段 - 支持用户名或邮箱登录
    const identifier = email || username
    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          error: '用户名/邮箱和密码都是必填项'
        },
        { status: 400 }
      )
    }

    // 调用登录服务（支持用户名或邮箱）
    const result = await signIn({ email: identifier, password }, rememberMe || false)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 401 }
      )
    }

    // 登录成功，设置会话Cookie
    const response = NextResponse.json(
      {
        success: true,
        message: '登录成功',
        sessionToken: result.session!.token, // 添加会话令牌到响应中
        user: {
          id: result.user!.id,
          email: result.user!.email,
          username: result.user!.username,
          role: result.user!.role
        }
      },
      { status: 200 }
    )

    // 设置会话Cookie
    const cookieOptions = {
      httpOnly: true,
      secure: false, // 暂时禁用，因为使用HTTP而非HTTPS
      sameSite: 'strict' as const,
      maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7天或1天
      path: '/note'
    }

    response.cookies.set('session-token', result.session!.token, cookieOptions)

    return response
  } catch (error) {
    console.error('登录API错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误' 
      },
      { status: 500 }
    )
  }
}