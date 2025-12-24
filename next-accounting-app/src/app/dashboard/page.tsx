'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import TransactionForm from '@/components/TransactionForm'
import TransactionList from '@/components/TransactionList'
import StatisticsCharts from '@/components/StatisticsCharts'
import { 
  Transaction, 
  TransactionFilters, 
  DashboardSummary, 
  CategoryStats, 
  MonthlyStats,
  CreateTransactionData 
} from '@/lib/types/transaction'

interface User {
  id: string
  email: string
  username: string
  role: string
  createdAt: string
}

type ViewMode = 'dashboard' | 'add' | 'edit' | 'list'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  
  // 数据状态
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  
  // 分页和筛选
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<TransactionFilters>({})
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  useEffect(() => {
    if (user && viewMode === 'list') {
      loadTransactions()
    }
  }, [user, viewMode, currentPage, filters])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (data.success) {
        setUser(data.user)
      } else {
        router.push('/login')
      }
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      // 加载统计数据
      const statsResponse = await fetch('/api/user/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setSummary(statsData.summary)
          setCategoryStats(statsData.categoryStats)
          setMonthlyStats(statsData.monthlyStats)
        }
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  const loadTransactions = async () => {
    setTransactionLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        offset: ((currentPage - 1) * 10).toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      })

      const response = await fetch(`/api/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTransactions(data.transactions)
          setTotalCount(data.total)
          setTotalPages(Math.ceil(data.total / 10))
        }
      }
    } catch (error) {
      console.error('加载交易记录失败:', error)
    } finally {
      setTransactionLoading(false)
    }
  }

  const handleCreateTransaction = async (data: CreateTransactionData) => {
    setSubmitLoading(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setViewMode('dashboard')
          await loadDashboardData() // 重新加载统计数据
          alert('财务记录添加成功！')
        } else {
          alert(`添加失败: ${result.error}`)
        }
      } else {
        const errorData = await response.json()
        alert(`添加失败: ${errorData.error || '请稍后重试'}`)
      }
    } catch (error) {
      console.error('添加记录失败:', error)
      alert('添加失败，请稍后重试')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleUpdateTransaction = async (data: CreateTransactionData) => {
    if (!editingTransaction) return
    
    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setViewMode('dashboard')
          setEditingTransaction(null)
          await loadDashboardData() // 重新加载统计数据
          if (viewMode === 'list') {
            await loadTransactions() // 如果在列表页面，也重新加载列表
          }
          alert('财务记录更新成功！')
        } else {
          alert(`更新失败: ${result.error}`)
        }
      } else {
        const errorData = await response.json()
        alert(`更新失败: ${errorData.error || '请稍后重试'}`)
      }
    } catch (error) {
      console.error('更新记录失败:', error)
      alert('更新失败，请稍后重试')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await loadDashboardData() // 重新加载统计数据
          await loadTransactions() // 重新加载列表
          alert('财务记录删除成功！')
        } else {
          alert(`删除失败: ${result.error}`)
        }
      } else {
        const errorData = await response.json()
        alert(`删除失败: ${errorData.error || '请稍后重试'}`)
      }
    } catch (error) {
      console.error('删除记录失败:', error)
      alert('删除失败，请稍后重试')
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setViewMode('edit')
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/login')
      }
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  const handleExportCsv = async () => {
    try {
      const response = await fetch('/api/transactions/export')
      
      if (response.ok) {
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
          : '财务记录.csv'
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        alert('导出成功！')
      } else {
        const errorData = await response.json()
        alert(`导出失败: ${errorData.error}`)
      }
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请稍后重试')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 头部导航 */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">💰</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                智能记账本
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-2 bg-white/60 rounded-full">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{user.username.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-gray-700 font-medium">
                  欢迎，{user.username}
                </span>
              </div>
              <Button onClick={handleLogout} variant="outline" className="bg-white/60 hover:bg-white/80 border-white/30">
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 导航标签 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                viewMode === 'dashboard'
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 仪表板
            </button>
            <button
              onClick={() => setViewMode('add')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                viewMode === 'add'
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ➕ 添加记录
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                viewMode === 'list'
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 记录列表
            </button>
          </nav>
        </div>
      </div>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {viewMode === 'dashboard' && (
            <div className="space-y-8">
              {/* 快捷操作 */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    财务概览
                  </h2>
                  <p className="text-gray-600 mt-1">掌握您的财务状况，做出明智决策</p>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setViewMode('add')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    ➕ 添加记录
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleExportCsv}
                    className="bg-white/60 hover:bg-white/80 border-white/30 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    📊 导出数据
                  </Button>
                </div>
              </div>

              {/* 统计图表 */}
              {summary ? (
                <div className="animate-in fade-in-50 duration-500">
                  <StatisticsCharts
                    summary={summary}
                    categoryStats={categoryStats}
                    monthlyStats={monthlyStats}
                  />
                </div>
              ) : (
                <Card className="bg-white/60 backdrop-blur-sm border-white/30 shadow-lg">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📊</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">开始您的财务之旅</h3>
                      <p className="text-gray-500 mb-6">暂无数据，请先添加一些财务记录来查看精美的统计图表</p>
                      <Button 
                        onClick={() => setViewMode('add')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      >
                        立即添加记录
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {viewMode === 'add' && (
            <div className="max-w-2xl mx-auto animate-in fade-in-50 duration-500">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  添加财务记录
                </h2>
                <p className="text-gray-600 mt-2">记录您的每一笔收入和支出</p>
              </div>
              <TransactionForm
                onSubmit={handleCreateTransaction}
                onCancel={() => setViewMode('dashboard')}
                loading={submitLoading}
              />
            </div>
          )}

          {viewMode === 'edit' && editingTransaction && (
            <div className="max-w-2xl mx-auto animate-in fade-in-50 duration-500">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  编辑财务记录
                </h2>
                <p className="text-gray-600 mt-2">修改您的财务记录信息</p>
              </div>
              <TransactionForm
                transaction={editingTransaction}
                onSubmit={handleUpdateTransaction}
                onCancel={() => {
                  setViewMode('dashboard')
                  setEditingTransaction(null)
                }}
                loading={submitLoading}
              />
            </div>
          )}

          {viewMode === 'list' && (
            <div className="animate-in fade-in-50 duration-500">
              <div className="mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  财务记录列表
                </h2>
                <p className="text-gray-600 mt-2">查看和管理您的所有财务记录</p>
              </div>
              <TransactionList
                transactions={transactions}
                loading={transactionLoading}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onFilter={(newFilters) => {
                  setFilters(newFilters)
                  setCurrentPage(1)
                }}
                totalCount={totalCount}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}