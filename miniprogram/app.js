App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: 'https://www.love-haoran.cn/note/api',
    userInfoUpdateCallbacks: []
  },

  onLaunch() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')

    if (token) {
      this.globalData.token = token
    }

    if (userInfo) {
      this.globalData.userInfo = userInfo
    }

    this.wechatAutoLogin()
  },

  // 注册用户信息更新回调
  onUserInfoUpdate(callback) {
    this.globalData.userInfoUpdateCallbacks.push(callback)
  },

  // 移除用户信息更新回调
  offUserInfoUpdate(callback) {
    const index = this.globalData.userInfoUpdateCallbacks.indexOf(callback)
    if (index > -1) {
      this.globalData.userInfoUpdateCallbacks.splice(index, 1)
    }
  },

  // 触发用户信息更新
  notifyUserInfoUpdate(userInfo) {
    this.globalData.userInfoUpdateCallbacks.forEach(callback => {
      try {
        callback(userInfo)
      } catch (error) {
        console.error('执行用户信息更新回调失败:', error)
      }
    })
  },

  wechatAutoLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          const { post } = require('./utils/request.js')
          
          post('/auth/wechat-login', { code: res.code })
            .then(data => {
              this.setToken(data.sessionToken)
              this.setUserInfo(data.user)
              console.log('微信自动登录成功')
            })
            .catch(err => {
              console.log('微信自动登录失败，需要手动登录:', err)
            })
        }
      },
      fail: (err) => {
        console.log('wx.login 失败:', err)
      }
    })
  },

  setToken(token) {
    this.globalData.token = token
    wx.setStorageSync('token', token)
  },

  getToken() {
    return this.globalData.token || wx.getStorageSync('token')
  },

  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
  },

  getUserInfo() {
    return this.globalData.userInfo || wx.getStorageSync('userInfo')
  },

  clearAuth() {
    this.globalData.token = null
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  },

  checkLogin() {
    const token = this.getToken()
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }
      })
      return false
    }
    return true
  }
})
