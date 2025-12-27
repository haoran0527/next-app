const app = getApp()
const { get, post, put, del } = require('../../../utils/request.js')

Page({
  data: {
    models: [],
    loading: false,
    showAddModal: false,
    showEditModal: false,
    editingModel: null,
    formData: {
      name: '',
      baseUrl: '',
      apiKey: '',
      model: ''
    }
  },

  onLoad() {
    if (!app.checkLogin()) {
      return
    }
    this.loadModels()
  },

  onShow() {
    if (app.getToken()) {
      this.loadModels()
    }
  },

  // 加载模型列表
  async loadModels() {
    this.setData({ loading: true })

    try {
      const res = await get('/admin/ai-models')

      if (res.success) {
        this.setData({ models: res.data || [] })
      } else {
        wx.showToast({
          title: res.error || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载模型列表失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 显示添加模态框
  showAddDialog() {
    this.setData({
      showAddModal: true,
      formData: {
        name: '',
        baseUrl: '',
        apiKey: '',
        model: ''
      }
    })
  },

  // 隐藏添加模态框
  hideAddDialog() {
    this.setData({ showAddModal: false })
  },

  // 表单输入
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击事件冒泡到 modal-mask
  },

  // 提交添加
  async submitAdd() {
    const { name, baseUrl, apiKey, model } = this.data.formData

    if (!name || !baseUrl || !apiKey || !model) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    try {
      const res = await post('/admin/ai-models', {
        name,
        baseUrl,
        apiKey,
        model
      })

      if (res.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        this.hideAddDialog()
        this.loadModels()
      } else {
        wx.showToast({
          title: res.error || '添加失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('添加模型失败:', error)
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      })
    }
  },

  // 显示编辑模态框
  showEditDialog(e) {
    const { model } = e.currentTarget.dataset
    this.setData({
      showEditModal: true,
      editingModel: model,
      formData: {
        name: model.name,
        baseUrl: model.baseUrl,
        apiKey: '', // 不显示原有密钥
        model: model.model
      }
    })
  },

  // 隐藏编辑模态框
  hideEditDialog() {
    this.setData({
      showEditModal: false,
      editingModel: null
    })
  },

  // 提交编辑
  async submitEdit() {
    const { editingModel, formData } = this.data
    const { name, baseUrl, apiKey, model } = formData

    if (!name || !baseUrl || !model) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    try {
      const updateData = { name, baseUrl, model }
      // 只有填写了新密钥才更新
      if (apiKey) {
        updateData.apiKey = apiKey
      }

      const res = await put(`/admin/ai-models/${editingModel.id}`, updateData)

      if (res.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
        this.hideEditDialog()
        this.loadModels()
      } else {
        wx.showToast({
          title: res.error || '更新失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('更新模型失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  // 删除模型
  deleteModel(e) {
    const { model } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: `确定要删除模型"${model.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await del(`/admin/ai-models/${model.id}`)

            if (result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.loadModels()
            } else {
              wx.showToast({
                title: result.error || '删除失败',
                icon: 'none'
              })
            }
          } catch (error) {
            console.error('删除模型失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 激活模型
  async activateModel(e) {
    const { model } = e.currentTarget.dataset

    try {
      const res = await post(`/admin/ai-models/${model.id}/activate`, {})

      if (res.success) {
        wx.showToast({
          title: '切换成功',
          icon: 'success'
        })
        this.loadModels()
      } else {
        wx.showToast({
          title: res.error || '切换失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('激活模型失败:', error)
      wx.showToast({
        title: '切换失败',
        icon: 'none'
      })
    }
  }
})
