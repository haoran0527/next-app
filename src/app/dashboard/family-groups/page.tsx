'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { apiFetch } from '@/lib/api'
import { Copy, Users, UserPlus, LogOut, Trash2, Crown } from 'lucide-react'

interface User {
  id: string
  username: string
  nickname: string | null
}

interface FamilyMember {
  userId: string
  username: string
  nickname: string | null
  role: string
  joinedAt: string
}

interface FamilyGroup {
  id: string
  name: string
  inviteCode: string
  creatorId: string
  createdAt: string
  creator: User
  members: Array<{
    user: User
    role: string
    joinedAt: string
  }>
}

interface FamilyGroupStats {
  personalStats: {
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
  }
  memberStats: Array<{
    userId: string
    username: string
    nickname: string | null
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
  }>
  familyStats: {
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
    memberCount: number
  }
}

export default function FamilyGroupsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null)
  const [stats, setStats] = useState<FamilyGroupStats | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showDissolveDialog, setShowDissolveDialog] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await apiFetch('/api/auth/me')
      const data = await response.json()

      if (data.success) {
        setCurrentUser(data.user)
        await loadFamilyGroup()
      } else {
        router.push('/login')
      }
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadFamilyGroup = async () => {
    try {
      const response = await apiFetch('/api/family-groups')
      const data = await response.json()

      if (data.success && data.data) {
        setFamilyGroup(data.data)
        await loadStats(data.data.id)
      } else {
        setFamilyGroup(null)
        setStats(null)
      }
    } catch (error) {
      console.error('加载家庭组失败:', error)
    }
  }

  const loadStats = async (groupId: string) => {
    try {
      const response = await apiFetch(`/api/family-groups/${groupId}/stats`)
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      return
    }

    setSubmitting(true)
    try {
      const response = await apiFetch('/api/family-groups', {
        method: 'POST',
        body: JSON.stringify({ name: groupName }),
      })

      const data = await response.json()

      if (data.success) {
        setFamilyGroup(data.data)
        setShowCreateDialog(false)
        setGroupName('')
        await loadStats(data.data.id)
      } else {
        alert(data.error || '创建失败')
      }
    } catch (error) {
      console.error('创建家庭组失败:', error)
      alert('创建失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      return
    }

    setSubmitting(true)
    try {
      const response = await apiFetch(`/api/family-groups/${inviteCode.trim()}/join`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setFamilyGroup(data.data)
        setShowJoinDialog(false)
        setInviteCode('')
        await loadStats(data.data.id)
      } else {
        alert(data.error || '加入失败')
      }
    } catch (error) {
      console.error('加入家庭组失败:', error)
      alert('加入失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeaveGroup = async () => {
    setSubmitting(true)
    try {
      const response = await apiFetch(`/api/family-groups/${familyGroup!.id}/leave`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setFamilyGroup(null)
        setStats(null)
        setShowLeaveDialog(false)
      } else {
        alert(data.error || '退出失败')
      }
    } catch (error) {
      console.error('退出家庭组失败:', error)
      alert('退出失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDissolveGroup = async () => {
    setSubmitting(true)
    try {
      const response = await apiFetch(`/api/family-groups/${familyGroup!.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setFamilyGroup(null)
        setStats(null)
        setShowDissolveDialog(false)
      } else {
        alert(data.error || '解散失败')
      }
    } catch (error) {
      console.error('解散家庭组失败:', error)
      alert('解散失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const copyInviteCode = () => {
    if (familyGroup?.inviteCode) {
      navigator.clipboard.writeText(familyGroup.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">家庭组管理</h1>
            <p className="text-gray-600 mt-1">管理您的家庭组，与家庭成员共享账单</p>
          </div>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
          >
            返回记账
          </Button>
        </div>

        {!familyGroup ? (
          // 未加入家庭组的状态
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <CardTitle>您还未加入任何家庭组</CardTitle>
              <CardDescription>
                创建或加入家庭组，与家庭成员一起管理财务
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <UserPlus className="w-4 h-4 mr-2" />
                    创建家庭组
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建家庭组</DialogTitle>
                    <DialogDescription>
                      创建一个新的家庭组，邀请您的家庭成员加入
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="name">家庭组名称</Label>
                      <Input
                        id="name"
                        placeholder="例如：张家、温馨小家"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={submitting || !groupName.trim()}
                    >
                      {submitting ? '创建中...' : '创建'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" size="lg">
                    <Users className="w-4 h-4 mr-2" />
                    加入家庭组
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>加入家庭组</DialogTitle>
                    <DialogDescription>
                      输入家庭组邀请码加入已有的家庭组
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="inviteCode">邀请码</Label>
                      <Input
                        id="inviteCode"
                        placeholder="请输入8位邀请码"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        maxLength={8}
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        请向家庭成员索取邀请码
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleJoinGroup}
                      disabled={submitting || !inviteCode.trim()}
                    >
                      {submitting ? '加入中...' : '加入'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          // 已加入家庭组的状态
          <div className="space-y-6">
            {/* 家庭组信息卡片 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{familyGroup.name}</CardTitle>
                    <CardDescription className="mt-2">
                      创建于 {new Date(familyGroup.createdAt).toLocaleDateString('zh-CN')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {familyGroup.creatorId === currentUser?.id ? (
                      <Dialog open={showDissolveDialog} onOpenChange={setShowDissolveDialog}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-2" />
                            解散家庭组
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>确认解散家庭组</DialogTitle>
                            <DialogDescription>
                              解散后，所有成员将被移除，此操作不可撤销。确定要继续吗？
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowDissolveDialog(false)}
                            >
                              取消
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDissolveGroup}
                              disabled={submitting}
                            >
                              {submitting ? '解散中...' : '确认解散'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <LogOut className="w-4 h-4 mr-2" />
                            退出家庭组
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>确认退出家庭组</DialogTitle>
                            <DialogDescription>
                              退出后，您将无法查看该家庭组的共享账单。确定要继续吗？
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowLeaveDialog(false)}
                            >
                              取消
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleLeaveGroup}
                              disabled={submitting}
                            >
                              {submitting ? '退出中...' : '确认退出'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm text-gray-600">邀请码</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-2xl font-mono font-bold tracking-wider">
                        {familyGroup.inviteCode}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyInviteCode}
                      >
                        <Copy className="w-4 h-4" />
                        {copied ? '已复制' : '复制'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      分享此邀请码给家庭成员，让他们加入您的家庭组
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {familyGroup.members.length}
                    </div>
                    <div className="text-sm text-gray-600">成员数量</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 统计数据 */}
            {stats && (
              <div className="grid md:grid-cols-3 gap-6">
                {/* 个人统计 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">我的统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">总收入</span>
                        <span className="font-semibold text-green-600">
                          ¥{stats.personalStats.totalIncome.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">总支出</span>
                        <span className="font-semibold text-red-600">
                          ¥{stats.personalStats.totalExpense.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="font-medium">余额</span>
                        <span className={`font-bold ${stats.personalStats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ¥{stats.personalStats.balance.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">交易笔数</span>
                        <span className="font-medium">{stats.personalStats.transactionCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 家庭统计 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">家庭总计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">总收入</span>
                        <span className="font-semibold text-green-600">
                          ¥{stats.familyStats.totalIncome.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">总支出</span>
                        <span className="font-semibold text-red-600">
                          ¥{stats.familyStats.totalExpense.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-3">
                        <span className="font-medium">余额</span>
                        <span className={`font-bold ${stats.familyStats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ¥{stats.familyStats.balance.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">交易笔数</span>
                        <span className="font-medium">{stats.familyStats.transactionCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 成员统计概览 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">成员统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {stats.memberStats.map((member) => (
                        <div key={member.userId} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <Crown className={`w-4 h-4 ${member.userId === familyGroup.creatorId ? 'text-yellow-500' : 'text-gray-300'}`} />
                            <span>{member.nickname || member.username}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-green-600">¥{member.totalIncome.toFixed(0)}</span>
                            <span className="text-red-600">¥{member.totalExpense.toFixed(0)}</span>
                            <span className={`font-medium ${member.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ¥{member.balance.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 成员列表 */}
            <Card>
              <CardHeader>
                <CardTitle>家庭成员</CardTitle>
                <CardDescription>
                  共 {familyGroup.members.length} 位成员
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {familyGroup.members.map((member) => (
                    <div
                      key={member.user.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {member.user.nickname?.[0] || member.user.username[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.user.nickname || member.user.username}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            {member.role === 'CREATOR' && (
                              <>
                                <Crown className="w-3 h-3 text-yellow-500" />
                                <span>创建者</span>
                              </>
                            )}
                            {member.user.id === currentUser?.id && (
                              <span className="text-blue-600">（我）</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        加入于 {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
