const app = getApp()
const { post, get } = require('../../utils/request.js')

Page({
  data: {
    userInfo: null,
    stats: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0
    }
  },

  onLoad() {
    if (!app.checkLogin()) {
      return
    }
    this.loadUserInfo()
    this.loadStats()
  },

  onShow() {
    if (app.getToken()) {
      this.loadUserInfo()
      this.loadStats()
    }
  },

  loadUserInfo() {
    const userInfo = app.getUserInfo()
    this.setData({ userInfo })
  },

  async loadStats() {
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
    }
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.clearAuth()
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于智能记账',
      content: '智能记账是一款基于AI的财务管理小程序，帮助您轻松记录和分析收支情况。',
      showCancel: false
    })
  }
})
