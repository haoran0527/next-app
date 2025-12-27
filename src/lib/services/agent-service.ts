/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateTransactionData, TransactionType } from '../types/transaction'
import { getActiveAIModel, registerModelActivatedCallback } from './ai-model-service'

// 缓存激活的模型配置，避免频繁查询数据库
let cachedModelConfig: {
  apiKey: string
  baseUrl: string
  model: string
} | null = null
let cacheExpireTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * 清除AI模型配置缓存
 * 当切换激活模型时调用此函数
 */
function clearAIModelCache() {
  cachedModelConfig = null
  cacheExpireTime = 0
}

// 注册缓存清除回调
registerModelActivatedCallback(clearAIModelCache)

/**
 * 构建完整的API URL
 * 智能处理baseUrl，避免路径重复
 */
function buildApiUrl(baseUrl: string): string {
  // 如果baseUrl已经包含 /chat/completions，直接返回
  if (baseUrl.includes('/chat/completions')) {
    return baseUrl
  }

  // 确保 baseUrl 不以斜杠结尾，然后拼接路径
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${cleanBaseUrl}/chat/completions`
}

async function getOpenAIConfig() {
  // 检查缓存是否有效
  const now = Date.now()
  if (cachedModelConfig && now < cacheExpireTime) {
    return {
      apiKey: cachedModelConfig.apiKey,
      baseUrl: cachedModelConfig.baseUrl,
      model: cachedModelConfig.model
    }
  }

  // 从数据库获取激活的模型配置
  const result = await getActiveAIModel()

  if (result.success && result.data) {
    const config = {
      apiKey: result.data.apiKey,
      baseUrl: result.data.baseUrl,
      model: result.data.model
    }

    // 更新缓存
    cachedModelConfig = config
    cacheExpireTime = now + CACHE_DURATION

    return config
  }

  // 降级到环境变量
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.deepseek.com'
  const model = process.env.OPENAI_MODEL || 'deepseek-chat'

  return { apiKey, baseUrl, model }
}

export interface ParsedTransaction {
  amount: number
  type: TransactionType
  category: string
  description?: string
  date?: Date
}

export interface AgentResponse {
  success: boolean
  transaction?: ParsedTransaction
  error?: string
  rawResponse?: string
}

const INCOME_CATEGORIES = [
  '工资收入',
  '奖金',
  '投资收益',
  '兼职收入',
  '礼金',
  '其他收入'
]

const EXPENSE_CATEGORIES = [
  '餐饮',
  '交通',
  '购物',
  '娱乐',
  '医疗',
  '教育',
  '房租',
  '水电费',
  '通讯费',
  '保险',
  '其他支出'
]

/**
 * 生成富有诗意的昵称
 * 使用大模型生成4-7个字的中文昵称
 */
export async function generateNickname(): Promise<string> {
  try {
    const { apiKey, baseUrl, model } = await getOpenAIConfig()

    if (!apiKey) {
      // 如果没有配置 API key，返回随机默认昵称
      const defaultNicknames = [
        '清风明月', '星空漫步', '岁月静好', '陌上花开',
        '云淡风轻', '晨曦微露', '碧水青山', '诗和远方',
        '拾光者', '追梦人', '心若向阳', '静待花开'
      ]
      return defaultNicknames[Math.floor(Math.random() * defaultNicknames.length)]
    }

    const apiUrl = buildApiUrl(baseUrl)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `你是一个富有诗意的起名助手。请生成一个4-7个字的中文昵称。

要求：
1. 必须是4-7个字
2. 风格优雅、富有诗意
3. 可以借鉴古诗词、自然景象、美好寓意
4. 不要使用特殊符号或数字
5. 不要包含标点符号

示例：
- 清风明月
- 星空漫步
- 岁月静好
- 陌上花开
- 云淡风轻
- 晨曦微露
- 碧水青山

请只返回昵称本身，不要包含任何其他内容。`
          },
          {
            role: 'user',
            content: '请生成一个富有诗意的昵称：'
          }
        ],
        temperature: 0.8,
        max_tokens: 50,
        thinking: {
          type: 'disabled'
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('生成昵称API调用失败:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: apiUrl,
        model
      })
      // 降级到默认昵称
      const defaultNicknames = [
        '清风明月', '星空漫步', '岁月静好', '陌上花开',
        '云淡风轻', '晨曦微露', '碧水青山', '诗和远方'
      ]
      return defaultNicknames[Math.floor(Math.random() * defaultNicknames.length)]
    }

    const data = await response.json()
    // 处理智谱AI的reasoning_content字段
    const message = data.choices[0].message
    const nickname = (message.content || message.reasoning_content || '').trim()

    // 验证昵称长度
    if (nickname.length >= 4 && nickname.length <= 7) {
      return nickname
    } else {
      // 如果生成的昵称长度不对，使用默认昵称
      const defaultNicknames = [
        '清风明月', '星空漫步', '岁月静好', '陌上花开',
        '云淡风轻', '晨曦微露', '碧水青山', '诗和远方'
      ]
      return defaultNicknames[Math.floor(Math.random() * defaultNicknames.length)]
    }
  } catch (error) {
    console.error('生成昵称失败:', error)
    // 降级到默认昵称
    const defaultNicknames = [
      '清风明月', '星空漫步', '岁月静好', '陌上花开',
      '云淡风轻', '晨曦微露', '碧水青山', '诗和远方',
      '拾光者', '追梦人', '心若向阳', '静待花开'
    ]
    return defaultNicknames[Math.floor(Math.random() * defaultNicknames.length)]
  }
}

async function callOpenAI(prompt: string): Promise<string> {
  const { apiKey, baseUrl, model } = await getOpenAIConfig()

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const apiUrl = buildApiUrl(baseUrl)
  const startTime = Date.now()

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `解析财务记录为JSON格式：{"amount":数字,"type":"INCOME/EXPENSE","category":"分类","description":"描述","date":"YYYY-MM-DD"}。
收入分类：${INCOME_CATEGORIES.join('、')}。支出分类：${EXPENSE_CATEGORIES.join('、')}。
只返回JSON，不要其他内容。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
      thinking: {
        type: 'disabled'
      }
    })
  })

  const endTime = Date.now()
  console.log(`AI API调用耗时: ${endTime - startTime}ms, 模型: ${model}`)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API 调用失败:', {
      status: response.status,
      statusText: response.statusText,
      url: apiUrl,
      model
    })
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  const message = data.choices[0].message
  let content = message.content || ''

  console.log('AI返回的content:', content)
  console.log('AI返回的reasoning_content:', message.reasoning_content || '无')

  if (!content || content.trim() === '') {
    if (message.reasoning_content) {
      console.log('content为空，尝试从reasoning_content提取JSON')
      content = extractJSONFromText(message.reasoning_content)
    }
  }

  if (!content || content.trim() === '') {
    console.error('AI返回空内容')
    throw new Error('AI返回空内容，请尝试切换到其他AI模型或增加max_tokens')
  }

  console.log('最终提取的content:', content)
  return content
}

