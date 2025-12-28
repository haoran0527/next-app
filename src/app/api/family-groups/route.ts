import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth-middleware'
import { createFamilyGroup } from '@/lib/services/family-group-service'
import { getFamilyGroupByUserId } from '@/lib/services/family-group-service'
import { User } from '@/lib/types/auth'

// POST /api/family-groups - 创建家庭组
export const POST = withAuth(async (request: NextRequest, user: User) => {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: '请提供家庭组名称' },
        { status: 400 }
      )
    }

    const familyGroup = await createFamilyGroup({
      name,
      creatorId: user.id
    })

    return NextResponse.json({
      success: true,
      data: familyGroup
    }, { status: 201 })
  } catch (error: any) {
    console.error('创建家庭组失败:', error)

    // 处理已知的错误类型
    if (error.message.includes('已属于其他家庭组')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '创建家庭组失败' },
      { status: 500 }
    )
  }
})

// GET /api/family-groups/my - 获取当前用户的家庭组
export const GET = withAuth(async (request: NextRequest, user: User) => {
  try {
    const familyGroup = await getFamilyGroupByUserId(user.id)

    if (!familyGroup) {
      return NextResponse.json(
        { error: '您不属于任何家庭组' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: familyGroup
    })
  } catch (error: any) {
    console.error('获取家庭组失败:', error)
    return NextResponse.json(
      { error: '获取家庭组失败' },
      { status: 500 }
    )
  }
})
