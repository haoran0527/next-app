const app = getApp()
const { post } = require('../../utils/request.js')

Page({
  data: {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    loading: false
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value })
  },

  async onRegister() {
    const { username, email, password, confirmPassword } = this.data
    
    if (!username || !email || !password) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      })
      return
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      await post('/auth/register', { 
        username, 
        email, 
        password 
      })

      wx.showToast({
        title: '注册成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('注册失败:', error)
    } finally {
      this.setData({ loading: false })
    }
  }
})
