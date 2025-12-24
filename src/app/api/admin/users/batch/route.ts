import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/services/audit-log-service'

/**
 * 批量用户操作（管理员专用）
 * POST /api/admin/users/batch
 */
async function handleBatchUserOperations(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, userIds, ...actionData } = body

    // 验证输入
    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少必需参数：action 和 userIds' 
        },
        { status: 400 }
      )
    }

    // 限制批量操作的数量
    if (userIds.length > 100) {
      return NextResponse.json(
        { 
          success: false,
          error: '批量操作最多支持100个用户' 
        },
        { status: 400 }
      )
    }

    // 防止管理员对自己执行某些操作
    if (['disable', 'delete'].includes(action) && userIds.includes(user.id)) {
      return NextResponse.json(
        { 
          success: false,
          error: '不能对自己执行此操作' 
        },
        { status: 400 }
      )
    }

    // 获取目标用户信息
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    })

    if (targetUsers.length !== userIds.length) {
      return NextResponse.json(
        { 
          success: false,
          error: '部分用户不存在' 
        },
        { status: 400 }
      )
    }

    let results: any[] = []
    let successCount = 0
    let failureCount = 0

    switch (action) {
      case 'enable':
        // 批量启用用户
        const enableResult = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true }
        })
        
        successCount = enableResult.count
        results = targetUsers.map(u => ({ 
          userId: u.id, 
          email: u.email, 
          status: 'enabled' 
        }))
        break

      case 'disable':
        // 批量禁用用户
        const disableResult = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false }
        })

        // 清除这些用户的所有会话
        await prisma.session.deleteMany({
          where: { userId: { in: userIds } }
        })
        
        successCount = disableResult.count
        results = targetUsers.map(u => ({ 
          userId: u.id, 
          email: u.email, 
          status: 'disabled' 
        }))
        break

      case 'delete':
        // 批量删除用户
        for (const targetUser of targetUsers) {
          try {
            await prisma.user.delete({
              where: { id: targetUser.id }
            })
            
            results.push({ 
              userId: targetUser.id, 
              email: targetUser.email, 
              status: 'deleted' 
            })
            successCount++
          } catch (error) {
            results.push({ 
              userId: targetUser.id, 
              email: targetUser.email, 
              status: 'failed',
              error: error instanceof Error ? error.message : '删除失败'
            })
            failureCount++
          }
        }
        break

      case 'change-role':
        // 批量更改角色
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

        const roleChangeResult = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { role: newRole }
        })
        
        successCount = roleChangeResult.count
        results = targetUsers.map(u => ({ 
          userId: u.id, 
          email: u.email, 
          oldRole: u.role,
          newRole,
          status: 'role_changed' 
        }))
        break

      case 'clear-sessions':
        // 批量清除会话
        const sessionResult = await prisma.session.deleteMany({
          where: { userId: { in: userIds } }
        })
        
        successCount = userIds.length
        results = targetUsers.map(u => ({ 
          userId: u.id, 
          email: u.email, 
          status: 'sessions_cleared' 
        }))
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

    // 记录管理员批量操作
    await logAdminAction(user, `BATCH_${action.toUpperCase()}`, undefined, {
      targetUserIds: userIds,
      targetUsers: targetUsers.map(u => ({ email: u.email, username: u.username })),
      successCount,
      failureCount,
      results
    })

    return NextResponse.json({
      success: true,
      data: {
        action,
        totalUsers: userIds.length,
        successCount,
        failureCount,
        results
      }
    })
  } catch (error) {
    console.error('批量用户操作失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '批量用户操作失败'
    
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
export const POST = protectAdminApi(handleBatchUserOperations)