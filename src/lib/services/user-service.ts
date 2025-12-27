import bcrypt from 'bcryptjs'
import { prisma } from '../prisma'
import { CreateUserData, User, AuthResult } from '../types/auth'
import { validateRegistrationData } from '../validation/auth-validation'

/**
 * 检查邮箱是否已存在
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })
  return !!existingUser
}

/**
 * 检查用户名是否已存在
 */
export async function checkUsernameExists(username: string): Promise<boolean> {
  const existingUser = await prisma.user.findUnique({
    where: { username }
  })
  return !!existingUser
}

/**
 * 加密密码
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * 创建新用户
 */
export async function createUser(userData: CreateUserData): Promise<AuthResult> {
  try {
    // 验证输入数据
    const validation = validateRegistrationData(userData)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }

    // 检查邮箱唯一性
    const emailExists = await checkEmailExists(userData.email)
    if (emailExists) {
      return {
        success: false,
        error: '该邮箱已被注册'
      }
    }

    // 检查用户名唯一性
    const usernameExists = await checkUsernameExists(userData.username)
    if (usernameExists) {
      return {
        success: false,
        error: '该用户名已被使用'
      }
    }

    // 加密密码
    const hashedPassword = await hashPassword(userData.password)

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        username: userData.username,
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        nickname: userData.nickname
      }
    })

    // 转换为返回类型（不包含密码）
    const user: User = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      nickname: newUser.nickname,
      role: newUser.role as 'USER' | 'ADMIN',
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    }

    return {
      success: true,
      user
    }
  } catch (error) {
    console.error('创建用户失败:', error)
    return {
      success: false,
      error: '注册失败，请稍后重试'
    }
  }
}

/**
 * 根据用户名获取用户
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      role: user.role as 'USER' | 'ADMIN',
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    console.error('获取用户失败:', error)
    return null
  }
}

/**
 * 根据用户名或邮箱获取用户
 */
export async function getUserByUsernameOrEmail(identifier: string): Promise<User | null> {
  try {
    // 判断是否为邮箱格式
    const isEmail = identifier.includes('@')
    
    const user = await prisma.user.findUnique({
      where: isEmail 
        ? { email: identifier.toLowerCase() }
        : { username: identifier }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname || null,
      role: user.role as 'USER' | 'ADMIN',
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    console.error('获取用户失败:', error)
    return null
  }
}

/**
 * 根据ID获取用户
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname || null,
      role: user.role as 'USER' | 'ADMIN',
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    console.error('获取用户失败:', error)
    return null
  }
}

/**
 * 生成临时密码
 */
export function generateTemporaryPassword(): string {
  // 生成8位随机密码，包含大小写字母和数字
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  
  // 确保至少包含一个大写字母、一个小写字母和一个数字
  password += chars.charAt(Math.floor(Math.random() * 26)) // 大写字母
  password += chars.charAt(Math.floor(Math.random() * 26) + 26) // 小写字母
  password += chars.charAt(Math.floor(Math.random() * 10) + 52) // 数字
  
  // 填充剩余位数
  for (let i = 3; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * 验证用户登录凭据（支持用户名或邮箱）
 */
export async function validateUserCredentials(identifier: string, password: string): Promise<AuthResult> {
  try {
    // 判断是否为邮箱格式
    const isEmail = identifier.includes('@')
    
    // 获取用户（包含密码）
    const user = await prisma.user.findUnique({
      where: isEmail 
        ? { email: identifier.toLowerCase() }
        : { username: identifier }
    })

    if (!user) {
      return {
        success: false,
        error: '用户名/邮箱或密码错误'
      }
    }

    // 检查用户是否被禁用
    if (!user.isActive) {
      return {
        success: false,
        error: '账户已被禁用'
      }
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return {
        success: false,
        error: '用户名/邮箱或密码错误'
      }
    }

    // 返回用户信息（不包含密码）
    const userInfo: User = {
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname || null,
      role: user.role as 'USER' | 'ADMIN',
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return {
      success: true,
      user: userInfo
    }
  } catch (error) {
    console.error('验证用户凭据失败:', error)
    return {
      success: false,
      error: '登录失败，请稍后重试'
    }
  }
}