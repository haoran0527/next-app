import { NextRequest, NextResponse } from 'next/server'
import { User } from '../types/auth'
import { withAuth, withSecureAccess } from './auth-middleware'

/**
 * API路由保护配置
 */
export interface ApiProtectionConfig {
  // 是否需要认证
  requireAuth?: boolean
  // 需要的角色
  requiredRole?: 'USER' | 'ADMIN'
  // 资源类型
  resourceType?: 'transaction' | 'user' | 'session' | 'system'
  // 操作类型
  action?: 'create' | 'read' | 'update' | 'delete' | 'admin'
  // 是否启用数据隔离
  enableDataIsolation?: boolean
  // 自定义权限检查
  customPermissionCheck?: (user: User, request: NextRequest) => Promise<boolean>
}

/**
 * 通用API路由保护中间件
 */
export function protectApiRoute(
  handler: (request: NextRequest, user?: User, secureDataAccess?: any) => Promise<NextResponse>,
  config: ApiProtectionConfig = {}
) {
  const {
    requireAuth = true,
    requiredRole,
    resourceType = 'transaction',
    action = 'read',
    enableDataIsolation = true,
    customPermissionCheck
  } = config

  // 如果不需要认证，直接执行处理器
  if (!requireAuth) {
    return async (request: NextRequest) => {
      return handler(request)
    }
  }

  // 如果需要数据隔离，使用安全访问中间件
  if (enableDataIsolation) {
    // 将 'system' 类型映射为 'transaction'，因为 withSecureAccess 不支持 'system'
    const safeResourceType = resourceType === 'system' ? 'transaction' : resourceType
    return withSecureAccess(
      async (request: NextRequest, user: User, secureDataAccess: any) => {
        // 执行自定义权限检查
        if (customPermissionCheck) {
          const hasCustomPermission = await customPermissionCheck(user, request)
          if (!hasCustomPermission) {
            return NextResponse.json(
              { error: '自定义权限检查失败' },
              { status: 403 }
            )
          }
        }

        return handler(request, user, secureDataAccess)
      },
      {
        resourceType: safeResourceType,
        action,
        resource: resourceType
      }
    )
  }

  // 否则使用基本认证中间件
  return withAuth(
    async (request: NextRequest, user: User) => {
      // 检查角色权限
      if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: '角色权限不足' },
          { status: 403 }
        )
      }

      // 执行自定义权限检查
      if (customPermissionCheck) {
        const hasCustomPermission = await customPermissionCheck(user, request)
        if (!hasCustomPermission) {
          return NextResponse.json(
            { error: '自定义权限检查失败' },
            { status: 403 }
          )
        }
      }

      return handler(request, user)
    },
    requiredRole
  )
}

/**
 * 财务记录API保护
 */
export function protectTransactionApi(
  handler: (request: NextRequest, user: User, secureDataAccess: any) => Promise<NextResponse>,
  action: 'create' | 'read' | 'update' | 'delete' = 'read'
) {
  return protectApiRoute(
    (request: NextRequest, user?: User, secureDataAccess?: any) => handler(request, user!, secureDataAccess),
    {
      requireAuth: true,
      resourceType: 'transaction',
      action,
      enableDataIsolation: true
    }
  )
}

/**
 * 用户管理API保护
 */
export function protectUserApi(
  handler: (request: NextRequest, user: User, secureDataAccess?: any) => Promise<NextResponse>,
  action: 'create' | 'read' | 'update' | 'delete' = 'read'
) {
  return protectApiRoute(
    (request: NextRequest, user?: User, secureDataAccess?: any) => handler(request, user!, secureDataAccess),
    {
      requireAuth: true,
      resourceType: 'user',
      action,
      enableDataIsolation: action !== 'create' // 创建用户时不需要数据隔离
    }
  )
}

/**
 * 管理员API保护
 */
export function protectAdminApi(
  handler: (request: NextRequest, user: User) => Promise<NextResponse>
) {
  return protectApiRoute(
    (request: NextRequest, user?: User) => handler(request, user!),
    {
      requireAuth: true,
      requiredRole: 'ADMIN',
      resourceType: 'system',
      action: 'admin',
      enableDataIsolation: false // 管理员API不需要数据隔离
    }
  )
}

/**
 * 会话管理API保护
 */
export function protectSessionApi(
  handler: (request: NextRequest, user: User, secureDataAccess?: any) => Promise<NextResponse>,
  action: 'create' | 'read' | 'update' | 'delete' = 'read'
) {
  return protectApiRoute(
    (request: NextRequest, user?: User, secureDataAccess?: any) => handler(request, user!, secureDataAccess),
    {
      requireAuth: true,
      resourceType: 'session',
      action,
      enableDataIsolation: true
    }
  )
}

/**
 * 批量操作保护
 * 用于需要处理多个资源的API
 */
export function protectBatchApi(
  handler: (request: NextRequest, user: User, secureDataAccess: any) => Promise<NextResponse>,
  resourceType: 'transaction' | 'user' | 'session' = 'transaction'
) {
  return protectApiRoute(
    (request: NextRequest, user?: User, secureDataAccess?: any) => handler(request, user!, secureDataAccess),
    {
      requireAuth: true,
      resourceType,
      action: 'read', // 批量操作通常需要读取权限
      enableDataIsolation: true,
      customPermissionCheck: async (user: User, request: NextRequest) => {
        // 对于批量操作，可以添加额外的检查
        // 例如：检查请求的资源数量是否在合理范围内
        try {
          if (request.method === 'POST' || request.method === 'PUT') {
            const body = await request.json()
            if (Array.isArray(body) && body.length > 100) {
              return false // 限制批量操作的数量
            }
          }
          return true
        } catch {
          return true // 如果无法解析请求体，允许继续
        }
      }
    }
  )
}

/**
 * 导出API保护
 * 用于数据导出功能
 */
export function protectExportApi(
  handler: (request: NextRequest, user: User, secureDataAccess: any) => Promise<NextResponse>
) {
  return protectApiRoute(
    (request: NextRequest, user?: User, secureDataAccess?: any) => handler(request, user!, secureDataAccess),
    {
      requireAuth: true,
      resourceType: 'transaction',
      action: 'read',
      enableDataIsolation: true,
      customPermissionCheck: async (user: User, request: NextRequest) => {
        // 可以添加导出频率限制等检查
        // 例如：检查用户是否在短时间内多次导出
        return true // 暂时允许所有导出请求
      }
    }
  )
}

/**
 * 统计API保护
 * 用于统计和报表功能
 */
export function protectStatsApi(
  handler: (request: NextRequest, user: User, secureDataAccess: any) => Promise<NextResponse>
) {
  return protectApiRoute(
    (request: NextRequest, user?: User, secureDataAccess?: any) => handler(request, user!, secureDataAccess),
    {
      requireAuth: true,
      resourceType: 'transaction',
      action: 'read',
      enableDataIsolation: true
    }
  )
}