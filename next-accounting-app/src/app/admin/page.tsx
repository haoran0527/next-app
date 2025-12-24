'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  id: string
  email: string
  username: string
  role: string
  isActive: boolean
  createdAt: string
  _count?: {
    transactions: number
  }
}

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalTransactions: number
  totalAmount: number
  recentSignups: number
}

interface AuditLog {
  id: string
  adminId: string
  action: string
  targetId?: string
  details?: any
  createdAt: string
}

type ViewMode = 'dashboard' | 'users' | 'logs' | 'backup'

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  
  // 数据状态
  const [users, setUsers] = useState<User[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  
  // 分页和搜索
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUser && currentUser.role === 'ADMIN') {
      loadSystemStats()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser && currentUser.role === 'ADMIN') {
      if (viewMode === 'users') {
        loadUsers()
      } else if (viewMode === 'logs') {
        loadAuditLogs()
      }
    }
  }, [currentUser, viewMode, currentPage, searchTerm])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (data.success && data.user.role === 'ADMIN') {
        setCurrentUser(data.user)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSystemStats(data.stats)
        }
      }
    } catch (error) {
      console.error('加载系统统计失败:', error)
    }
  }

  const loadUsers = async () => {
    setDataLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUsers(data.users)
          setTotalPages(Math.ceil(data.total / 10))
        }
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const loadAuditLogs = async () => {
    setDataLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAuditLogs(data.logs)
          setTotalPages(Math.ceil(data.total / 20))
        }
      }
    } catch (error) {
      console.error('加载审计日志失败:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: 'enable' | 'disable' | 'delete') => {
    const confirmMessages = {
      enable: '确定要启用这个用户吗？',
      disable: '确定要禁用这个用户吗？',
      delete: '确定要删除这个用户吗？此操作不可撤销！'
    }

    if (!confirm(confirmMessages[action])) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          loadUsers() // 重新加载用户列表
          loadSystemStats() // 重新加载统计数据
          alert(`用户${action === 'enable' ? '启用' : action === 'disable' ? '禁用' : '删除'}成功！`)
        } else {
          alert(`操作失败: ${data.error}`)
        }
      } else {
        alert('操作失败，请稍后重试')
      }
    } catch (error) {
      console.error('用户操作失败:', error)
      alert('操作失败，请稍后重试')
    }
  }

  const handleResetPassword = async (userId: string) => {
    if (!confirm('确定要重置这个用户的密码吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'resetPassword' }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert(`密码重置成功！新密码: ${data.newPassword}`)
        } else {
          alert(`重置失败: ${data.error}`)
        }
      } else {
        alert('重置失败，请稍后重试')
      }
    } catch (error) {
      console.error('密码重置失败:', error)
      alert('重置失败，请稍后重试')
    }
  }

  const handleBackup = async () => {
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
      })

      if (response.ok) {
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
          : 'backup.json'
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        alert('备份成功！')
      } else {
        const errorData = await response.json()
        alert(`备份失败: ${errorData.error}`)
      }
    } catch (error) {
      console.error('备份失败:', error)
      alert('备份失败，请稍后重试')
    }
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN')
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    })
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

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              管理员控制台
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                管理员：{currentUser.username}
              </span>
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                用户界面
              </Button>
              <Button onClick={handleLogout} variant="outline">
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 导航标签 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              系统概览
            </button>
            <button
              onClick={() => setViewMode('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              用户管理
            </button>
            <button
              onClick={() => setViewMode('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              操作日志
            </button>
            <button
              onClick={() => setViewMode('backup')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'backup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              数据备份
            </button>
          </nav>
        </div>
      </div>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {viewMode === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">系统统计</h2>
              
              {systemStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>总用户数</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {systemStats.totalUsers}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>活跃用户</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {systemStats.activeUsers}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>总交易记录</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {systemStats.totalTransactions}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>总交易金额</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(systemStats.totalAmount)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="py-8">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
                <div className="flex space-x-3">
                  <Input
                    placeholder="搜索用户..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-64"
                  />
                </div>
              </div>

              <Card>
                <CardContent>
                  {dataLoading ? (
                    <div className="py-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <span className="mt-2 text-gray-600">加载中...</span>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      暂无用户数据
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                user.isActive ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {user.username}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right mr-4">
                            <div className="text-sm text-gray-600">
                              注册时间: {formatDate(user.createdAt)}
                            </div>
                            <div className="text-sm text-gray-600">
                              交易记录: {user._count?.transactions || 0} 条
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            {user.isActive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUserAction(user.id, 'disable')}
                              >
                                禁用
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUserAction(user.id, 'enable')}
                              >
                                启用
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetPassword(user.id)}
                            >
                              重置密码
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUserAction(user.id, 'delete')}
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        上一页
                      </Button>
                      
                      <span className="text-sm text-gray-600">
                        第 {currentPage} 页，共 {totalPages} 页
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {viewMode === 'logs' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">操作日志</h2>

              <Card>
                <CardContent>
                  {dataLoading ? (
                    <div className="py-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <span className="mt-2 text-gray-600">加载中...</span>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      暂无操作日志
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 border border-gray-200 rounded-lg"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">
                                {log.action}
                              </div>
                              {log.details && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {JSON.stringify(log.details, null, 2)}
                                </div>
                              )}
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div>管理员: {log.adminId}</div>
                              <div>{formatDate(log.createdAt)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        上一页
                      </Button>
                      
                      <span className="text-sm text-gray-600">
                        第 {currentPage} 页，共 {totalPages} 页
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {viewMode === 'backup' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">数据备份</h2>

              <Card>
                <CardHeader>
                  <CardTitle>系统数据备份</CardTitle>
                  <CardDescription>
                    导出所有用户数据和系统配置
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      点击下方按钮将生成包含所有用户数据的备份文件。备份文件包含：
                    </p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      <li>所有用户账户信息</li>
                      <li>所有财务交易记录</li>
                      <li>系统配置和设置</li>
                      <li>操作日志记录</li>
                    </ul>
                    
                    <div className="pt-4">
                      <Button onClick={handleBackup} size="lg">
                        生成备份文件
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}