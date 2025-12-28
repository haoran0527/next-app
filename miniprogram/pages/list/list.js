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
      const rawTransactions = res.transactions || []

      // 预处理交易数据，添加格式化的日期字段
      const newTransactions = rawTransactions.map(item => {
        console.log('处理交易数据:', item)
        const dateValue = item.date
        console.log('原始日期值:', dateValue, '类型:', typeof dateValue)

        let formattedDate = '--'
        let formattedTime = '--'
        let isTodayItem = false

        if (dateValue) {
          try {
            const date = new Date(dateValue)
            if (!isNaN(date.getTime())) {
              // 格式化日期：YYYY-MM-DD
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              formattedDate = `${year}-${month}-${day}`

              // 格式化时间：MM月DD日 HH:mm
              const hour = String(date.getHours()).padStart(2, '0')
              const minute = String(date.getMinutes()).padStart(2, '0')
              formattedTime = `${month}月${day}日 ${hour}:${minute}`

              // 判断是否是今天
              const today = new Date()
              isTodayItem = date.getFullYear() === today.getFullYear() &&
                           date.getMonth() === today.getMonth() &&
                           date.getDate() === today.getDate()
            }
          } catch (error) {
            console.error('日期解析错误:', error)
          }
        }

        return {
          ...item,
          formattedDate,  // 完整日期 YYYY-MM-DD
          formattedTime,  // 格式化时间 MM月DD日 HH:mm
          isToday: isTodayItem
        }
      })

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
