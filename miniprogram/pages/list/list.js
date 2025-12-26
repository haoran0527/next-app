const app = getApp()
const { get, delete: del } = require('../../utils/request.js')

function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  
  return { startDate, endDate }
}

function formatDateOnly(dateStr) {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isToday(dateStr) {
  const today = new Date()
  const date = new Date(dateStr)
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hour}:${minute}`
}

Page({
  data: {
    transactions: [],
    loading: false,
    filterType: 'ALL',
    filterTypes: ['全部', '收入', '支出'],
    startDate: '',
    endDate: '',
    page: 1,
    hasMore: true
  },

  onLoad() {
    if (!app.checkLogin()) {
      return
    }
    const { startDate, endDate } = getCurrentMonthRange()
    this.setData({ startDate, endDate })
    this.loadTransactions()
  },

  onShow() {
    if (app.getToken()) {
      this.setData({
        transactions: [],
        page: 1,
        hasMore: true
      })
      this.loadTransactions()
    }
  },

  onFilterTypeChange(e) {
    const index = e.detail.value
    const types = ['ALL', 'INCOME', 'EXPENSE']
    this.setData({
      filterType: types[index],
      transactions: [],
      page: 1,
      hasMore: true
    })
    this.loadTransactions()
  },

  onResetFilter() {
    this.setData({
      filterType: 'ALL',
      startDate: '',
      endDate: '',
      transactions: [],
      page: 1,
      hasMore: true
    })
    this.loadTransactions()
  },

  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value,
      transactions: [],
      page: 1,
      hasMore: true
    })
    this.loadTransactions()
  },

  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value,
      transactions: [],
      page: 1,
      hasMore: true
    })
    this.loadTransactions()
  },

  async loadTransactions() {
    if (this.data.loading || !this.data.hasMore) {
      return
    }

    this.setData({ loading: true })

    try {
      const params = {
        limit: 20,
        offset: (this.data.page - 1) * 20
      }

      if (this.data.filterType !== 'ALL') {
        params.type = this.data.filterType
      }

      if (this.data.startDate) {
        params.startDate = this.data.startDate
      }

      if (this.data.endDate) {
        params.endDate = this.data.endDate
      }

      const res = await get('/transactions', params)
      const newTransactions = res.transactions || res

      this.setData({
        transactions: [...this.data.transactions, ...newTransactions],
        hasMore: newTransactions.length >= 20,
        page: this.data.page + 1
      })
    } catch (error) {
      console.error('加载交易失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    this.loadTransactions()
  },

  onPullDownRefresh() {
    this.setData({
      transactions: [],
      page: 1,
      hasMore: true
    })
    this.loadTransactions().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  formatDate(dateStr) {
    return formatDateTime(dateStr)
  },

  formatDateOnly(dateStr) {
    return formatDateOnly(dateStr)
  },

  isToday(dateStr) {
    return isToday(dateStr)
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/transactions/${id}`)
            
            const transactions = this.data.transactions
            transactions.splice(index, 1)
            
            this.setData({ transactions })
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } catch (error) {
            console.error('删除失败:', error)
          }
        }
      }
    })
  }
})
