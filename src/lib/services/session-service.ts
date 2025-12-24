import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { prisma } from '../prisma'
import { Session, User } from '../types/auth'

/**
 * 生成安全的会话令牌
 */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * 计算会话过期时间
 * @param rememberMe 是否记住我（7天 vs 1天）
 */
function calculateExpirationTime(rememberMe: boolean = false): Date {
  const now = new Date()
  const expirationHours = rememberMe ? 24 * 7 : 24 // 7天或1天
  return new Date(now.getTime() + expirationHours * 60 * 60 * 1000)
}

/**
 * 创建用户会话
 */
export async function createSession(userId: string, rememberMe: boolean = false): Promise<Session | null> {
  try {
    // 生成会话令牌
    const token = generateSessionToken()
    const expiresAt = calculateExpirationTime(rememberMe)

    // 创建会话记录
    const session = await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt
      }
    })

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt
    }
  } catch (error) {
    console.error('创建会话失败:', error)
    return null
  }
}

/**
 * 验证会话令牌
 */
export async function validateSession(token: string): Promise<{ user: User; session: Session } | null> {
  try {
    // 查找会话并包含用户信息
    const sessionWithUser = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!sessionWithUser) {
      return null
    }

    // 检查会话是否过期
    if (sessionWithUser.expiresAt < new Date()) {
      // 删除过期会话
      await prisma.session.delete({
        where: { id: sessionWithUser.id }
      })
      return null
    }

    // 检查用户是否被禁用
    if (!sessionWithUser.user.isActive) {
      return null
    }

    const user: User = {
      id: sessionWithUser.user.id,
      email: sessionWithUser.user.email,
      username: sessionWithUser.user.username,
      role: sessionWithUser.user.role as 'USER' | 'ADMIN',
      isActive: sessionWithUser.user.isActive,
      createdAt: sessionWithUser.user.createdAt,
      updatedAt: sessionWithUser.user.updatedAt
    }

    const session: Session = {
      id: sessionWithUser.id,
      userId: sessionWithUser.userId,
      token: sessionWithUser.token,
      expiresAt: sessionWithUser.expiresAt,
      createdAt: sessionWithUser.createdAt
    }

    return { user, session }
  } catch (error) {
    console.error('验证会话失败:', error)
    return null
  }
}

/**
 * 延长会话有效期
 */
export async function extendSession(token: string, rememberMe: boolean = false): Promise<Session | null> {
  try {
    const newExpiresAt = calculateExpirationTime(rememberMe)

    const updatedSession = await prisma.session.update({
      where: { token },
      data: { expiresAt: newExpiresAt }
    })

    return {
      id: updatedSession.id,
      userId: updatedSession.userId,
      token: updatedSession.token,
      expiresAt: updatedSession.expiresAt,
      createdAt: updatedSession.createdAt
    }
  } catch (error) {
    console.error('延长会话失败:', error)
    return null
  }
}

/**
 * 销毁会话
 */
export async function destroySession(token: string): Promise<boolean> {
  try {
    await prisma.session.delete({
      where: { token }
    })
    return true
  } catch (error) {
    console.error('销毁会话失败:', error)
    return false
  }
}

/**
 * 销毁用户的所有会话
 */
export async function destroyAllUserSessions(userId: string): Promise<boolean> {
  try {
    await prisma.session.deleteMany({
      where: { userId }
    })
    return true
  } catch (error) {
    console.error('销毁用户所有会话失败:', error)
    return false
  }
}

/**
 * 清理过期会话（定期清理任务）
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    return result.count
  } catch (error) {
    console.error('清理过期会话失败:', error)
    return 0
  }
}

/**
 * 获取用户的活跃会话数量
 */
export async function getUserActiveSessionCount(userId: string): Promise<number> {
  try {
    const count = await prisma.session.count({
      where: {
        userId,
        expiresAt: {
          gt: new Date()
        }
      }
    })
    return count
  } catch (error) {
    console.error('获取用户活跃会话数量失败:', error)
    return 0
  }
}

/**
 * 从请求中获取当前用户
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session-token')?.value

    if (!sessionToken) {
      return null
    }

    const result = await validateSession(sessionToken)
    return result?.user || null
  } catch (error) {
    console.error('获取当前用户失败:', error)
    return null
  }
}