import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../services/session-service'
import { User } from '../types/auth'
import {
  validateUserAccess,
  checkPermission,
  validateResourceOwnership,
  createSecureDataAccess,
} from '../services/data-access-control'

/**
 * 从请求中提取会话令牌
 */
function extractTokenFromRequest(request: NextRequest): string | null {
  console.log('=== extractTokenFromRequest 开始 ===')
  console.log('URL:', request.url)

  // 首先尝试从Authorization头获取
  const authHeader = request.headers.get('authorization')
  console.log(
    'Authorization header:',
    authHeader ? authHeader.substring(0, 30) + '...' : 'null'
  )

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    console.log(
      '从 Authorization header 提取 token:',
      token.substring(0, 20) + '...'
    )
    return token
  }

  // 然后尝试从Cookie获取
  // 当有多个同名cookie时，get()可能返回不可预期的结果
  // 所以我们从cookie header中手动解析
  const cookieHeader = request.headers.get('cookie')
  console.log(
    'Cookie header:',
    cookieHeader ? cookieHeader.substring(0, 80) + '...' : 'null'
  )

  if (cookieHeader) {
    // 查找所有 session-token
    const matches = cookieHeader.match(/session-token=([^;]+)/g)
    if (matches && matches.length > 0) {
      // 取最后一个（最新的）token
      const lastMatch = matches[matches.length - 1]
      const token = lastMatch.split('=')[1]
      console.log('✅ 从 Cookie 提取 token:', token.substring(0, 20) + '...')
      console.log('Token length:', token.length)
      return token
    }
  }

  // 回退到 cookies.get()
  const cookieToken = request.cookies.get('session-token')?.value
  if (cookieToken) {
    console.log(
      '从 cookies.get() 提取 token:',
      cookieToken.substring(0, 20) + '...'
    )
    return cookieToken
  }

  console.log('❌ 未找到任何 token')
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
    console.log('=== 认证中间件开始 ===')
    console.log('请求 URL:', request.url)
    console.log('请求方法:', request.method)

    // 提取令牌
    const token = extractTokenFromRequest(request)

    if (!token) {
      console.log('认证失败：未提供认证令牌')
      return {
        success: false,
        response: NextResponse.json(
          { error: '未提供认证令牌' },
          { status: 401 }
        ),
      }
    }

    console.log('开始验证会话...')
    // 验证会话
    const sessionData = await validateSession(token)

    if (!sessionData) {
      console.log('认证失败：会话无效或已过期')
      return {
        success: false,
        response: NextResponse.json(
          { error: '会话无效或已过期' },
          { status: 401 }
        ),
      }
    }

    console.log('会话验证成功，用户:', sessionData.user.username)

    // 检查角色权限
    if (
      requiredRole &&
      sessionData.user.role !== requiredRole &&
      sessionData.user.role !== 'ADMIN'
    ) {
      console.log(
        '认证失败：权限不足，需要角色:',
        requiredRole,
        '当前角色:',
        sessionData.user.role
      )
      return {
        success: false,
        response: NextResponse.json({ error: '权限不足' }, { status: 403 }),
      }
    }

    console.log('认证成功')
    return {
      success: true,
      user: sessionData.user,
    }
  } catch (error) {
    console.error('认证中间件错误:', error)
    return {
      success: false,
      response: NextResponse.json({ error: '认证失败' }, { status: 500 }),
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
  handler: (
    request: NextRequest,
    user: User,
    secureDataAccess: any
  ) => Promise<NextResponse>
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
        const hasAccess = await validateResourceOwnership(
          user,
          resourceId,
          resourceType
        )
        if (!hasAccess) {
          return NextResponse.json({ error: '无权访问该资源' }, { status: 403 })
        }
      }

      return handler(request, user)
    } catch (error) {
      console.error('资源访问控制错误:', error)
      return NextResponse.json({ error: '访问控制验证失败' }, { status: 500 })
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
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    return handler(request, user)
  })
}

/**
 * 组合中间件：认证 + 数据隔离 + 资源访问控制
 */
export function withSecureAccess(
  handler: (
    request: NextRequest,
    user: User,
    secureDataAccess: any
  ) => Promise<NextResponse>,
  options: {
    resourceType?: 'transaction' | 'user' | 'session'
    action?: 'create' | 'read' | 'update' | 'delete' | 'admin'
    resource?: 'transaction' | 'user' | 'session' | 'system'
  } = {}
) {
  const {
    resourceType = 'transaction',
    action = 'read',
    resource = 'transaction',
  } = options

  return withAuth(async (request: NextRequest, user: User) => {
    try {
      // 1. 检查基本权限
      const hasPermission = checkPermission(user, action, resource)
      if (!hasPermission) {
        return NextResponse.json({ error: '权限不足' }, { status: 403 })
      }

      // 2. 对于非创建操作，验证资源访问权限
      if (action !== 'create') {
        const url = new URL(request.url)
        const pathSegments = url.pathname.split('/')
        const resourceId = pathSegments[pathSegments.length - 1]

        // 只有当resourceId是有效的UUID或数字ID时才进行资源所有权验证
        // 对于集合端点和特殊端点，跳过资源所有权验证
        const isValidResourceId =
          resourceId &&
          resourceId !== 'undefined' &&
          resourceId !== 'transactions' &&
          resourceId !== 'users' &&
          resourceId !== 'sessions' &&
          resourceId !== 'stats' && // 统计端点
          resourceId !== 'export' && // 导出端点
          resourceId !== 'batch' && // 批量操作端点
          resourceId !== 'audit-logs' && // 审计日志端点
          !resourceId.includes('?') // 排除查询参数

        if (isValidResourceId) {
          const hasAccess = await validateResourceOwnership(
            user,
            resourceId,
            resourceType
          )
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
      return NextResponse.json({ error: '访问控制验证失败' }, { status: 500 })
    }
  })
}
