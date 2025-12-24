import { User } from '../types/auth'

/**
 * 数据隔离验证工具
 * 确保所有数据库查询都包含正确的用户过滤条件
 */

export interface QueryValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * 验证查询条件是否包含用户隔离
 */
export function validateQueryIsolation(
  whereClause: any,
  currentUser: User,
  resourceType: 'transaction' | 'user' | 'session' = 'transaction'
): QueryValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 管理员可以跳过某些验证
  const isAdmin = currentUser.role === 'ADMIN'

  switch (resourceType) {
    case 'transaction':
      // 交易记录必须包含userId过滤
      if (!whereClause.userId && !isAdmin) {
        errors.push('交易记录查询缺少userId过滤条件')
      }
      
      // 如果包含userId，验证是否为当前用户或管理员允许的用户
      if (whereClause.userId && !isAdmin && whereClause.userId !== currentUser.id) {
        errors.push('尝试访问其他用户的交易记录')
      }
      break

    case 'user':
      // 用户查询，普通用户只能查询自己
      if (!isAdmin) {
        if (!whereClause.id || whereClause.id !== currentUser.id) {
          errors.push('普通用户只能查询自己的用户信息')
        }
      }
      break

    case 'session':
      // 会话查询必须包含userId过滤
      if (!whereClause.userId && !isAdmin) {
        errors.push('会话查询缺少userId过滤条件')
      }
      
      if (whereClause.userId && !isAdmin && whereClause.userId !== currentUser.id) {
        errors.push('尝试访问其他用户的会话')
      }
      break
  }

  // 检查是否有潜在的安全风险
  if (whereClause.OR && !isAdmin) {
    warnings.push('使用OR条件可能绕过数据隔离，请仔细检查')
  }

  if (whereClause.NOT && !isAdmin) {
    warnings.push('使用NOT条件可能绕过数据隔离，请仔细检查')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 自动添加用户隔离条件
 */
export function addUserIsolation(
  whereClause: any,
  currentUser: User,
  resourceType: 'transaction' | 'user' | 'session' = 'transaction'
): any {
  // 管理员可以访问所有数据，但如果已经指定了userId则保持
  if (currentUser.role === 'ADMIN') {
    return whereClause
  }

  const isolatedWhere = { ...whereClause }

  switch (resourceType) {
    case 'transaction':
      isolatedWhere.userId = currentUser.id
      break

    case 'user':
      isolatedWhere.id = currentUser.id
      break

    case 'session':
      isolatedWhere.userId = currentUser.id
      break
  }

  return isolatedWhere
}

/**
 * 验证更新操作的数据隔离
 */
export function validateUpdateIsolation(
  updateData: any,
  currentUser: User,
  resourceType: 'transaction' | 'user' | 'session' = 'transaction'
): QueryValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 管理员可以更新任何数据
  if (currentUser.role === 'ADMIN') {
    return { isValid: true, errors, warnings }
  }

  switch (resourceType) {
    case 'transaction':
      // 普通用户不能修改userId
      if (updateData.userId && updateData.userId !== currentUser.id) {
        errors.push('不能将交易记录分配给其他用户')
      }
      break

    case 'user':
      // 普通用户不能修改某些敏感字段
      if (updateData.role) {
        errors.push('普通用户不能修改角色')
      }
      if (updateData.isActive !== undefined) {
        errors.push('普通用户不能修改账户状态')
      }
      break

    case 'session':
      // 普通用户不能修改会话的userId
      if (updateData.userId && updateData.userId !== currentUser.id) {
        errors.push('不能将会话分配给其他用户')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 创建安全的查询构建器
 */
export class SecureQueryBuilder {
  private whereClause: any = {}
  private currentUser: User
  private resourceType: 'transaction' | 'user' | 'session'

  constructor(user: User, resourceType: 'transaction' | 'user' | 'session' = 'transaction') {
    this.currentUser = user
    this.resourceType = resourceType
    
    // 自动添加用户隔离条件
    this.whereClause = addUserIsolation({}, user, resourceType)
  }

  /**
   * 添加查询条件
   */
  where(field: string, value: any): this {
    this.whereClause[field] = value
    return this
  }

  /**
   * 添加日期范围查询
   */
  dateRange(field: string, startDate?: Date, endDate?: Date): this {
    if (startDate || endDate) {
      this.whereClause[field] = {}
      if (startDate) {
        this.whereClause[field].gte = startDate
      }
      if (endDate) {
        this.whereClause[field].lte = endDate
      }
    }
    return this
  }

  /**
   * 添加IN查询
   */
  whereIn(field: string, values: any[]): this {
    this.whereClause[field] = { in: values }
    return this
  }

  /**
   * 构建最终的查询条件
   */
  build(): any {
    // 验证查询条件
    const validation = validateQueryIsolation(this.whereClause, this.currentUser, this.resourceType)
    
    if (!validation.isValid) {
      throw new Error(`查询验证失败: ${validation.errors.join(', ')}`)
    }

    if (validation.warnings.length > 0) {
      console.warn('查询警告:', validation.warnings.join(', '))
    }

    return this.whereClause
  }

  /**
   * 获取当前查询条件（不进行验证）
   */
  getWhere(): any {
    return { ...this.whereClause }
  }
}

/**
 * 创建安全查询构建器
 */
export function createSecureQuery(
  user: User,
  resourceType: 'transaction' | 'user' | 'session' = 'transaction'
): SecureQueryBuilder {
  return new SecureQueryBuilder(user, resourceType)
}