/**
 * 从文本中智能提取JSON
 * 处理reasoning_content中的思考过程，提取最终的JSON结果
 */
function extractJSONFromText(text: string): string {
  // 尝试提取最后一个```json...```代码块
  const jsonCodeBlockRegex = /```json\s*([\s\S]*?)\s*```/gi
  const matches = [...text.matchAll(jsonCodeBlockRegex)]

  if (matches.length > 0) {
    // 返回最后一个JSON代码块（通常是最终答案）
    const lastMatch = matches[matches.length - 1]
    return lastMatch[1].trim()
  }

  // 尝试提取普通的```...```代码块
  const codeBlockRegex = /```\s*([\s\S]*?)\s*```/gi
  const codeMatches = [...text.matchAll(codeBlockRegex)]

  if (codeMatches.length > 0) {
    const lastMatch = codeMatches[codeMatches.length - 1]
    const content = lastMatch[1].trim()
    // 验证是否是JSON格式
    if (content.startsWith('{') || content.startsWith('[')) {
      return content
    }
  }

  // 尝试直接查找JSON对象（从最后一个{开始到最后的}）
  const lastBraceIndex = text.lastIndexOf('{')
  if (lastBraceIndex !== -1) {
    const potentialJson = text.substring(lastBraceIndex)
    // 尝试找到匹配的闭合括号
    let braceCount = 0
    let endIndex = -1
    for (let i = 0; i < potentialJson.length; i++) {
      if (potentialJson[i] === '{') braceCount++
      else if (potentialJson[i] === '}') braceCount--

      if (braceCount === 0) {
        endIndex = i + 1
        break
      }
    }

    if (endIndex !== -1) {
      const jsonStr = potentialJson.substring(0, endIndex)
      // 验证是否是有效JSON
      try {
        JSON.parse(jsonStr)
        return jsonStr
      } catch {
        // 不是有效JSON，继续尝试其他方法
      }
    }
  }

  // 如果都失败了，返回原文本
  return text
}

