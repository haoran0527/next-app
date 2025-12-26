// 认证相关的类型定义

export interface User {
  id: string
  email: string
  username: string
  nickname?: string
  role: 'USER' | 'ADMIN'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface CreateUserData {
  email: string
  username: string
  password: string
  nickname?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResult {
  success: boolean
  user?: User
  session?: Session
  error?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}