import { Transaction } from '../types/transaction'
import { getTransactions } from './transaction-service'

/**
 * CSV导出相关的类型定义
 */
export interface ExportOptions {
  startDate?: Date
  endDate?: Date
  includeHeaders?: boolean
  dateFormat?: 'ISO' | 'locale'
}

export interface ExportResult {
  success: boolean
  data?: string
  filename?: string
  error?: string
}

/**
 * 将交易记录转换为CSV格式
 */
export function transactionsToCsv(
  transactions: Transaction[], 
  options: ExportOptions = {}
): string {
  const { includeHeaders = true, dateFormat = 'locale' } = options
  
  const lines: string[] = []
  
  // 添加CSV头部
  if (includeHeaders) {
    lines.push('日期,类型,分类,金额,描述,创建时间')
  }
  
  // 转换每条记录
  transactions.forEach(transaction => {
    const date = formatDateForCsv(transaction.date, dateFormat)
    const type = transaction.type === 'INCOME' ? '收入' : '支出'
    const category = escapeCsvField(transaction.category)
    const amount = transaction.amount.toFixed(2)
    const description = escapeCsvField(transaction.description || '')
    const createdAt = formatDateForCsv(transaction.createdAt, dateFormat)
    
    lines.push(`${date},${type},${category},${amount},${description},${createdAt}`)
  })
  
  return lines.join('\n')
}

/**
 * 格式化日期用于CSV导出
 */
function formatDateForCsv(date: Date, format: 'ISO' | 'locale'): string {
  if (format === 'ISO') {
    return date.toISOString().split('T')[0]
  }
  
  // 使用中文本地化格式
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 转义CSV字段中的特殊字符
 */
function escapeCsvField(field: string): string {
  // 如果字段包含逗号、引号或换行符，需要用引号包围并转义内部引号
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/**
 * 生成导出文件名
 */
function generateExportFilename(userId: string, options: ExportOptions): string {
  const now = new Date()
  const timestamp = now.toISOString().split('T')[0].replace(/-/g, '')
  
  let filename = `财务记录_${timestamp}`
  
  if (options.startDate && options.endDate) {
    const startStr = options.startDate.toISOString().split('T')[0].replace(/-/g, '')
    const endStr = options.endDate.toISOString().split('T')[0].replace(/-/g, '')
    filename = `财务记录_${startStr}_${endStr}`
  }
  
  return `${filename}.csv`
}

/**
 * 导出用户的所有财务记录为CSV
 */
export async function exportUserTransactionsCsv(
  userId: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  try {
    // 获取用户的所有财务记录（不分页）
    const result = await getTransactions(userId, {
      startDate: options.startDate,
      endDate: options.endDate,
      limit: 10000 // 设置一个较大的限制，实际应用中可能需要分批处理
    })
    
    if (result.transactions.length === 0) {
      return {
        success: false,
        error: '没有找到符合条件的财务记录'
      }
    }
    
    // 转换为CSV格式
    const csvData = transactionsToCsv(result.transactions, options)
    
    // 生成文件名
    const filename = generateExportFilename(userId, options)
    
    return {
      success: true,
      data: csvData,
      filename
    }
  } catch (error) {
    console.error('导出财务记录失败:', error)
    return {
      success: false,
      error: '导出失败，请稍后重试'
    }
  }
}

/**
 * 导出用户指定日期范围的财务记录
 */
export async function exportUserTransactionsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
  options: Omit<ExportOptions, 'startDate' | 'endDate'> = {}
): Promise<ExportResult> {
  return exportUserTransactionsCsv(userId, {
    ...options,
    startDate,
    endDate
  })
}

/**
 * 验证导出权限（确保用户只能导出自己的数据）
 */
export function validateExportPermission(
  requestUserId: string,
  targetUserId: string
): { isValid: boolean; error?: string } {
  if (requestUserId !== targetUserId) {
    return {
      isValid: false,
      error: '无权限导出其他用户的数据'
    }
  }
  
  return { isValid: true }
}

/**
 * 获取导出统计信息
 */
export async function getExportStats(
  userId: string,
  options: ExportOptions = {}
): Promise<{
  totalRecords: number
  dateRange: { start?: Date; end?: Date }
  estimatedFileSize: number // 字节
}> {
  try {
    const result = await getTransactions(userId, {
      startDate: options.startDate,
      endDate: options.endDate,
      limit: 1 // 只需要获取总数
    })
    
    // 估算文件大小（每条记录大约100字节）
    const estimatedFileSize = result.total * 100
    
    return {
      totalRecords: result.total,
      dateRange: {
        start: options.startDate,
        end: options.endDate
      },
      estimatedFileSize
    }
  } catch (error) {
    console.error('获取导出统计失败:', error)
    return {
      totalRecords: 0,
      dateRange: {},
      estimatedFileSize: 0
    }
  }
}