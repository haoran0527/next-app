import { NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/lib/services/auth-service'

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
        { status: 400 }
      )
    }

    // 调用登出服务
    const success = await signOut(token)

    // 创建响应
    const response = NextResponse.json(
      {
        success,
        message: success ? '登出成功' : '登出失败'
      },
      { status: success ? 200 : 500 }
    )

    // 清除会话Cookie
    if (success) {
      response.cookies.set('session-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      })
    }

    return response
  } catch (error) {
    console.error('登出API错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误' 
      },
      { status: 500 }
    )
  }
}