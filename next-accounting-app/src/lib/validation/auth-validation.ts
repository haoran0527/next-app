import { ValidationResult } from '../types/auth'

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  
  if (!email) {
    errors.push('邮箱不能为空')
  } else {
    // 基本邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.push('邮箱格式不正确')
    }
    
    // 邮箱长度验证
    if (email.length > 254) {
      errors.push('邮箱长度不能超过254个字符')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证用户名
 */
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = []
  
  if (!username) {
    errors.push('用户名不能为空')
  } else {
    // 用户名长度验证
    if (username.length < 3) {
      errors.push('用户名长度不能少于3个字符')
    }
    if (username.length > 50) {
      errors.push('用户名长度不能超过50个字符')
    }
    
    // 用户名格式验证（只允许字母、数字、下划线、中文）
    const usernameRegex = /^[\w\u4e00-\u9fa5]+$/
    if (!usernameRegex.test(username)) {
      errors.push('用户名只能包含字母、数字、下划线和中文字符')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证密码强度
 * 要求：至少8个字符，包含大小写字母、数字和特殊字符
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = []
  
  if (!password) {
    errors.push('密码不能为空')
  } else {
    // 密码长度验证
    if (password.length < 8) {
      errors.push('密码长度不能少于8个字符')
    }
    if (password.length > 128) {
      errors.push('密码长度不能超过128个字符')
    }
    
    // 密码复杂度验证
    const hasLowerCase = /[a-z]/.test(password)
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    if (!hasLowerCase) {
      errors.push('密码必须包含小写字母')
    }
    if (!hasUpperCase) {
      errors.push('密码必须包含大写字母')
    }
    if (!hasNumbers) {
      errors.push('密码必须包含数字')
    }
    if (!hasSpecialChar) {
      errors.push('密码必须包含特殊字符')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证用户注册数据
 */
export function validateRegistrationData(data: {
  email: string
  username: string
  password: string
}): ValidationResult {
  const allErrors: string[] = []
  
  // 验证邮箱
  const emailValidation = validateEmail(data.email)
  allErrors.push(...emailValidation.errors)
  
  // 验证用户名
  const usernameValidation = validateUsername(data.username)
  allErrors.push(...usernameValidation.errors)
  
  // 验证密码
  const passwordValidation = validatePassword(data.password)
  allErrors.push(...passwordValidation.errors)
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}