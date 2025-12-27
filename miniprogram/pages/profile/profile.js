const app = getApp()
const { post, get, put } = require('../../utils/request.js')

Page({
  data: {
    userInfo: null,
    stats: {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      transactionCount: 0
    },
    showEditNicknameDialog: false,
    editNickname: ''
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
  },

  onAIModels() {
    wx.navigateTo({
      url: '/pages/admin/ai-models/ai-models'
    })
  },

  onEditNickname() {
    this.setData({
      showEditNicknameDialog: true,
      editNickname: this.data.userInfo.nickname || ''
    })
  },

  stopPropagation() {
  },

  onNicknameInput(e) {
    this.setData({
      editNickname: e.detail.value
    })
  },

  closeEditNicknameDialog() {
    this.setData({
      showEditNicknameDialog: false,
      editNickname: ''
    })
  },

  async saveNickname() {
    const nickname = this.data.editNickname.trim()

    if (!nickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      })
      return
    }

    if (nickname.length > 50) {
      wx.showToast({
        title: '昵称长度不能超过50个字符',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      const res = await put('/user/nickname', { nickname })

      wx.hideLoading()

      if (res.success) {
        console.log('昵称修改成功，服务器返回的用户信息:', res.data)

        // 更新本地缓存的用户信息
        app.setUserInfo(res.data)
        console.log('已更新 app.setUserInfo，验证:', app.getUserInfo())

        // 通知所有页面更新用户信息
        app.notifyUserInfoUpdate(res.data)
        console.log('已通知所有页面更新用户信息')

        wx.showToast({
          title: '修改成功',
          icon: 'success'
        })

        this.setData({
          showEditNicknameDialog: false,
          editNickname: '',
          userInfo: res.data
        })
      } else {
        wx.showToast({
          title: res.error || '修改失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    }
  }
})