export async function parseNaturalLanguageToTransaction(
  userInput: string
): Promise<AgentResponse> {
  try {
    const currentDate = new Date().toISOString().split('T')[0]
    const prompt = `${userInput}\n\n当前日期：${currentDate}`

    const rawResponse = await callOpenAI(prompt)

    const cleanedResponse = cleanMarkdownCode(rawResponse)
    
    let parsed: any
    try {
      parsed = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('JSON解析失败:', cleanedResponse)
      return {
        success: false,
        error: '无法解析AI响应',
        rawResponse
      }
    }

    const transaction: ParsedTransaction = {
      amount: parsed.amount,
      type: parsed.type,
      category: parsed.category,
      description: parsed.description,
      date: parsed.date ? new Date(parsed.date) : new Date()
    }

    if (typeof transaction.amount !== 'number' || transaction.amount <= 0) {
      return {
        success: false,
        error: '金额无效',
        rawResponse
      }
    }

    if (!['INCOME', 'EXPENSE'].includes(transaction.type)) {
      return {
        success: false,
        error: '交易类型无效',
        rawResponse
      }
    }

    const validCategories = transaction.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    if (!validCategories.includes(transaction.category)) {
      return {
        success: false,
        error: `分类无效，请使用以下分类之一：${validCategories.join('、')}`,
        rawResponse
      }
    }

    return {
      success: true,
      transaction,
      rawResponse
    }
  } catch (error) {
    console.error('解析自然语言失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    }
  }
}

/**
 * 清理markdown代码块标记
 * 移除 ```json 和 ``` 等标记
 */
function cleanMarkdownCode(text: string): string {
  let cleaned = text.trim()
  
  cleaned = cleaned.replace(/^```json\s*/i, '')
  cleaned = cleaned.replace(/^```\s*/, '')
  cleaned = cleaned.replace(/\s*```$/, '')
  
  return cleaned.trim()
}

export async function getTransactionSuggestions(
  partialInput: string
): Promise<string[]> {
  try {
    const { apiKey, baseUrl, model } = await getOpenAIConfig()

    if (!apiKey) {
      return []
    }

    const apiUrl = buildApiUrl(baseUrl)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `你是一个财务记录助手，根据用户的输入提供3-5个可能的完整描述建议。

用户可能想记录的财务记录，请提供一些完整的描述建议，让用户可以快速选择。

请只返回建议列表，每行一个建议，不要包含其他内容。`
          },
          {
            role: 'user',
            content: `用户输入：${partialInput}\n\n请提供3-5个完整的财务记录描述建议：`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
        thinking: {
          type: 'disabled'
        }
      })
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    // 处理智谱AI的reasoning_content字段
    const message = data.choices[0].message
    const content = message.content || message.reasoning_content || ''
    return content.split('\n').filter((line: string) => line.trim()).slice(0, 5)
  } catch (error) {
    console.error('获取建议失败:', error)
    return []
  }
}
