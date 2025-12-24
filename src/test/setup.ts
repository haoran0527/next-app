// 测试环境设置
import { beforeAll, afterAll, beforeEach } from 'vitest'

// 设置测试环境变量
beforeAll(() => {
  process.env.NODE_ENV = 'test'
})

// 清理
afterAll(() => {
  // 清理资源
})

beforeEach(() => {
  // 每个测试前的设置
})