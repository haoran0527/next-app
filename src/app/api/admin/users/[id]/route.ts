/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { prisma } from '@/lib/prisma'
import { getUserDetails } from '@/lib/services/admin-service'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/services/audit-log-service'

/**
 * 获取用户详细信息（管理员专用）
 * GET /api/admin/users/[id]
 */
async function handleGetUserDetails(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/').pop()

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少用户ID' 
        },
        { status: 400 }
      )
    }

    // 使用管理员服务获取用户详情
    const userDetails = await getUserDetails(user, userId)

    return NextResponse.json({
      success: true,
      data: userDetails
    })
  } catch (error) {
    console.error('获取用户详情失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '获取用户详情失败'
    
    if (errorMessage === '用户不存在') {
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage 
        },
        { status: 404 }
      )
    }
    
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
 * 更新用户信息（管理员专用）
 * PUT /api/admin/users/[id]
 */
async function handleUpdateUser(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/').pop()

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少用户ID' 
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const updateData: any = {}
    const changes: any = {}

    // 验证和准备更新数据
    if (body.email !== undefined) {
      // 检查邮箱唯一性
      const existingUser = await prisma.user.findFirst({
        where: { 
          email: body.email.toLowerCase(),
          id: { not: userId }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { 
            success: false,
            error: '该邮箱已被其他用户使用' 
          },
          { status: 400 }
        )
      }

      updateData.email = body.email.toLowerCase()
      changes.email = body.email.toLowerCase()
    }

    if (body.username !== undefined) {
      // 检查用户名唯一性
      const existingUser = await prisma.user.findFirst({
        where: { 
          username: body.username,
          id: { not: userId }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { 
            success: false,
            error: '该用户名已被其他用户使用' 
          },
          { status: 400 }
        )
      }

      updateData.username = body.username
      changes.username = body.username
    }

    if (body.nickname !== undefined) {
      updateData.nickname = body.nickname
      changes.nickname = body.nickname
    }

    if (body.role !== undefined) {
      if (!['USER', 'ADMIN'].includes(body.role)) {
        return NextResponse.json(
          { 
            success: false,
            error: '无效的角色' 
          },
          { status: 400 }
        )
      }
      updateData.role = body.role
      changes.role = body.role
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
      changes.isActive = body.isActive
    }

    if (body.password !== undefined) {
      // 更新密码
      const bcrypt = require('bcryptjs')
      updateData.password = await bcrypt.hash(body.password, 12)
      changes.passwordChanged = true
    }

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    // 记录管理员操作
    await logAdminAction(user, ADMIN_ACTIONS.USER_UPDATE, userId, {
      changes,
      targetUser: {
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedUser
    })
  } catch (error) {
    console.error('更新用户失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '更新用户失败'
    
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
 * 删除用户（管理员专用）
 * DELETE /api/admin/users/[id]
 */
async function handleDeleteUser(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/').pop()

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少用户ID' 
        },
        { status: 400 }
      )
    }

    // 防止管理员删除自己
    if (userId === user.id) {
      return NextResponse.json(
        { 
          success: false,
          error: '不能删除自己的账户' 
        },
        { status: 400 }
      )
    }

    // 检查用户是否存在并获取用户信息用于日志记录
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        _count: {
          select: {
            transactions: true,
            sessions: true
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { 
          success: false,
          error: '用户不存在' 
        },
        { status: 404 }
      )
    }

    // 删除用户（由于设置了 onDelete: Cascade，相关的交易记录和会话也会被删除）
    await prisma.user.delete({
      where: { id: userId }
    })

    // 记录管理员操作
    await logAdminAction(user, ADMIN_ACTIONS.USER_DELETE, userId, {
      deletedUser: {
        email: targetUser.email,
        username: targetUser.username,
        role: targetUser.role,
        transactionCount: targetUser._count.transactions,
        sessionCount: targetUser._count.sessions
      }
    })

    return NextResponse.json({
      success: true,
      message: '用户已删除'
    })
  } catch (error) {
    console.error('删除用户失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '删除用户失败'
    
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
export const GET = protectAdminApi(handleGetUserDetails)
export const PUT = protectAdminApi(handleUpdateUser)
export const DELETE = protectAdminApi(handleDeleteUser)