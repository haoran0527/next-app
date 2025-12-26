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

  async onWechatLogin(e) {
    const { wechatLoading } = this.data

    if (wechatLoading) {
      return
    }

    this.setData({ wechatLoading: true })

    try {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              const loginRes = await post('/auth/wechat-login', { 
                code: res.code,
                userInfo: e.detail.userInfo 
              })
              
              app.setToken(loginRes.sessionToken)
              app.setUserInfo(loginRes.user)

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
            }
          } else {
            wx.showToast({
              title: '获取登录凭证失败',
              icon: 'none'
            })
          }
          this.setData({ wechatLoading: false })
        },
        fail: (err) => {
          console.error('wx.login 失败:', err)
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          })
          this.setData({ wechatLoading: false })
        }
      })
    } catch (error) {
      console.error('微信登录错误:', error)
      this.setData({ wechatLoading: false })
    }
  }
})
