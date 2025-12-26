App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: 'https://www.love-haoran.cn/note/api'
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
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return false
    }
    return true
  }
})
