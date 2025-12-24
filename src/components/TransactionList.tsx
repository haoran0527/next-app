'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Transaction, TransactionType, TransactionFilters } from '@/lib/types/transaction'

interface TransactionListProps {
  transactions: Transaction[]
  loading?: boolean
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transactionId: string) => void
  onFilter?: (filters: TransactionFilters) => void
  totalCount?: number
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export default function TransactionList({
  transactions,
  loading = false,
  onEdit,
  onDelete,
  onFilter,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}: TransactionListProps) {
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilter?.(newFilters)
  }

  const clearFilters = () => {
    setFilters({})
    onFilter?.({})
  }

  const formatAmount = (amount: number, type: TransactionType) => {
    const formatted = amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return type === 'INCOME' ? `+¥${formatted}` : `-¥${formatted}`
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">加载中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-white/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center text-gray-800">
              <span className="mr-2">📋</span>
              财务记录
            </CardTitle>
            <CardDescription className="text-gray-600">
              共 {totalCount} 条记录
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white/60 hover:bg-white/80 border-white/30 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <span className="mr-2">{showFilters ? '🔍' : '🔍'}</span>
            {showFilters ? '隐藏筛选' : '显示筛选'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 筛选器 */}
        {showFilters && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 类型筛选 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">🏷️</span>
                  类型
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                  className="w-full h-10 px-3 py-1 text-sm border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all duration-200"
                >
                  <option value="">全部</option>
                  <option value="INCOME">💰 收入</option>
                  <option value="EXPENSE">💸 支出</option>
                </select>
              </div>

              {/* 开始日期 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">📅</span>
                  开始日期
                </label>
                <Input
                  type="date"
                  value={filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                  className="h-10 bg-white border-2 border-gray-300 focus:border-blue-400 focus:ring-blue-200"
                />
              </div>

              {/* 结束日期 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">📅</span>
                  结束日期
                </label>
                <Input
                  type="date"
                  value={filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                  className="h-10 bg-white border-2 border-gray-300 focus:border-blue-400 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="bg-white/60 hover:bg-white/80 border-white/30 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <span className="mr-2">🗑️</span>
                清除筛选
              </Button>
            </div>
          </div>
        )}

        {/* 记录列表 */}
        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📝</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无财务记录</h3>
            <p className="text-gray-500">开始记录您的收入和支出吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-5 bg-white/80 border border-gray-200/50 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      transaction.type === 'INCOME' 
                        ? 'bg-gradient-to-r from-green-400 to-green-500' 
                        : 'bg-gradient-to-r from-red-400 to-red-500'
                    }`}>
                      <span className="text-white text-lg">
                        {transaction.type === 'INCOME' ? '💰' : '💸'}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">
                        {transaction.category}
                      </div>
                      {transaction.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {transaction.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right mr-4">
                  <div className={`text-xl font-bold ${
                    transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center justify-end mt-1">
                    <span className="mr-1">📅</span>
                    {formatDate(transaction.date)}
                  </div>
                </div>

                {(onEdit || onDelete) && (
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(transaction)}
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 hover:text-blue-700"
                      >
                        <span className="mr-1">✏️</span>
                        编辑
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('确定要删除这条记录吗？')) {
                            onDelete(transaction.id)
                          }
                        }}
                        className="bg-red-50 hover:bg-red-100 border-red-200 text-red-600 hover:text-red-700"
                      >
                        <span className="mr-1">🗑️</span>
                        删除
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
              className="bg-white/60 hover:bg-white/80 border-white/30 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              <span className="mr-1">⬅️</span>
              上一页
            </Button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-lg">
                第 <span className="font-semibold text-blue-600">{currentPage}</span> 页，共 <span className="font-semibold text-blue-600">{totalPages}</span> 页
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
              className="bg-white/60 hover:bg-white/80 border-white/30 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              下一页
              <span className="ml-1">➡️</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}