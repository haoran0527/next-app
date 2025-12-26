/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateTransactionData, TransactionType } from '../types/transaction'

function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.deepseek.com'
  return { apiKey, baseUrl }
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

async function callOpenAI(prompt: string): Promise<string> {
  const { apiKey, baseUrl } = getOpenAIConfig()
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是一个财务记录助手，专门解析用户的自然语言描述并提取财务记录信息。

请从用户的描述中提取以下信息：
1. 金额（数字）
2. 类型（收入或支出）
3. 分类（必须从以下分类中选择）
   - 收入分类：${INCOME_CATEGORIES.join('、')}
   - 支出分类：${EXPENSE_CATEGORIES.join('、')}
4. 描述（可选，用户描述的原始内容）
5. 日期（可选，如果用户提到日期则提取，否则使用当前日期）

请严格按照以下JSON格式返回，不要包含任何其他内容：
{
  "amount": 数字,
  "type": "INCOME"或"EXPENSE",
  "category": "具体分类名称",
  "description": "描述内容",
  "date": "YYYY-MM-DD格式，如果未提到则使用当前日期"
}

示例：
输入："今天花了50元买午饭"
输出：{"amount": 50, "type": "EXPENSE", "category": "餐饮", "description": "买午饭", "date": "2024-12-25"}

输入："收到工资8000元"
输出：{"amount": 8000, "type": "INCOME", "category": "工资收入", "description": "收到工资", "date": "2024-12-25"}

输入："12月20日打车花了35元"
输出：{"amount": 35, "type": "EXPENSE", "category": "交通", "description": "打车", "date": "2024-12-20"}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function parseNaturalLanguageToTransaction(
  userInput: string
): Promise<AgentResponse> {
  try {
    const currentDate = new Date().toISOString().split('T')[0]
    const prompt = `${userInput}\n\n当前日期：${currentDate}`

    const rawResponse = await callOpenAI(prompt)

    let parsed: any
    try {
      parsed = JSON.parse(rawResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', rawResponse)
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

export async function getTransactionSuggestions(
  partialInput: string
): Promise<string[]> {
  try {
    const { apiKey, baseUrl } = getOpenAIConfig()
    
    if (!apiKey) {
      return []
    }
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
        max_tokens: 300
      })
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const content = data.choices[0].message.content
    return content.split('\n').filter((line: string) => line.trim()).slice(0, 5)
  } catch (error) {
    console.error('获取建议失败:', error)
    return []
  }
}
