const app = getApp()
const { get } = require('../../utils/request.js')

Page({
  data: {
    stats: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0
    },
    monthlyStats: [],
    categoryStats: [],
    period: 'month',
    periods: ['本月', '本年'],
    loading: false
  },

  onLoad() {
    if (!app.checkLogin()) {
      return
    }
    this.loadStats()
  },

  onShow() {
    if (app.getToken()) {
      this.loadStats()
    }
  },

  onPeriodChange(e) {
    const index = e.detail.value
    this.setData({
      period: index === '0' ? 'month' : 'year'
    })
    this.loadStats()
  },

  async loadStats() {
    this.setData({ loading: true })

    try {
      const params = {}
      if (this.data.period === 'month') {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        params.startDate = `${year}-${month}-01`
        params.endDate = `${year}-${month}-31`
      } else {
        const now = new Date()
        const year = now.getFullYear()
        params.startDate = `${year}-01-01`
        params.endDate = `${year}-12-31`
      }

      const res = await get('/user/stats', params)
      
      this.setData({
        stats: {
          totalIncome: res.totalIncome || 0,
          totalExpense: res.totalExpense || 0,
          balance: res.balance || 0,
          transactionCount: res.transactionCount || 0
        }
      })

      this.loadCategoryStats(params)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadCategoryStats(params) {
    try {
      const res = await get('/user/stats', { ...params, groupBy: 'category' })
      this.setData({
        categoryStats: res.categoryStats || []
      })
    } catch (error) {
      console.error('加载分类统计失败:', error)
    }
  },

  getCategoryPercentage(amount) {
    const total = this.data.stats.totalExpense
    if (total === 0) return 0
    return ((amount / total) * 100).toFixed(1)
  }
})
