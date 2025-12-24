import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { getAuditLogs, cleanupOldAuditLogs, AuditLogFilters } from '@/lib/services/audit-log-service'

/**
 * 获取审计日志列表（管理员专用）
 * GET /api/admin/audit-logs
 */
async function handleGetAuditLogs(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    
    // 解析查询参数
    const filters: AuditLogFilters = {
      adminId: searchParams.get('adminId') || undefined,
      action: searchParams.get('action') || undefined,
      targetId: searchParams.get('targetId') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    }

    // 解析日期参数
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    
    if (startDateStr) {
      filters.startDate = new Date(startDateStr)
    }
    
    if (endDateStr) {
      filters.endDate = new Date(endDateStr)
    }

    // 获取审计日志
    const result = await getAuditLogs(user, filters)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取审计日志失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '获取审计日志失败'
    
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
 * 清理旧的审计日志（管理员专用）
 * DELETE /api/admin/audit-logs
 */
async function handleCleanupAuditLogs(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { retentionDays = 90 } = body

    // 验证参数
    if (retentionDays < 1 || retentionDays > 365) {
      return NextResponse.json(
        { 
          success: false,
          error: '保留天数必须在1-365之间' 
        },
        { status: 400 }
      )
    }

    // 清理旧日志
    const deletedCount = await cleanupOldAuditLogs(user, retentionDays)

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        retentionDays,
        message: `已清理 ${deletedCount} 条超过 ${retentionDays} 天的审计日志`
      }
    })
  } catch (error) {
    console.error('清理审计日志失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '清理审计日志失败'
    
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
export const GET = protectAdminApi(handleGetAuditLogs)
export const DELETE = protectAdminApi(handleCleanupAuditLogs)