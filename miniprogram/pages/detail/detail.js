const app = getApp()
const { get, put, delete: del } = require('../../utils/request.js')

Page({
  data: {
    transactionId: '',
    transaction: null,
    loading: false
  },

  onLoad(options) {
    if (!app.checkLogin()) {
      return
    }
    
    const { id } = options
    if (id) {
      this.setData({ transactionId: id })
      this.loadTransaction()
    }
  },

  async loadTransaction() {
    this.setData({ loading: true })

    try {
      const res = await get(`/transactions/${this.data.transactionId}`)
      const transaction = res.data || res
      this.setData({
        transaction: {
          ...transaction,
          formattedDate: this.formatDate(transaction.date),
          formattedCreatedAt: this.formatDate(transaction.createdAt)
        }
      })
    } catch (error) {
      console.error('加载交易详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  formatDate(dateStr) {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/transactions/${this.data.transactionId}`)
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })

            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (error) {
            console.error('删除失败:', error)
          }
        }
      }
    })
  }
})
