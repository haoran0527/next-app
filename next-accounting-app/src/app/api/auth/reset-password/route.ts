import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// 密码重置请求验证模式
const resetPasswordSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  newPassword: z.string()
    .min(8, '密码至少需要8个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "密码确认不匹配",
  path: ["confirmPassword"],
})

/**
 * 用户密码重置API
 * 注意：这是一个简化版本，实际生产环境中应该包含邮箱验证流程
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证请求数据
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: '输入数据验证失败',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { email, newPassword } = validation.data

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // 为了安全考虑，不透露用户是否存在
      return NextResponse.json(
        { 
          success: true, 
          message: '如果该邮箱存在，密码重置链接已发送' 
        },
        { status: 200 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: '账户已被禁用' 
        },
        { status: 403 }
      )
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // 更新用户密码
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    // 清除用户的所有会话（强制重新登录）
    await prisma.session.deleteMany({
      where: { userId: user.id }
    })

    return NextResponse.json(
      {
        success: true,
        message: '密码重置成功，请使用新密码登录'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('密码重置API错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误' 
      },
      { status: 500 }
    )
  }
}