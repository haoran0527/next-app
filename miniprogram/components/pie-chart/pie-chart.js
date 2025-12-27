Component({
  properties: {
    data: {
      type: Array,
      value: []
    },
    colors: {
      type: Array,
      value: ['#52c41a', '#73d13d', '#95de64', '#b7eb8f', '#d9f7be']
    }
  },

  data: {
    canvasId: 'pie-chart'
  },

  lifetimes: {
    attached() {
      console.log('饼图组件 attached')
      const canvasId = `pie-chart-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      this.setData({ canvasId })
    },

    ready() {
      console.log('饼图组件 ready, data:', this.data.data)
      // 延迟绘制，确保DOM已渲染
      setTimeout(() => {
        this.drawChart()
      }, 200)
    }
  },

  observers: {
    'data': function(newVal) {
      console.log('数据变化:', newVal)
      if (newVal && newVal.length > 0) {
        setTimeout(() => {
          this.drawChart()
        }, 100)
      }
    }
  },

  methods: {
    drawChart() {
      const data = this.data.data
      const colors = this.data.colors

      if (!data || data.length === 0) {
        console.log('没有数据，跳过绘制')
        return
      }

      console.log('开始绘制饼图', { data, colors, canvasId: this.data.canvasId })

      // 使用旧版Canvas API
      const ctx = wx.createCanvasContext(this.data.canvasId, this)
      console.log('Canvas上下文:', ctx)

      if (!ctx) {
        console.error('无法获取Canvas上下文')
        return
      }

      // 设置绘制尺寸
      const size = 350
      const centerX = size / 2
      const centerY = size / 2
      const radius = size / 2 - 20

      console.log('Canvas配置', { centerX, centerY, radius })

      // 绘制饼图
      this.drawPie(ctx, centerX, centerY, radius, data, colors)

      // 必须调用draw才能渲染
      ctx.draw()
    },

    drawPie(ctx, centerX, centerY, radius, data, colors) {
      console.log('开始drawPie', { centerX, centerY, radius, dataLength: data.length })

      // 先清除画布
      ctx.clearRect(0, 0, 1000, 1000)

      // 先测试：绘制一个简单的圆形
      try {
        ctx.beginPath()
        console.log('1. beginPath完成')
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        console.log('2. arc完成')
        ctx.setFillStyle('#52c41a')
        console.log('3. setFillStyle完成')
        ctx.fill()
        console.log('4. fill完成，测试圆绘制完成')
      } catch (e) {
        console.error('绘制测试圆出错:', e)
      }

      // 如果有数据，绘制饼图
      if (!data || data.length === 0) {
        console.log('没有数据，只显示测试圆')
        return
      }

      // 计算总和
      const total = data.reduce((sum, item) => sum + Number(item.total || 0), 0)
      console.log('饼图数据', { total, data, radius })

      if (total === 0) {
        // 空数据绘制灰色圆圈
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        ctx.setFillStyle('#f0f0f0')
        ctx.fill()
        return
      }

      // 绘制饼图扇形
      let startAngle = -0.5 * Math.PI // 从顶部开始

      data.forEach((item, index) => {
        const amount = Number(item.total || 0)
        const percentage = amount / total
        const endAngle = startAngle + percentage * 2 * Math.PI
        const color = colors[index % colors.length]

        console.log(`绘制扇形 ${index}:`, { amount, percentage, startAngle, endAngle, color })

        // 绘制扇形
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, endAngle)
        ctx.closePath()
        ctx.setFillStyle(color)
        ctx.fill()

        startAngle = endAngle
      })

      // 绘制中心白色圆圈（实现环形效果）
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI)
      ctx.setFillStyle('#ffffff')
      ctx.fill()

      console.log('饼图绘制完成')
    }
  }
})
