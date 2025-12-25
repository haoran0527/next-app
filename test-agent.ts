import { config } from 'dotenv'

config()

process.env.OPENAI_API_KEY = 'sk-ffbecec954ed41538147c4180e90fd8b'
process.env.OPENAI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

import { parseNaturalLanguageToTransaction } from './src/lib/services/agent-service'

async function testAgent() {
  console.log('=== 测试智能体功能 ===\n')

  const testCases = [
    '今天花了50元买午饭',
    '收到工资8000元',
    '12月20日打车花了35元',
    '买了一件衣服花了200元',
    '收到奖金5000元'
  ]

  for (const testCase of testCases) {
    console.log(`测试输入: ${testCase}`)
    const result = await parseNaturalLanguageToTransaction(testCase)
    
    if (result.success) {
      console.log('✅ 解析成功:')
      console.log(`  金额: ¥${result.transaction?.amount}`)
      console.log(`  类型: ${result.transaction?.type === 'INCOME' ? '收入' : '支出'}`)
      console.log(`  分类: ${result.transaction?.category}`)
      console.log(`  描述: ${result.transaction?.description || '无'}`)
      console.log(`  日期: ${result.transaction?.date?.toLocaleDateString('zh-CN') || new Date().toLocaleDateString('zh-CN')}`)
    } else {
      console.log('❌ 解析失败:')
      console.log(`  错误: ${result.error}`)
      if (result.rawResponse) {
        console.log(`  原始响应: ${result.rawResponse}`)
      }
    }
    console.log()
  }
}

testAgent().catch(console.error)
