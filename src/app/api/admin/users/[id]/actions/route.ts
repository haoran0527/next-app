import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/services/audit-log-service'
import { generateTemporaryPassword } from '@/lib/services/user-service'

/**
 * 用户管理操作（管理员专用）
 * POST /api/admin/users/[id]/actions
 */
async function handleUserActions(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/')[4] // 从 /api/admin/users/[id]/actions 中提取 id

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
    const { action, ...actionData } = body

    // 防止管理员对自己执行某些操作
    if (userId === user.id && ['disable', 'delete'].includes(action)) {
      return NextResponse.json(
        { 
          success: false,
          error: '不能对自己执行此操作' 
        },
        { status: 400 }
      )
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
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

    let result: any = {}
    let auditAction: string = ''
    let auditDetails: any = {}

    switch (action) {
      case 'enable':
        // 启用用户
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: true }
        })
        
        result = { message: '用户已启用' }
        auditAction = ADMIN_ACTIONS.USER_ENABLE
        auditDetails = { targetUser: { email: targetUser.email, username: targetUser.username } }
        break

      case 'disable':
        // 禁用用户
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: false }
        })

        // 同时删除用户的所有活跃会话
        await prisma.session.deleteMany({
          where: { userId }
        })
        
        result = { message: '用户已禁用，所有会话已清除' }
        auditAction = ADMIN_ACTIONS.USER_DISABLE
        auditDetails = { 
          targetUser: { email: targetUser.email, username: targetUser.username },
          sessionsCleared: true
        }
        break

      case 'reset-password':
        // 重置密码
        const temporaryPassword = generateTemporaryPassword()
        const bcrypt = require('bcryptjs')
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword }
        })

        // 删除用户的所有会话，强制重新登录
        await prisma.session.deleteMany({
          where: { userId }
        })
        
        result = { 
          message: '密码已重置',
          temporaryPassword,
          note: '请将临时密码安全地传达给用户，用户需要在首次登录时更改密码'
        }
        auditAction = ADMIN_ACTIONS.USER_PASSWORD_RESET
        auditDetails = { 
          targetUser: { email: targetUser.email, username: targetUser.username },
          sessionsCleared: true
        }
        break

      case 'change-role':
        // 更改用户角色
        const { newRole } = actionData
        
        if (!['USER', 'ADMIN'].includes(newRole)) {
          return NextResponse.json(
            { 
              success: false,
              error: '无效的角色' 
            },
            { status: 400 }
          )
        }

        await prisma.user.update({
          where: { id: userId },
          data: { role: newRole }
        })
        
        result = { message: `用户角色已更改为 ${newRole}` }
        auditAction = ADMIN_ACTIONS.ROLE_CHANGE
        auditDetails = { 
          targetUser: { email: targetUser.email, username: targetUser.username },
          oldRole: targetUser.role,
          newRole
        }
        break

      case 'clear-sessions':
        // 清除用户所有会话
        const deletedSessions = await prisma.session.deleteMany({
          where: { userId }
        })
        
        result = { 
          message: '用户会话已清除',
          clearedSessions: deletedSessions.count
        }
        auditAction = 'USER_SESSIONS_CLEARED'
        auditDetails = { 
          targetUser: { email: targetUser.email, username: targetUser.username },
          clearedCount: deletedSessions.count
        }
        break

      case 'clear-data':
        // 清除用户所有财务数据（保留用户账户）
        const deletedTransactions = await prisma.transaction.deleteMany({
          where: { userId }
        })
        
        result = { 
          message: '用户财务数据已清除',
          deletedTransactions: deletedTransactions.count
        }
        auditAction = 'USER_DATA_CLEARED'
        auditDetails = { 
          targetUser: { email: targetUser.email, username: targetUser.username },
          deletedTransactions: deletedTransactions.count
        }
        break

      default:
        return NextResponse.json(
          { 
            success: false,
            error: '无效的操作类型' 
          },
          { status: 400 }
        )
    }

    // 记录管理员操作
    await logAdminAction(user, auditAction, userId, auditDetails)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('用户操作失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '用户操作失败'
    
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
export const POST = protectAdminApi(handleUserActions)