const app = getApp()
const { get } = require('../../utils/request.js')

Page({
  data: {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    incomeCategories: [],
    expenseCategories: [],
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

      console.log('获取到的统计数据:', res)
      console.log('收入分类:', res.incomeCategories)
      console.log('支出分类:', res.expenseCategories)

      this.setData({
        totalIncome: res.totalIncome || 0,
        totalExpense: res.totalExpense || 0,
        balance: res.balance || 0,
        incomeCategories: res.incomeCategories || [],
        expenseCategories: res.expenseCategories || []
      })

      console.log('页面data更新后:', {
        incomeCategories: this.data.incomeCategories,
        expenseCategories: this.data.expenseCategories
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  }
})
