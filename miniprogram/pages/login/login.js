const app = getApp()
const { post } = require('../../utils/request.js')

Page({
  data: {
    username: '',
    password: '',
    loading: false
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
  }
})
