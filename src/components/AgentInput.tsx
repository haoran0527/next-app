'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetch } from '@/lib/api'
import { Transaction } from '@/lib/types/transaction'

interface AgentInputProps {
  onSuccess?: (transaction: Transaction) => void
}

interface ParsedResult {
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: string
  description?: string
  date?: Date
}

export default function AgentInput({ onSuccess }: AgentInputProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null)
  const [error, setError] = useState('')

  const handleInputChange = (value: string) => {
    setInput(value)
    setError('')
  }

  const handleParse = async () => {
    if (!input.trim()) {
      setError('请输入财务记录描述')
      return
    }

    setLoading(true)
    setError('')
    setParsedResult(null)

    try {
      const response = await apiFetch('/api/agent/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const transaction = {
            ...data.transaction,
            amount: typeof data.transaction.amount === 'string' 
              ? parseFloat(data.transaction.amount) 
              : data.transaction.amount
          }
          setParsedResult(transaction)
        } else {
          setError(data.error || '解析失败')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || '解析失败')
      }
    } catch (err) {
      console.error('解析失败:', err)
      setError('解析失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!parsedResult) return

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedResult),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setInput('')
          setParsedResult(null)
          if (onSuccess) {
            onSuccess(data.transaction)
          }
        } else {
          setError(data.error || '添加失败')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || '添加失败')
      }
    } catch (err) {
      console.error('添加失败:', err)
      setError('添加失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setParsedResult(null)
  }

  const getExampleTexts = () => [
    '今天花了50元买午饭',
    '收到工资8000元',
    '12月20日打车花了35元',
    '买了一件衣服花了200元',
    '收到奖金5000元'
  ]

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-white/30 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
        <CardTitle className="flex items-center text-gray-800">
          <span className="mr-2">🤖</span>
          智能记账助手
        </CardTitle>
        <CardDescription className="text-gray-600">
          使用自然语言快速记录您的财务信息
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {!parsedResult ? (
          <>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <span className="mr-2">💬</span>
                输入描述
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="例如：今天花了50元买午饭"
                  className="pr-12"
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
              )}
            </div>

            <Button
              onClick={handleParse}
              disabled={loading || !input.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
            >
              {loading ? '解析中...' : '🔍 解析'}
            </Button>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">示例：</p>
              <div className="flex flex-wrap gap-2">
                {getExampleTexts().map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleInputChange(example)}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                <span className="mr-2">✅</span>
                解析结果
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">金额：</span>
                  <span className="font-semibold text-gray-900">
                    ¥{parsedResult.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">类型：</span>
                  <span className={`font-semibold ${
                    parsedResult.type === 'INCOME' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {parsedResult.type === 'INCOME' ? '收入' : '支出'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">分类：</span>
                  <span className="font-semibold text-gray-900">
                    {parsedResult.category}
                  </span>
                </div>
                {parsedResult.description && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">描述：</span>
                    <span className="font-semibold text-gray-900">
                      {parsedResult.description}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">日期：</span>
                  <span className="font-semibold text-gray-900">
                    {parsedResult.date 
                      ? new Date(parsedResult.date).toLocaleDateString('zh-CN')
                      : new Date().toLocaleDateString('zh-CN')
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
              >
                {loading ? '添加中...' : '✓ 确认添加'}
              </Button>
              <Button
                onClick={handleCancel}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                ✗ 取消
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
