import { NextRequest, NextResponse } from 'next/server'
import { protectAdminApi } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { 
  createSystemBackup, 
  createUserBackup, 
  generateBackupFileName,
  validateBackupData,
  estimateBackupSize
} from '@/lib/services/backup-service'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/services/audit-log-service'

/**
 * 创建数据备份（管理员专用）
 * POST /api/admin/backup
 */
async function handleCreateBackup(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const {
      type = 'system', // 'system' | 'user'
      userId,
      options = {}
    } = body

    // 验证参数
    if (type === 'user' && !userId) {
      return NextResponse.json(
        { 
          success: false,
          error: '用户备份需要指定用户ID' 
        },
        { status: 400 }
      )
    }

    // 解析备份选项
    const backupOptions = {
      includePasswords: options.includePasswords || false,
      includeTokens: options.includeTokens || false,
      includeLogs: options.includeLogs !== false, // 默认包含日志
      dateRange: options.dateRange ? {
        startDate: new Date(options.dateRange.startDate),
        endDate: new Date(options.dateRange.endDate)
      } : undefined,
      userIds: options.userIds
    }

    let backupData
    let fileName

    if (type === 'user') {
      // 创建用户备份
      backupData = await createUserBackup(user, userId, backupOptions)
      fileName = generateBackupFileName('user', userId)
    } else {
      // 创建系统备份
      backupData = await createSystemBackup(user, backupOptions)
      fileName = generateBackupFileName('system')
    }

    // 验证备份数据完整性
    const validation = validateBackupData(backupData)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: '备份数据验证失败',
          details: validation.errors
        },
        { status: 500 }
      )
    }

    // 计算备份大小
    const sizeInfo = estimateBackupSize(backupData)

    // 检查是否需要下载文件
    const download = request.nextUrl.searchParams.get('download') === 'true'

    if (download) {
      // 直接返回文件下载
      const jsonContent = JSON.stringify(backupData, null, 2)
      
      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileName}"`
        }
      })
    } else {
      // 返回备份信息和数据
      return NextResponse.json({
        success: true,
        data: {
          fileName,
          metadata: backupData.metadata,
          sizeInfo,
          validation,
          backupData // 包含完整备份数据
        }
      })
    }
  } catch (error) {
    console.error('创建备份失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '创建备份失败'
    
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
 * 获取备份历史记录（管理员专用）
 * GET /api/admin/backup
 */
async function handleGetBackupHistory(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  try {
    // 记录管理员查看备份历史的操作
    await logAdminAction(user, ADMIN_ACTIONS.BACKUP_HISTORY_VIEW, undefined, {
      timestamp: new Date().toISOString()
    })

    // 这里可以从审计日志中获取备份历史
    // 暂时返回空数组，实际应用中可以实现备份历史存储
    
    return NextResponse.json({
      success: true,
      data: {
        backups: [],
        message: '备份历史功能待实现'
      }
    })
  } catch (error) {
    console.error('获取备份历史失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '获取备份历史失败'
    
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
export const POST = protectAdminApi(handleCreateBackup)
export const GET = protectAdminApi(handleGetBackupHistory)