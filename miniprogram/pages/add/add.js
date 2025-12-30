const app = getApp()
const { post, put, get } = require('../../utils/request.js')

Page({
  data: {
    transactionId: '',
    mode: 'create', // 'create' 或 'edit'
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
    hasParsed: false,
    // 语音识别相关
    recording: false,
    voiceProcessing: false,
    asrText: '',
    voiceError: null,
    recorderStarting: false // 录音启动中状态
  },

  onLoad(options) {
    if (!app.checkLogin()) {
      return
    }

    // 初始化录音相关属性
    this.recorderManager = null
    this.recordStartTime = 0
    this.recordTimer = null
    this.recordCancelled = false

    // 初始化录音管理器
    this.initRecorder()

    // 检查是否是编辑模式
    const { id, mode } = options
    if (id && mode === 'edit') {
      this.setData({
        transactionId: id,
        mode: 'edit'
      })
      this.loadTransaction(id)
    } else {
      this.initData()
    }
  },

  // 初始化录音管理器
  initRecorder() {
    this.recorderManager = wx.getRecorderManager()

    // 监听录音开始事件
    this.recorderManager.onStart(() => {
      console.log('[Voice] 录音开始，检查是否已取消:', this.recordCancelled)

      // 如果录音已被取消，不继续
      if (this.recordCancelled) {
        console.log('[Voice] 录音已被取消，忽略onStart')
        this.recordCancelled = false
        return
      }

      this.recordStartTime = Date.now()

      // 清除启动检测定时器
      if (this.recordTimer) {
        clearTimeout(this.recordTimer)
        this.recordTimer = null
      }

      this.setData({
        recording: true,
        recorderStarting: false,
        voiceError: null
      })
    })

    // 监听录音停止事件
    this.recorderManager.onStop((res) => {
      console.log('[Voice] 录音停止:', res)
      const { tempFilePath, duration } = res
      const durationSeconds = duration / 1000

      // 清除所有定时器
      if (this.recordTimer) {
        clearTimeout(this.recordTimer)
        this.recordTimer = null
      }

      // 检查录音时长（最短1秒，最长30秒）
      if (durationSeconds < 1) {
        wx.showToast({
          title: '录音时间太短（至少1秒）',
          icon: 'none',
          duration: 1500
        })
        this.setData({
          recording: false,
          recorderStarting: false
        })
        return
      }

      if (durationSeconds > 30) {
        wx.showToast({
          title: '录音时长过长',
          icon: 'none'
        })
        this.setData({
          recording: false,
          recorderStarting: false
        })
        return
      }

      // 处理录音文件
      this.handleAudioFile(tempFilePath)
    })

    // 监听录音错误事件
    this.recorderManager.onError((err) => {
      console.error('[Voice] 录音错误:', err)

      // 清除所有定时器
      if (this.recordTimer) {
        clearTimeout(this.recordTimer)
        this.recordTimer = null
      }

      this.setData({
        recording: false,
        recorderStarting: false,
        voiceError: '录音失败：' + (err.errMsg || '未知错误')
      })
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      })
    })
  },

  // 开始录音
  startRecording() {
    // 如果正在处理中、正在录音或正在启动录音，不响应
    if (this.data.voiceProcessing || this.data.recording || this.data.recorderStarting) {
      console.log('[Voice] 忽略开始录音:', {
        voiceProcessing: this.data.voiceProcessing,
        recording: this.data.recording,
        recorderStarting: this.data.recorderStarting
      })
      return
    }

    console.log('[Voice] 开始录音...')

    // 重置取消标志
    this.recordCancelled = false

    // 设置启动中状态
    this.setData({ recorderStarting: true })

    // 检查录音权限
    this.checkRecordPermission().then(() => {
      this.recorderManager.start({
        duration: 30000, // 最长30秒
        format: 'mp3',
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        frameSize: 50
      })

      // 设置超时检测：如果2秒后录音还没开始，取消录音并重置状态
      this.recordTimer = setTimeout(() => {
        console.log('[Voice] 录音启动超时，取消录音')
        // 设置取消标志，防止延迟的onStart触发
        this.recordCancelled = true
        this.setData({
          recorderStarting: false,
          recording: false
        })
        wx.showToast({
          title: '录音启动失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }, 2000)
    }).catch((err) => {
      console.error('[Voice] 权限检查失败:', err)
      this.setData({
        recorderStarting: false,
        recording: false
      })
      wx.showModal({
        title: '权限提示',
        content: '需要录音权限才能使用语音记账功能',
        confirmText: '去设置',
        success(res) {
          if (res.confirm) {
            wx.openSetting()
          }
        }
      })
    })
  },

  // 停止录音
  stopRecording() {
    console.log('[Voice] 停止录音被调用，当前状态:', {
      recording: this.data.recording,
      recorderStarting: this.data.recorderStarting
    })

    // 清除启动检测定时器
    if (this.recordTimer) {
      clearTimeout(this.recordTimer)
      this.recordTimer = null
    }

    if (this.data.recording) {
      // 正在录音中，停止录音
      console.log('[Voice] 停止录音（正常录音）')
      this.recorderManager.stop()
    } else if (this.data.recorderStarting) {
      // 录音正在启动，但还没真正开始
      console.log('[Voice] 录音正在启动，取消启动')

      // 设置取消标志，防止 onStart 触发
      this.recordCancelled = true

      this.setData({
        recorderStarting: false,
        recording: false
      })

      wx.showToast({
        title: '录音时间太短（至少1秒）',
        icon: 'none',
        duration: 1500
      })
    } else {
      // 没有录音在进行
      console.log('[Voice] 没有录音在进行')
    }
  },

  // 检查录音权限
  checkRecordPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record']) {
            resolve()
          } else {
            // 未授权，请求授权
            wx.authorize({
              scope: 'scope.record',
              success: () => resolve(),
              fail: () => reject(new Error('用户拒绝授权'))
            })
          }
        },
        fail: () => reject(new Error('获取设置失败'))
      })
    })
  },

  // 处理录音文件
  async handleAudioFile(tempFilePath) {
    this.setData({ voiceProcessing: true, recording: false })

    try {
      // 上传并解析
      const result = await this.parseTransactionByVoice(tempFilePath)

      if (result.success && result.transaction) {
        // 解析成功，填充表单
        const transaction = result.transaction
        const type = transaction.type

        this.setData({
          amount: transaction.amount,
          type,
          category: transaction.category,
          description: transaction.description || '',
          currentCategories: this.data.categories[type],
          date: this.formatDate(new Date(transaction.date || new Date())),
          hasParsed: true,
          asrText: result.asrText || '',
          voiceProcessing: false,
          voiceError: null
        })

        wx.showToast({
          title: '识别成功',
          icon: 'success'
        })
      } else {
        // 解析失败，显示识别文字供用户编辑
        this.setData({
          inputText: result.asrText || '',
          asrText: result.asrText || '',
          voiceProcessing: false,
          voiceError: result.error || null
        })

        if (result.asrText) {
          wx.showModal({
            title: '提示',
            content: `已识别文字：${result.asrText}\n但无法解析为账单，请手动编辑后重试`,
            showCancel: false
          })
        } else {
          wx.showToast({
            title: result.error || '识别失败',
            icon: 'none'
          })
        }
      }
    } catch (error) {
      console.error('[Voice] 处理失败:', error)
      this.setData({
        voiceProcessing: false,
        voiceError: error.message || '处理失败'
      })
      wx.showToast({
        title: '识别失败，请重试',
        icon: 'none'
      })
    }
  },

  // 通过语音解析交易
  parseTransactionByVoice(tempFilePath) {
    return new Promise((resolve, reject) => {
      const token = app.getToken()

      wx.uploadFile({
        url: `${app.globalData.baseUrl}/voice/parse-transaction`,
        filePath: tempFilePath,
        name: 'file',
        header: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (res.statusCode === 200 || res.statusCode === 201) {
              resolve(data)
            } else {
              reject(new Error(data.error || '上传失败'))
            }
          } catch (err) {
            reject(new Error('响应解析失败'))
          }
        },
        fail: (err) => {
          console.error('[Voice] 上传失败:', err)
          reject(new Error('网络错误，请检查网络连接'))
        }
      })
    })
  },

  // 重试语音识别
  retryVoiceRecognition() {
    if (this.data.asrText) {
      this.setData({ inputText: this.data.asrText, voiceError: null })
      this.onParse()
    }
  },

  initData() {
    const today = new Date()
    const dateStr = this.formatDate(today)
    this.setData({
      currentCategories: this.data.categories.EXPENSE,
      date: dateStr
    })
  },

  async loadTransaction(id) {
    wx.showLoading({ title: '加载中...' })

    try {
      const res = await get(`/transactions/${id}`)
      const transaction = res.data.data || res.data

      const type = transaction.type
      const dateObj = new Date(transaction.date)

      this.setData({
        amount: transaction.amount,
        type,
        category: transaction.category,
        description: transaction.description || '',
        date: this.formatDate(dateObj),
        currentCategories: this.data.categories[type]
      })
    } catch (error) {
      console.error('加载交易详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
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
    const { amount, type, category, description, date, inputText, hasParsed, mode, transactionId } = this.data

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

      const transactionData = {
        amount: parseFloat(currentData.amount),
        type: currentData.type,
        category: currentData.category,
        description: currentData.description,
        date: new Date(currentData.date)
      }

      if (mode === 'edit') {
        // 编辑模式：更新交易
        await put(`/transactions/${transactionId}`, transactionData)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        // 创建模式：新建交易
        await post('/transactions', transactionData)

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
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('保存失败:', error)
      wx.showToast({
        title: mode === 'edit' ? '更新失败' : '保存失败',
        icon: 'none'
      })
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
