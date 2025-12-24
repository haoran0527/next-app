import { CreateUserData, LoginCredentials, AuthResult, User } from '../types/auth'
import { createUser, validateUserCredentials } from './user-service'
import { createSession, validateSession, destroySession, extendSession } from './session-service'

/**
 * 用户注册
 */
export async function signUp(userData: CreateUserData): Promise<AuthResult> {
  return createUser(userData)
}

/**
 * 用户登录（支持用户名或邮箱）
 */
export async function signIn(credentials: LoginCredentials, rememberMe: boolean = false): Promise<AuthResult> {
  try {
    // 验证用户凭据（支持用户名或邮箱）
    const userValidation = await validateUserCredentials(credentials.email, credentials.password)
    
    if (!userValidation.success || !userValidation.user) {
      return userValidation
    }

    // 创建会话
    const session = await createSession(userValidation.user.id, rememberMe)
    
    if (!session) {
      return {
        success: false,
        error: '创建会话失败'
      }
    }

    return {
      success: true,
      user: userValidation.user,
      session
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      error: '登录失败，请稍后重试'
    }
  }
}

/**
 * 用户登出
 */
export async function signOut(token: string): Promise<boolean> {
  return destroySession(token)
}

/**
 * 获取当前用户（通过会话令牌）
 */
export async function getCurrentUser(token: string): Promise<{ user: User; session: any } | null> {
  return validateSession(token)
}

/**
 * 刷新会话
 */
export async function refreshSession(token: string, rememberMe: boolean = false): Promise<AuthResult> {
  try {
    // 验证当前会话
    const sessionData = await validateSession(token)
    
    if (!sessionData) {
      return {
        success: false,
        error: '会话无效或已过期'
      }
    }

    // 延长会话
    const extendedSession = await extendSession(token, rememberMe)
    
    if (!extendedSession) {
      return {
        success: false,
        error: '延长会话失败'
      }
    }

    return {
      success: true,
      user: sessionData.user,
      session: extendedSession
    }
  } catch (error) {
    console.error('刷新会话失败:', error)
    return {
      success: false,
      error: '刷新会话失败'
    }
  }
}

/**
 * 检查用户是否有权限访问资源
 */
export async function checkUserPermission(token: string, requiredRole?: 'USER' | 'ADMIN'): Promise<{ authorized: boolean; user?: User }> {
  try {
    const sessionData = await validateSession(token)
    
    if (!sessionData) {
      return { authorized: false }
    }

    // 如果需要特定角色，检查用户角色
    if (requiredRole && sessionData.user.role !== requiredRole && sessionData.user.role !== 'ADMIN') {
      return { authorized: false, user: sessionData.user }
    }

    return { authorized: true, user: sessionData.user }
  } catch (error) {
    console.error('检查用户权限失败:', error)
    return { authorized: false }
  }
}