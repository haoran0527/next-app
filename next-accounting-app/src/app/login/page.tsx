'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string[]}>({})
  const router = useRouter()

  const validateForm = () => {
    const errors: {[key: string]: string[]} = {}
    
    // 验证用户名/邮箱
    if (!identifier.trim()) {
      errors.identifier = ['用户名或邮箱不能为空']
    }
    
    // 验证密码
    if (!password) {
      errors.password = ['密码不能为空']
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: identifier, password, rememberMe }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/dashboard')
      } else {
        setError(data.error || '登录失败')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
      <Card className="w-full max-w-md bg-white/60 backdrop-blur-sm border-white/30 shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">💰</span>
          </div>
          <CardTitle className="text-3xl bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            欢迎回来
          </CardTitle>
          <CardDescription className="text-gray-600">
            请输入您的用户名或邮箱登录账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200 flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <label htmlFor="identifier" className="text-sm font-semibold text-gray-700 flex items-center">
                <span className="mr-2">👤</span>
                用户名或邮箱 <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  if (fieldErrors.identifier) {
                    setFieldErrors(prev => ({ ...prev, identifier: [] }))
                  }
                }}
                placeholder="请输入用户名或邮箱"
                className={`h-12 bg-white/80 border-2 focus:border-blue-400 focus:ring-blue-200 ${fieldErrors.identifier?.length ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {fieldErrors.identifier?.map((error, index) => (
                <p key={index} className="text-red-600 text-sm flex items-center">
                  <span className="mr-1">⚠️</span>
                  {error}
                </p>
              ))}
            </div>

            <div className="space-y-3">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center">
                <span className="mr-2">🔒</span>
                密码 <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors(prev => ({ ...prev, password: [] }))
                  }
                }}
                placeholder="请输入密码"
                className={`h-12 bg-white/80 border-2 focus:border-blue-400 focus:ring-blue-200 ${fieldErrors.password?.length ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {fieldErrors.password?.map((error, index) => (
                <p key={index} className="text-red-600 text-sm flex items-center">
                  <span className="mr-1">⚠️</span>
                  {error}
                </p>
              ))}
            </div>

            <div className="flex items-center space-x-3 p-3 bg-blue-50/50 rounded-lg">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-700 flex items-center">
                <span className="mr-2">💾</span>
                记住我（7天内免登录）
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>登录中...</span>
                </div>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">🚀</span>
                  立即登录
                </span>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600 bg-white/40 p-3 rounded-lg">
              还没有账户？{' '}
              <a href="/register" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">
                立即注册
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}