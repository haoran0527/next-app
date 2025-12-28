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
    console.log('app.setToken 被调用，token:', token ? token.substring(0, 20) + '...' : 'null')
    this.globalData.token = token
    try {
      wx.setStorageSync('token', token)
      console.log('token 已保存到 storage')
      return true
    } catch (error) {
      console.error('保存 token 到 storage 失败:', error)
      return false
    }
  },

  getToken() {
    const token = this.globalData.token || wx.getStorageSync('token')
    console.log('app.getToken 返回:', token ? token.substring(0, 20) + '...' : 'null')
    return token
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
  },

  // 封装请求方法，供页面使用
  request(options) {
    const { request } = require('./utils/request.js')
    return request(options)
  },

  // 便捷方法
  get(url, data) {
    return this.request({ url, method: 'GET', data })
  },

  post(url, data) {
    return this.request({ url, method: 'POST', data })
  },

  put(url, data) {
    return this.request({ url, method: 'PUT', data })
  },

  delete(url, data) {
    return this.request({ url, method: 'DELETE', data })
  }
})
