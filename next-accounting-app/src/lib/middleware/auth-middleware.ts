import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../services/session-service'
import { User } from '../types/auth'
import { 
  validateUserAccess, 
  checkPermission, 
  validateResourceOwnership,
  createSecureDataAccess 
} from '../services/data-access-control'

/**
 * 从请求中提取会话令牌
 */
function extractTokenFromRequest(request: NextRequest): string | null {
  // 首先尝试从Authorization头获取
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 然后尝试从Cookie获取
  const cookieToken = request.cookies.get('session-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

/**
 * 认证中间件
 */
export async function authMiddleware(
  request: NextRequest,
  requiredRole?: 'USER' | 'ADMIN'
): Promise<{ success: boolean; user?: User; response?: NextResponse }> {
  try {
    // 提取令牌
    const token = extractTokenFromRequest(request)
    
    if (!token) {
      return {
        success: false,
        response: NextResponse.json(
          { error: '未提供认证令牌' },
          { status: 401 }
        )
      }
    }

    // 验证会话
    const sessionData = await validateSession(token)
    
    if (!sessionData) {
      return {
        success: false,
        response: NextResponse.json(
          { error: '会话无效或已过期' },
          { status: 401 }
        )
      }
    }

    // 检查角色权限
    if (requiredRole && sessionData.user.role !== requiredRole && sessionData.user.role !== 'ADMIN') {
      return {
        success: false,
        response: NextResponse.json(
          { error: '权限不足' },
          { status: 403 }
        )
      }
    }

    return {
      success: true,
      user: sessionData.user
    }
  } catch (error) {
    console.error('认证中间件错误:', error)
    return {
      success: false,
      response: NextResponse.json(
        { error: '认证失败' },
        { status: 500 }
      )
    }
  }
}

/**
 * 创建受保护的API处理器
 */
export function withAuth(
  handler: (request: NextRequest, user: User) => Promise<NextResponse>,
  requiredRole?: 'USER' | 'ADMIN'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authMiddleware(request, requiredRole)
    
    if (!authResult.success) {
      return authResult.response!
    }

    return handler(request, authResult.user!)
  }
}

/**
 * 数据隔离中间件 - 确保用户只能访问自己的数据
 */
export function withDataIsolation(
  handler: (request: NextRequest, user: User, secureDataAccess: any) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, user: User) => {
    // 创建安全数据访问实例
    const secureDataAccess = createSecureDataAccess(user)
    
    return handler(request, user, secureDataAccess)
  })
}

/**
 * 资源访问控制中间件
 * 验证用户是否有权访问特定资源
 */
export function withResourceAccess(
  handler: (request: NextRequest, user: User) => Promise<NextResponse>,
  resourceType: 'transaction' | 'user' | 'session' = 'transaction'
) {
  return withAuth(async (request: NextRequest, user: User) => {
    try {
      // 从URL中提取资源ID
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/')
      const resourceId = pathSegments[pathSegments.length - 1]

      // 如果是创建操作（POST到集合端点），直接允许
      if (request.method === 'POST' && !resourceId) {
        return handler(request, user)
      }

      // 验证资源所有权
      if (resourceId && resourceId !== 'undefined') {
        const hasAccess = await validateResourceOwnership(user, resourceId, resourceType)
        if (!hasAccess) {
          return NextResponse.json(
            { error: '无权访问该资源' },
            { status: 403 }
          )
        }
      }

      return handler(request, user)
    } catch (error) {
      console.error('资源访问控制错误:', error)
      return NextResponse.json(
        { error: '访问控制验证失败' },
        { status: 500 }
      )
    }
  })
}

/**
 * 权限检查中间件
 */
export function withPermission(
  handler: (request: NextRequest, user: User) => Promise<NextResponse>,
  action: 'create' | 'read' | 'update' | 'delete' | 'admin',
  resource: 'transaction' | 'user' | 'session' | 'system' = 'transaction'
) {
  return withAuth(async (request: NextRequest, user: User) => {
    // 检查权限
    const hasPermission = checkPermission(user, action, resource)
    if (!hasPermission) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }

    return handler(request, user)
  })
}

/**
 * 组合中间件：认证 + 数据隔离 + 资源访问控制
 */
export function withSecureAccess(
  handler: (request: NextRequest, user: User, secureDataAccess: any) => Promise<NextResponse>,
  options: {
    resourceType?: 'transaction' | 'user' | 'session'
    action?: 'create' | 'read' | 'update' | 'delete' | 'admin'
    resource?: 'transaction' | 'user' | 'session' | 'system'
  } = {}
) {
  const { resourceType = 'transaction', action = 'read', resource = 'transaction' } = options

  return withAuth(async (request: NextRequest, user: User) => {
    try {
      // 1. 检查基本权限
      const hasPermission = checkPermission(user, action, resource)
      if (!hasPermission) {
        return NextResponse.json(
          { error: '权限不足' },
          { status: 403 }
        )
      }

      // 2. 对于非创建操作，验证资源访问权限
      if (action !== 'create') {
        const url = new URL(request.url)
        const pathSegments = url.pathname.split('/')
        const resourceId = pathSegments[pathSegments.length - 1]

        // 只有当resourceId是有效的UUID或数字ID时才进行资源所有权验证
        // 对于集合端点和特殊端点，跳过资源所有权验证
        const isValidResourceId = resourceId && 
          resourceId !== 'undefined' && 
          resourceId !== 'transactions' && 
          resourceId !== 'users' && 
          resourceId !== 'sessions' &&
          resourceId !== 'stats' &&      // 统计端点
          resourceId !== 'export' &&     // 导出端点
          resourceId !== 'batch' &&      // 批量操作端点
          resourceId !== 'audit-logs' && // 审计日志端点
          !resourceId.includes('?') // 排除查询参数

        if (isValidResourceId) {
          const hasAccess = await validateResourceOwnership(user, resourceId, resourceType)
          if (!hasAccess) {
            return NextResponse.json(
              { error: '无权访问该资源' },
              { status: 403 }
            )
          }
        }
      }

      // 3. 创建安全数据访问实例
      const secureDataAccess = createSecureDataAccess(user)

      return handler(request, user, secureDataAccess)
    } catch (error) {
      console.error('安全访问控制错误:', error)
      return NextResponse.json(
        { error: '访问控制验证失败' },
        { status: 500 }
      )
    }
  })
}