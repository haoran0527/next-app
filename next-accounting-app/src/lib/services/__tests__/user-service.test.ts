import { describe, it, expect, beforeEach } from 'vitest'
import { hashPassword, verifyPassword } from '../user-service'

describe('用户服务', () => {
  describe('密码加密和验证', () => {
    it('应该正确加密和验证密码', async () => {
      const password = 'TestPassword123!'
      
      // 加密密码
      const hashedPassword = await hashPassword(password)
      
      // 验证加密后的密码不等于原密码
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(0)
      
      // 验证密码
      const isValid = await verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)
      
      // 验证错误密码
      const isInvalid = await verifyPassword('WrongPassword', hashedPassword)
      expect(isInvalid).toBe(false)
    })

    it('相同密码应该产生不同的哈希值', async () => {
      const password = 'TestPassword123!'
      
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      // 由于使用了盐值，相同密码应该产生不同的哈希
      expect(hash1).not.toBe(hash2)
      
      // 但都应该能验证原密码
      expect(await verifyPassword(password, hash1)).toBe(true)
      expect(await verifyPassword(password, hash2)).toBe(true)
    })
  })
})