const app = getApp()
const { post } = require('../../utils/request.js')

Page({
  data: {
    inputText: '',
    type: 'EXPENSE',
    amount: '',
    category: '',
    description: '',
    date: '',
    categories: {
      INCOME: ['工资收入', '奖金', '投资收益', '兼职收入', '礼金', '其他收入'],
      EXPENSE: ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '房租', '水电费', '通讯费', '保险', '其他支出']
    },
    currentCategories: [],
    showCategoryPicker: false,
    showDatePicker: false,
    showTypePicker: false,
    types: ['收入', '支出'],
    parsing: false,
    hasParsed: false
  },

  onLoad() {
    if (!app.checkLogin()) {
      return
    }
    this.initData()
  },

  initData() {
    const today = new Date()
    const dateStr = this.formatDate(today)
    this.setData({
      currentCategories: this.data.categories.EXPENSE,
      date: dateStr
    })
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  onInputChange(e) {
    this.setData({ 
      inputText: e.detail.value,
      hasParsed: false
    })
  },

  onTypeChange(e) {
    const index = e.detail.value
    const type = index === '0' ? 'INCOME' : 'EXPENSE'
    this.setData({
      type,
      currentCategories: this.data.categories[type],
      category: ''
    })
  },

  onTypeSelect(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      type,
      currentCategories: this.data.categories[type],
      category: ''
    })
  },

  onCategoryChange(e) {
    const index = e.detail.value
    const category = this.data.currentCategories[index]
    this.setData({ category })
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value })
  },

  onAmountInput(e) {
    this.setData({ amount: e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value })
  },

  async onParse() {
    const { inputText } = this.data
    
    if (!inputText.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    this.setData({ parsing: true })

    try {
      const res = await post('/agent/parse', { input: inputText })
      
      if (res.success && res.transaction) {
        const transaction = res.transaction
        const type = transaction.type
        this.setData({
          amount: transaction.amount,
          type,
          category: transaction.category,
          description: transaction.description || '',
          currentCategories: this.data.categories[type],
          date: this.formatDate(new Date(transaction.date || new Date())),
          hasParsed: true
        })

        wx.showToast({
          title: '解析成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.error || '解析失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('AI解析失败:', error)
      wx.showToast({
        title: '解析失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ parsing: false })
    }
  },

  async onSave() {
    const { amount, type, category, description, date, inputText, hasParsed } = this.data
    
    try {
      if (inputText.trim() && !hasParsed) {
        await this.onParse()
      }
      
      const currentData = this.data
      
      if (!currentData.amount || parseFloat(currentData.amount) <= 0) {
        wx.showToast({
          title: '请输入有效金额',
          icon: 'none'
        })
        return
      }

      if (!currentData.category) {
        wx.showToast({
          title: '请选择分类',
          icon: 'none'
        })
        return
      }

      await post('/transactions', {
        amount: parseFloat(currentData.amount),
        type: currentData.type,
        category: currentData.category,
        description: currentData.description,
        date: new Date(currentData.date)
      })

      this.setData({
        inputText: '',
        amount: '',
        category: '',
        description: '',
        date: this.formatDate(new Date()),
        hasParsed: false
      })

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
    } catch (error) {
      console.error('保存失败:', error)
    }
  },

  onReset() {
    this.setData({
      inputText: '',
      amount: '',
      category: '',
      description: '',
      date: this.formatDate(new Date())
    })
  }
})
