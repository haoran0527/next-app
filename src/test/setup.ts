// 测试环境设置
import { beforeAll, afterAll, beforeEach } from 'vitest'

// 设置测试环境变量
beforeAll(() => {
  // @ts-expect-error - NODE_ENV is read-only in TypeScript but can be set in tests
  process.env.NODE_ENV = 'test'
})

// 清理
afterAll(() => {
  // 清理资源
})

beforeEach(() => {
  // 每个测试前的设置
})