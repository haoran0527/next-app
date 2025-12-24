import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/session-service'
import { 
  exportUserTransactionsCsv, 
  validateExportPermission,
  getExportStats,
  ExportOptions 
} from '@/lib/services/export-service'

/**
 * GET /api/transactions/export - 导出用户财务记录为CSV
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const format = searchParams.get('format') || 'locale'
    const includeHeaders = searchParams.get('includeHeaders') !== 'false'
    const statsOnly = searchParams.get('statsOnly') === 'true'

    // 构建导出选项
    const options: ExportOptions = {
      includeHeaders,
      dateFormat: format as 'ISO' | 'locale'
    }

    if (startDateParam) {
      options.startDate = new Date(startDateParam)
      if (isNaN(options.startDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '开始日期格式无效' },
          { status: 400 }
        )
      }
    }

    if (endDateParam) {
      options.endDate = new Date(endDateParam)
      if (isNaN(options.endDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '结束日期格式无效' },
          { status: 400 }
        )
      }
    }

    // 验证日期范围
    if (options.startDate && options.endDate && options.startDate > options.endDate) {
      return NextResponse.json(
        { success: false, error: '开始日期不能晚于结束日期' },
        { status: 400 }
      )
    }

    // 如果只需要统计信息
    if (statsOnly) {
      const stats = await getExportStats(currentUser.id, options)
      return NextResponse.json({
        success: true,
        stats
      })
    }

    // 验证导出权限
    const permissionCheck = validateExportPermission(currentUser.id, currentUser.id)
    if (!permissionCheck.isValid) {
      return NextResponse.json(
        { success: false, error: permissionCheck.error },
        { status: 403 }
      )
    }

    // 执行导出
    const exportResult = await exportUserTransactionsCsv(currentUser.id, options)
    
    if (!exportResult.success) {
      return NextResponse.json(
        { success: false, error: exportResult.error },
        { status: 400 }
      )
    }

    // 设置响应头以触发文件下载
    const headers = new Headers()
    headers.set('Content-Type', 'text/csv; charset=utf-8')
    headers.set('Content-Disposition', `attachment; filename="${exportResult.filename}"`)
    headers.set('Cache-Control', 'no-cache')

    // 添加BOM以确保Excel正确显示中文
    const bom = '\uFEFF'
    const csvWithBom = bom + exportResult.data

    return new NextResponse(csvWithBom, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('导出API错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/transactions/export - 批量导出（支持更复杂的筛选条件）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { 
      startDate, 
      endDate, 
      includeHeaders = true, 
      dateFormat = 'locale',
      statsOnly = false 
    } = body

    // 构建导出选项
    const options: ExportOptions = {
      includeHeaders,
      dateFormat
    }

    if (startDate) {
      options.startDate = new Date(startDate)
      if (isNaN(options.startDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '开始日期格式无效' },
          { status: 400 }
        )
      }
    }

    if (endDate) {
      options.endDate = new Date(endDate)
      if (isNaN(options.endDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '结束日期格式无效' },
          { status: 400 }
        )
      }
    }

    // 验证日期范围
    if (options.startDate && options.endDate && options.startDate > options.endDate) {
      return NextResponse.json(
        { success: false, error: '开始日期不能晚于结束日期' },
        { status: 400 }
      )
    }

    // 如果只需要统计信息
    if (statsOnly) {
      const stats = await getExportStats(currentUser.id, options)
      return NextResponse.json({
        success: true,
        stats
      })
    }

    // 验证导出权限
    const permissionCheck = validateExportPermission(currentUser.id, currentUser.id)
    if (!permissionCheck.isValid) {
      return NextResponse.json(
        { success: false, error: permissionCheck.error },
        { status: 403 }
      )
    }

    // 执行导出
    const exportResult = await exportUserTransactionsCsv(currentUser.id, options)
    
    if (!exportResult.success) {
      return NextResponse.json(
        { success: false, error: exportResult.error },
        { status: 400 }
      )
    }

    // 设置响应头以触发文件下载
    const headers = new Headers()
    headers.set('Content-Type', 'text/csv; charset=utf-8')
    headers.set('Content-Disposition', `attachment; filename="${exportResult.filename}"`)
    headers.set('Cache-Control', 'no-cache')

    // 添加BOM以确保Excel正确显示中文
    const bom = '\uFEFF'
    const csvWithBom = bom + exportResult.data

    return new NextResponse(csvWithBom, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('导出API错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}