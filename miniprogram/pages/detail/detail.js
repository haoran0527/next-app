const app = getApp()
const { get, put, delete: del } = require('../../utils/request.js')

Page({
  data: {
    transactionId: '',
    transaction: null,
    loading: false,
    isEditing: false,
    // 编辑状态的数据
    editAmount: '',
    editType: 'EXPENSE',
    editCategory: '',
    editDescription: '',
    editDate: '',
    // 分类选项
    types: ['收入', '支出'],
    categories: {
      INCOME: ['工资收入', '奖金', '投资收益', '兼职收入', '礼金', '其他收入'],
      EXPENSE: ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '房租', '水电费', '通讯费', '保险', '其他支出']
    },
    currentCategories: [],
    today: ''
  },

  onLoad(options) {
    if (!app.checkLogin()) {
      return
    }

    // 设置今天的日期
    const today = this.formatDateForPicker(new Date())
    this.setData({ today })

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
      const transaction = res.data.data || res.data

      const dateObj = new Date(transaction.date)
      const dateStr = this.formatDateForPicker(dateObj)

      this.setData({
        transaction: {
          ...transaction,
          formattedDate: this.formatDate(transaction.date)
        },
        editAmount: transaction.amount,
        editType: transaction.type,
        editCategory: transaction.category,
        editDescription: transaction.description || '',
        editDate: dateStr,
        currentCategories: this.data.categories[transaction.type]
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
    if (!dateStr) return '--'

    const date = new Date(dateStr)

    // 检查是否为有效日期
    if (isNaN(date.getTime())) return '--'

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  formatDateForPicker(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 开始编辑
  onStartEdit() {
    this.setData({ isEditing: true })
  },

  // 取消编辑
  onCancelEdit() {
    const transaction = this.data.transaction
    const dateObj = new Date(transaction.date)

    this.setData({
      isEditing: false,
      editAmount: transaction.amount,
      editType: transaction.type,
      editCategory: transaction.category,
      editDescription: transaction.description || '',
      editDate: this.formatDateForPicker(dateObj),
      currentCategories: this.data.categories[transaction.type]
    })
  },

  // 保存编辑
  async onSaveEdit() {
    const { editAmount, editType, editCategory, editDate, editDescription, transactionId } = this.data

    // 验证
    if (!editAmount || parseFloat(editAmount) <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      })
      return
    }

    if (!editCategory) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      await put(`/transactions/${transactionId}`, {
        amount: parseFloat(editAmount),
        type: editType,
        category: editCategory,
        description: editDescription || null,
        date: new Date(editDate)
      })

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 重新加载数据
      await this.loadTransaction()

      this.setData({ isEditing: false })
    } catch (error) {
      console.error('保存失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 输入事件处理
  onAmountInput(e) {
    this.setData({ editAmount: e.detail.value })
  },

  onTypeChange(e) {
    const index = e.detail.value
    const type = index === '0' ? 'INCOME' : 'EXPENSE'
    this.setData({
      editType: type,
      currentCategories: this.data.categories[type],
      editCategory: '' // 重置分类
    })
  },

  onCategoryChange(e) {
    const index = e.detail.value
    const category = this.data.currentCategories[index]
    this.setData({ editCategory: category })
  },

  onDateChange(e) {
    this.setData({ editDate: e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ editDescription: e.detail.value })
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
