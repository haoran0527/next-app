import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { getSystemStats } from '@/lib/services/admin-service'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/services/audit-log-service'

/**
 * 获取系统统计信息（管理员专用）
 * GET /api/admin/stats
 */
async function handleGetSystemStats(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    // 获取系统统计
    const stats = await getSystemStats(user)

    // 记录管理员查看系统统计的操作
    await logAdminAction(user, ADMIN_ACTIONS.SYSTEM_STATS_VIEW, undefined, {
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取系统统计失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '获取系统统计失败'
    
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
export const GET = protectAdminApi(handleGetSystemStats)