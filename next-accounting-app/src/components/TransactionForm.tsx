'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Transaction, TransactionType, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/types/transaction'

interface TransactionFormProps {
  transaction?: Transaction
  onSubmit: (data: {
    amount: number
    type: TransactionType
    category: string
    description?: string
    date: Date
  }) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

export default function TransactionForm({ 
  transaction, 
  onSubmit, 
  onCancel, 
  loading = false 
}: TransactionFormProps) {
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '')
  const [type, setType] = useState<TransactionType>(transaction?.type || 'EXPENSE')
  const [category, setCategory] = useState(transaction?.category || '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [date, setDate] = useState(
    transaction?.date 
      ? new Date(transaction.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [errors, setErrors] = useState<{[key: string]: string[]}>({})

  const validateForm = () => {
    const newErrors: {[key: string]: string[]} = {}
    
    // 验证金额
    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = ['请输入有效的金额']
    }
    
    // 验证分类
    if (!category) {
      newErrors.category = ['请选择分类']
    }
    
    // 验证日期
    if (!date) {
      newErrors.date = ['请选择日期']
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      await onSubmit({
        amount: parseFloat(amount),
        type,
        category,
        description: description || undefined,
        date: new Date(date)
      })
    } catch (error) {
      console.error('提交失败:', error)
    }
  }

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-white/30 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
        <CardTitle className="flex items-center text-gray-800">
          <span className="mr-2">{transaction ? '✏️' : '➕'}</span>
          {transaction ? '编辑财务记录' : '添加财务记录'}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {transaction ? '修改您的财务记录信息' : '记录您的收入或支出'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 交易类型 */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">🏷️</span>
              类型 <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-green-50 has-[:checked]:bg-green-50 has-[:checked]:border-green-300">
                <input
                  type="radio"
                  value="INCOME"
                  checked={type === 'INCOME'}
                  onChange={(e) => {
                    setType(e.target.value as TransactionType)
                    setCategory('') // 重置分类
                  }}
                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <span className="text-green-600 font-medium flex items-center">
                  <span className="mr-1">💰</span>
                  收入
                </span>
              </label>
              <label className="flex items-center space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-red-50 has-[:checked]:bg-red-50 has-[:checked]:border-red-300">
                <input
                  type="radio"
                  value="EXPENSE"
                  checked={type === 'EXPENSE'}
                  onChange={(e) => {
                    setType(e.target.value as TransactionType)
                    setCategory('') // 重置分类
                  }}
                  className="h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-red-600 font-medium flex items-center">
                  <span className="mr-1">💸</span>
                  支出
                </span>
              </label>
            </div>
          </div>

          {/* 金额 */}
          <div className="space-y-3">
            <label htmlFor="amount" className="text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">💵</span>
              金额 <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                ¥
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  if (errors.amount) {
                    setErrors(prev => ({ ...prev, amount: [] }))
                  }
                }}
                placeholder="0.00"
                className={`pl-10 h-12 text-lg bg-white/80 border-2 focus:border-blue-400 focus:ring-blue-200 ${errors.amount?.length ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
            </div>
            {errors.amount?.map((error, index) => (
              <p key={index} className="text-red-600 text-sm flex items-center">
                <span className="mr-1">⚠️</span>
                {error}
              </p>
            ))}
          </div>

          {/* 分类 */}
          <div className="space-y-3">
            <label htmlFor="category" className="text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">📂</span>
              分类 <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                if (errors.category) {
                  setErrors(prev => ({ ...prev, category: [] }))
                }
              }}
              className={`w-full h-12 px-4 text-sm border-2 rounded-lg bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all duration-200 ${
                errors.category?.length ? 'border-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">请选择分类</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category?.map((error, index) => (
              <p key={index} className="text-red-600 text-sm flex items-center">
                <span className="mr-1">⚠️</span>
                {error}
              </p>
            ))}
          </div>

          {/* 日期 */}
          <div className="space-y-3">
            <label htmlFor="date" className="text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">📅</span>
              日期 <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                if (errors.date) {
                  setErrors(prev => ({ ...prev, date: [] }))
                }
              }}
              className={`h-12 bg-white/80 border-2 focus:border-blue-400 focus:ring-blue-200 ${errors.date?.length ? 'border-red-500 focus:border-red-500' : ''}`}
              required
            />
            {errors.date?.map((error, index) => (
              <p key={index} className="text-red-600 text-sm flex items-center">
                <span className="mr-1">⚠️</span>
                {error}
              </p>
            ))}
          </div>

          {/* 描述 */}
          <div className="space-y-3">
            <label htmlFor="description" className="text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2">📝</span>
              描述
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选，添加一些备注信息"
              rows={3}
              className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all duration-200 resize-none"
            />
          </div>

          {/* 按钮 */}
          <div className="flex space-x-4 pt-6">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{transaction ? '更新中...' : '保存中...'}</span>
                </div>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">{transaction ? '✏️' : '💾'}</span>
                  {transaction ? '更新记录' : '保存记录'}
                </span>
              )}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
                className="h-12 bg-white/60 hover:bg-white/80 border-white/30 shadow-md hover:shadow-lg transition-all duration-200"
              >
                取消
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}