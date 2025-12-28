// pages/family/family.js
const app = getApp()

Page({
  data: {
    familyGroup: null,
    stats: null,
    showCreateDialog: false,
    showJoinDialog: false,
    showActionSheet: false,
    groupName: '',
    inviteCode: '',
    submitting: false,
    currentUser: null,
    copied: false
  },

  onLoad() {
    this.checkAuth()
  },

  onShow() {
    if (app.globalData.userInfo) {
      this.loadFamilyGroup()
    }
  },

  checkAuth() {
    if (!app.globalData.userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({
      currentUser: app.globalData.userInfo
    })
    this.loadFamilyGroup()
  },

  async loadFamilyGroup() {
    try {
      const res = await app.request({
        url: '/family-groups',
        method: 'GET'
      })

      if (res.success && res.data) {
        this.setData({
          familyGroup: res.data
        })
        await this.loadStats(res.data.id)
      } else {
        this.setData({
          familyGroup: null,
          stats: null
        })
      }
    } catch (error) {
      console.error('加载家庭组失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async loadStats(groupId) {
    try {
      const res = await app.request({
        url: `/family-groups/${groupId}/stats`,
        method: 'GET'
      })

      if (res.success) {
        this.setData({
          stats: res.data
        })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  showCreateModal() {
    this.setData({
      showCreateDialog: true,
      groupName: ''
    })
  },

  hideCreateModal() {
    this.setData({
      showCreateDialog: false,
      groupName: ''
    })
  },

  onGroupNameInput(e) {
    this.setData({
      groupName: e.detail.value
    })
  },

  async handleCreateGroup() {
    const { groupName } = this.data

    if (!groupName.trim()) {
      wx.showToast({
        title: '请输入家庭组名称',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    try {
      const res = await app.request({
        url: '/family-groups',
        method: 'POST',
        data: { name: groupName }
      })

      if (res.success) {
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        })
        this.setData({
          familyGroup: res.data,
          showCreateDialog: false,
          groupName: ''
        })
        await this.loadStats(res.data.id)
      } else {
        wx.showToast({
          title: res.error || '创建失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('创建家庭组失败:', error)
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  showJoinModal() {
    this.setData({
      showJoinDialog: true,
      inviteCode: ''
    })
  },

  hideJoinModal() {
    this.setData({
      showJoinDialog: false,
      inviteCode: ''
    })
  },

  onInviteCodeInput(e) {
    this.setData({
      inviteCode: e.detail.value.toUpperCase()
    })
  },

  async handleJoinGroup() {
    const { inviteCode } = this.data

    if (!inviteCode.trim()) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      })
      return
    }

    if (inviteCode.length !== 8) {
      wx.showToast({
        title: '邀请码格式不正确',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    try {
      const res = await app.request({
        url: `/family-groups/${inviteCode}/join`,
        method: 'POST'
      })

      if (res.success) {
        wx.showToast({
          title: '加入成功',
          icon: 'success'
        })
        this.setData({
          familyGroup: res.data,
          showJoinDialog: false,
          inviteCode: ''
        })
        await this.loadStats(res.data.id)
      } else {
        wx.showToast({
          title: res.error || '加入失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加入家庭组失败:', error)
      wx.showToast({
        title: '加入失败',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  copyInviteCode() {
    const { familyGroup } = this.data
    if (familyGroup && familyGroup.inviteCode) {
      wx.setClipboardData({
        data: familyGroup.inviteCode,
        success: () => {
          this.setData({ copied: true })
          wx.showToast({
            title: '邀请码已复制',
            icon: 'success'
          })
          setTimeout(() => {
            this.setData({ copied: false })
          }, 2000)
        }
      })
    }
  },

  showActions() {
    this.setData({
      showActionSheet: true
    })
  },

  hideActions() {
    this.setData({
      showActionSheet: false
    })
  },

  async handleLeave() {
    this.hideActions()

    wx.showModal({
      title: '确认退出',
      content: '退出后将无法查看该家庭组的共享账单，确定要继续吗？',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ submitting: true })

          try {
            const res = await app.request({
              url: `/family-groups/${this.data.familyGroup.id}/leave`,
              method: 'DELETE'
            })

            if (res.success) {
              wx.showToast({
                title: '已退出家庭组',
                icon: 'success'
              })
              this.setData({
                familyGroup: null,
                stats: null
              })
            } else {
              wx.showToast({
                title: res.error || '退出失败',
                icon: 'none'
              })
            }
          } catch (error) {
            console.error('退出家庭组失败:', error)
            wx.showToast({
              title: '退出失败',
              icon: 'none'
            })
          } finally {
            this.setData({ submitting: false })
          }
        }
      }
    })
  },

  async handleDissolve() {
    this.hideActions()

    wx.showModal({
      title: '确认解散',
      content: '解散后所有成员将被移除，此操作不可撤销，确定要继续吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ submitting: true })

          try {
            const res = await app.request({
              url: `/family-groups/${this.data.familyGroup.id}`,
              method: 'DELETE'
            })

            if (res.success) {
              wx.showToast({
                title: '家庭组已解散',
                icon: 'success'
              })
              this.setData({
                familyGroup: null,
                stats: null
              })
            } else {
              wx.showToast({
                title: res.error || '解散失败',
                icon: 'none'
              })
            }
          } catch (error) {
            console.error('解散家庭组失败:', error)
            wx.showToast({
              title: '解散失败',
              icon: 'none'
            })
          } finally {
            this.setData({ submitting: false })
          }
        }
      }
    })
  },

  navigateToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
})
