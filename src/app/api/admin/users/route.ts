import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { prisma } from '@/lib/prisma'
import { getAllUsers } from '@/lib/services/admin-service'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/services/audit-log-service'

/**
 * 获取所有用户列表（管理员专用）
 * GET /api/admin/users
 */
async function handleGetAllUsers(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    
    // 解析查询参数
    const filters = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') as 'USER' | 'ADMIN' | undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    // 使用管理员服务获取用户列表
    const result = await getAllUsers(user, filters)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '获取用户列表失败'
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    )
  }
}

/**
 * 创建新用户（管理员专用）
 * POST /api/admin/users
 */
async function handleCreateUser(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { email, username, password, role = 'USER' } = body

    // 验证必需字段
    if (!email || !username || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少必需字段' 
        },
        { status: 400 }
      )
    }

    // 验证角色
    if (!['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { 
          success: false,
          error: '无效的角色' 
        },
        { status: 400 }
      )
    }

    // 检查邮箱唯一性
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false,
          error: '该邮箱已被注册' 
        },
        { status: 400 }
      )
    }

    // 检查用户名唯一性
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUsername) {
      return NextResponse.json(
        { 
          success: false,
          error: '该用户名已被使用' 
        },
        { status: 400 }
      )
    }

    // 创建用户
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        password: hashedPassword,
        role,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // 记录管理员操作
    await logAdminAction(user, ADMIN_ACTIONS.USER_CREATE, newUser.id, {
      targetUser: {
        email: newUser.email,
        username: newUser.username,
        role: newUser.role
      }
    })

    return NextResponse.json({
      success: true,
      data: newUser
    }, { status: 201 })
  } catch (error) {
    console.error('创建用户失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '创建用户失败'
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    )
  }
}

// 导出受保护的API处理器
export const GET = protectAdminApi(handleGetAllUsers)
export const POST = protectAdminApi(handleCreateUser)