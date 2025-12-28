function request(options) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    const token = app.getToken()

    console.log('=== 请求开始 ===')
    console.log('URL:', `${app.globalData.baseUrl}${options.url}`)
    console.log('Method:', options.method || 'GET')
    console.log('Data:', options.data)
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'null')
    
    wx.request({
      url: `${app.globalData.baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success(res) {
        console.log('=== 请求响应 ===')
        console.log('Status Code:', res.statusCode)
        console.log('Response Data:', res.data)
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          console.error('401 未授权错误')
          wx.showToast({
            title: '登录已过期',
            icon: 'none'
          })
          app.clearAuth()
          wx.redirectTo({
            url: '/pages/login/login'
          })
          reject(res)
        } else {
          wx.showToast({
            title: res.data.message || '请求失败',
            icon: 'none'
          })
          reject(res)
        }
      },
      fail(err) {
        console.error('=== 请求失败 ===')
        console.error('Error:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

function get(url, data) {
  return request({ url, method: 'GET', data })
}

function post(url, data) {
  return request({ url, method: 'POST', data })
}

function put(url, data) {
  return request({ url, method: 'PUT', data })
}

function del(url, data) {
  return request({ url, method: 'DELETE', data })
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  delete: del
}
