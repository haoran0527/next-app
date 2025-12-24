'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateRegistrationData } from '@/lib/validation/auth-validation'
import { apiFetch } from '@/lib/api'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string[]}>({})
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const validateForm = () => {
    const errors: {[key: string]: string[]} = {}
    
    // 使用现有的验证逻辑
    const validation = validateRegistrationData({ email, username, password })
    if (!validation.isValid) {
      // 将错误按字段分组
      validation.errors.forEach(error => {
        if (error.includes('邮箱')) {
          if (!errors.email) errors.email = []
          errors.email.push(error)
        } else if (error.includes('用户名')) {
          if (!errors.username) errors.username = []
          errors.username.push(error)
        } else if (error.includes('密码')) {
          if (!errors.password) errors.password = []
          errors.password.push(error)
        }
      })
    }
    
    // 验证密码确认
    if (password !== confirmPassword) {
      if (!errors.confirmPassword) errors.confirmPassword = []
      errors.confirmPassword.push('两次输入的密码不一致')
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
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(data.error || '注册失败')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
        <Card className="w-full max-w-md bg-white/60 backdrop-blur-sm border-white/30 shadow-xl">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-3xl">✅</span>
              </div>
              <div>
                <div className="text-green-600 text-2xl font-bold mb-2">
                  注册成功！
                </div>
                <p className="text-gray-600">
                  您的账户已创建成功，正在跳转到登录页面...
                </p>
              </div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
      <Card className="w-full max-w-md bg-white/60 backdrop-blur-sm border-white/30 shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🎯</span>
          </div>
          <CardTitle className="text-3xl bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            创建账户
          </CardTitle>
          <CardDescription className="text-gray-600">
            加入智能记账本，开始管理您的财务
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
              <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center">
                <span className="mr-2">📧</span>
                邮箱 <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors(prev => ({ ...prev, email: [] }))
                  }
                }}
                placeholder="请输入邮箱地址"
                className={`h-12 bg-white/80 border-2 focus:border-blue-400 focus:ring-blue-200 ${fieldErrors.email?.length ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {fieldErrors.email?.map((error, index) => (
                <p key={index} className="text-red-600 text-sm flex items-center">
                  <span className="mr-1">⚠️</span>
                  {error}
                </p>
              ))}
            </div>

            <div className="space-y-3">
              <label htmlFor="username" className="text-sm font-semibold text-gray-700 flex items-center">
                <span className="mr-2">👤</span>
                用户名 <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (fieldErrors.username) {
                    setFieldErrors(prev => ({ ...prev, username: [] }))
                  }
                }}
                placeholder="3-50个字符，支持中文、字母、数字、下划线"
                className={`h-12 bg-white/80 border-2 focus:border-blue-400 focus:ring-blue-200 ${fieldErrors.username?.length ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {fieldErrors.username?.map((error, index) => (
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
                placeholder="至少8位，包含大小写字母、数字和特殊字符"
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

            <div className="space-y-3">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 flex items-center">
                <span className="mr-2">🔐</span>
                确认密码 <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: [] }))
                  }
                }}
                placeholder="请再次输入密码"
                className={`h-12 bg-white/80 border-2 focus:border-blue-400 focus:ring-blue-200 ${fieldErrors.confirmPassword?.length ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {fieldErrors.confirmPassword?.map((error, index) => (
                <p key={index} className="text-red-600 text-sm flex items-center">
                  <span className="mr-1">⚠️</span>
                  {error}
                </p>
              ))}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>注册中...</span>
                </div>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">🚀</span>
                  立即注册
                </span>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600 bg-white/40 p-3 rounded-lg">
              已有账户？{' '}
              <a href="/note/login" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">
                立即登录
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}