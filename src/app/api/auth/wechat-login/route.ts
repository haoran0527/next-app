import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/services/session-service'
import { generateNickname } from '@/lib/services/agent-service'
import { getRememberMeCookieOptions } from '@/lib/cookie-config'

interface WeChatLoginRequest {
  code: string
  userInfo?: {
    nickName?: string
    avatarUrl?: string
  }
}

interface WeChatSessionResponse {
  openid: string
  session_key: string
  errcode?: number
  errmsg?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: WeChatLoginRequest = await request.json()
    const { code, userInfo } = body

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少 code 参数' },
        { status: 400 }
      )
    }

    // 从环境变量获取微信小程序配置
    const appId = process.env.WECHAT_MINI_APP_ID
    const appSecret = process.env.WECHAT_MINI_APP_SECRET

    if (!appId || !appSecret) {
      return NextResponse.json(
        { success: false, error: '微信小程序配置未设置' },
        { status: 500 }
      )
    }

    // 向微信服务器换取 openid 和 session_key
    const wxLoginUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`

    const wxResponse = await fetch(wxLoginUrl)
    const wxData: WeChatSessionResponse = await wxResponse.json()

    if (wxData.errcode) {
      console.error('微信登录失败:', wxData.errmsg)
      return NextResponse.json(
        { success: false, error: `微信登录失败: ${wxData.errmsg}` },
        { status: 400 }
      )
    }

    const openid = wxData.openid

    // 查找是否已存在该 openid 的用户
    let user = await prisma.user.findUnique({
      where: { wechatOpenId: openid }
    })

    // 如果用户不存在，自动创建新用户
    if (!user) {
      // 生成唯一的用户名和邮箱
      const timestamp = Date.now()
      const randomSuffix = Math.floor(Math.random() * 10000)
      const username = `wx_user_${timestamp}_${randomSuffix}`
      const email = `wx_${openid.substring(0, 8)}@wechat.miniapp`

      // 生成随机密码（微信用户不会使用密码登录）
      const password = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)

      // 确定昵称：优先使用微信昵称，如果没有则使用大模型生成
      let nickname = userInfo?.nickName

      if (!nickname) {
        console.log('未获取到微信昵称，使用大模型生成诗意昵称')
        nickname = await generateNickname()
        console.log('生成的昵称:', nickname)
      }

      user = await prisma.user.create({
        data: {
          username,
          email,
          password,
          wechatOpenId: openid,
          role: 'USER',
          isActive: true,
          nickname: nickname
        }
      })

      console.log('创建新微信用户:', user.id, '昵称:', nickname)
    }

    // 创建会话
    const session = await createSession(user.id, true)

    if (!session) {
      return NextResponse.json(
        { success: false, error: '创建会话失败' },
        { status: 500 }
      )
    }

    // 返回登录结果
    const response = NextResponse.json(
      {
        success: true,
        message: user.wechatOpenId === openid ? '登录成功' : '注册并登录成功',
        sessionToken: session.token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          nickname: user.nickname,
          role: user.role
        }
      },
      { status: 200 }
    )

    // 设置会话Cookie - 使用环境适配的配置（微信登录默认记住7天）
    const cookieOptions = getRememberMeCookieOptions()

    response.cookies.set('session-token', session.token, cookieOptions)

    return response
  } catch (error) {
    console.error('微信登录API错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
