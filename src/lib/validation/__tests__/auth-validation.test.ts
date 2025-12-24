import { describe, it, expect } from 'vitest'
import { 
  validateEmail, 
  validateUsername, 
  validatePassword, 
  validateRegistrationData 
} from '../auth-validation'

describe('邮箱验证', () => {
  it('应该接受有效的邮箱格式', () => {
    const result = validateEmail('test@example.com')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('应该拒绝无效的邮箱格式', () => {
    const result = validateEmail('invalid-email')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('邮箱格式不正确')
  })

  it('应该拒绝空邮箱', () => {
    const result = validateEmail('')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('邮箱不能为空')
  })

  it('应该拒绝过长的邮箱', () => {
    const longEmail = 'a'.repeat(250) + '@example.com'
    const result = validateEmail(longEmail)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('邮箱长度不能超过254个字符')
  })
})

describe('用户名验证', () => {
  it('应该接受有效的用户名', () => {
    const result = validateUsername('validuser123')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('应该接受包含中文的用户名', () => {
    const result = validateUsername('用户名123')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('应该拒绝过短的用户名', () => {
    const result = validateUsername('ab')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('用户名长度不能少于3个字符')
  })

  it('应该拒绝过长的用户名', () => {
    const longUsername = 'a'.repeat(51)
    const result = validateUsername(longUsername)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('用户名长度不能超过50个字符')
  })

  it('应该拒绝包含特殊字符的用户名', () => {
    const result = validateUsername('user@name')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('用户名只能包含字母、数字、下划线和中文字符')
  })
})

describe('密码验证', () => {
  it('应该接受符合要求的密码', () => {
    const result = validatePassword('Password123!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('应该拒绝过短的密码', () => {
    const result = validatePassword('Pass1!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('密码长度不能少于8个字符')
  })

  it('应该拒绝缺少大写字母的密码', () => {
    const result = validatePassword('password123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('密码必须包含大写字母')
  })

  it('应该拒绝缺少小写字母的密码', () => {
    const result = validatePassword('PASSWORD123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('密码必须包含小写字母')
  })

  it('应该拒绝缺少数字的密码', () => {
    const result = validatePassword('Password!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('密码必须包含数字')
  })

  it('应该拒绝缺少特殊字符的密码', () => {
    const result = validatePassword('Password123')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('密码必须包含特殊字符')
  })
})

describe('注册数据验证', () => {
  it('应该接受有效的注册数据', () => {
    const result = validateRegistrationData({
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password123!'
    })
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('应该收集所有字段的验证错误', () => {
    const result = validateRegistrationData({
      email: 'invalid-email',
      username: 'ab',
      password: 'weak'
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(error => error.includes('邮箱'))).toBe(true)
    expect(result.errors.some(error => error.includes('用户名'))).toBe(true)
    expect(result.errors.some(error => error.includes('密码'))).toBe(true)
  })
})