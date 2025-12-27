const app = getApp()
const { get } = require('../../utils/request.js')

Page({
  data: {
    userInfo: null,
    stats: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0
    },
    recentTransactions: [],
    loading: false
  },

  onLoad() {
    if (!app.checkLogin()) {
      return
    }

    // 注册用户信息更新回调
    app.onUserInfoUpdate(this.onUserInfoUpdate)

    this.loadUserInfo()
    this.loadStats()
    this.loadRecentTransactions()
  },

  onUnload() {
    // 移除用户信息更新回调
    app.offUserInfoUpdate(this.onUserInfoUpdate)
  },

  onShow() {
    if (app.getToken()) {
      console.log('首页 onShow 触发')
      this.loadUserInfo()
      this.loadStats()
      this.loadRecentTransactions()
    }
  },

  // 用户信息更新回调
  onUserInfoUpdate(userInfo) {
    console.log('首页收到用户信息更新通知:', userInfo)
    this.setData({ userInfo })
  },

  loadUserInfo() {
    const userInfo = app.getUserInfo()
    console.log('首页 loadUserInfo 获取到的用户信息:', userInfo)
    this.setData({ userInfo })
  },

  async loadStats() {
    this.setData({ loading: true })
    
    try {
      const res = await get('/user/stats')
      this.setData({
        stats: {
          totalIncome: res.totalIncome || 0,
          totalExpense: res.totalExpense || 0,
          balance: res.balance || 0,
          transactionCount: res.transactionCount || 0
        }
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadRecentTransactions() {
    try {
      const res = await get('/transactions', { limit: 5 })
      this.setData({
        recentTransactions: res.transactions || res
      })
    } catch (error) {
      console.error('加载最近交易失败:', error)
    }
  },

  formatAmount(amount) {
    return parseFloat(amount).toFixed(2)
  },

  formatDate(dateStr) {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  goToStats() {
    wx.switchTab({
      url: '/pages/stats/stats'
    })
  }
})
