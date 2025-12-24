import { NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/lib/services/auth-service'
import { CreateUserData } from '@/lib/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password }: CreateUserData = body

    // 验证必填字段
    if (!email || !username || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: '邮箱、用户名和密码都是必填项' 
        },
        { status: 400 }
      )
    }

    // 调用注册服务
    const result = await signUp({ email, username, password })

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      )
    }

    // 注册成功，返回用户信息（不包含敏感信息）
    return NextResponse.json(
      {
        success: true,
        message: '注册成功',
        user: {
          id: result.user!.id,
          email: result.user!.email,
          username: result.user!.username,
          role: result.user!.role,
          createdAt: result.user!.createdAt
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('注册API错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误' 
      },
      { status: 500 }
    )
  }
}