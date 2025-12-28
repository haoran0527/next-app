const app = getApp()
const { post } = require('../../utils/request.js')

Page({
  data: {
    username: '',
    password: '',
    loading: false,
    wechatLoading: false
  },

  onLoad() {
    if (app.getToken()) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  async onLogin() {
    const { username, password } = this.data
    
    if (!username || !password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      const res = await post('/auth/login', { username, password })
      
      app.setToken(res.sessionToken)
      app.setUserInfo(res.user)

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
    } catch (error) {
      console.error('登录失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },

  async onWechatLogin() {
    const { wechatLoading } = this.data

    if (wechatLoading) {
      return
    }

    this.setData({ wechatLoading: true })

    try {
      // 先获取登录凭证
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        })
      })

      if (!loginRes || !loginRes.code) {
        wx.showToast({
          title: '获取登录凭证失败',
          icon: 'none'
        })
        this.setData({ wechatLoading: false })
        return
      }

      // 再获取用户信息（可能会被用户拒绝）
      let userInfo = null

      try {
        const profileRes = await new Promise((resolve, reject) => {
          wx.getUserProfile({
            desc: '用于完善用户资料',
            success: resolve,
            fail: reject
          })
        })

        if (profileRes && profileRes.userInfo) {
          userInfo = {
            nickName: profileRes.userInfo.nickName,
            avatarUrl: profileRes.userInfo.avatarUrl
          }
          console.log('获取用户信息成功:', userInfo)
        }
      } catch (err) {
        console.log('用户拒绝授权或获取失败，将使用默认昵称:', err)
      }

      // 发送登录请求
      const requestData = {
        code: loginRes.code
      }

      if (userInfo) {
        requestData.userInfo = userInfo
      }

      console.log('发送微信登录请求，数据:', requestData)
      const apiRes = await post('/auth/wechat-login', requestData)
      console.log('微信登录响应:', apiRes)

      if (!apiRes || !apiRes.sessionToken) {
        console.error('登录响应中没有 sessionToken:', apiRes)
        wx.showToast({
          title: '登录失败，响应无效',
          icon: 'none'
        })
        this.setData({ wechatLoading: false })
        return
      }

      console.log('设置 token:', apiRes.sessionToken.substring(0, 20) + '...')
      const setTokenResult = app.setToken(apiRes.sessionToken)
      console.log('设置 token 结果:', setTokenResult)

      if (!setTokenResult) {
        console.error('设置 token 失败')
        wx.showToast({
          title: '登录失败，无法保存会话',
          icon: 'none'
        })
        this.setData({ wechatLoading: false })
        return
      }

      app.setUserInfo(apiRes.user)
      console.log('用户信息已设置:', apiRes.user)

      // 验证 token 是否保存成功
      const savedToken = app.getToken()
      console.log('验证保存的 token:', savedToken ? savedToken.substring(0, 20) + '...' : 'null')

      if (!savedToken) {
        console.error('Token 保存验证失败')
        wx.showToast({
          title: '登录失败，会话保存失败',
          icon: 'none'
        })
        this.setData({ wechatLoading: false })
        return
      }

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
    } catch (error) {
      console.error('微信登录失败:', error)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ wechatLoading: false })
    }
  }
})
