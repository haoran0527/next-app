# 401 认证问题调试指南

## 问题描述
微信登录后，进入首页调用 `https://www.love-haoran.cn/note/api/user/stats` 时返回 401 错误，然后退出到登录页面。

## 已添加的调试日志

### 小程序端（miniprogram/）

#### 1. app.js - Token 管理
- `app.setToken()` - 设置 token 时的日志
- `app.getToken()` - 获取 token 时的日志

#### 2. utils/request.js - HTTP 请求
- 请求开始时的详细信息（URL、Method、Data、Token）
- 请求响应的状态码和数据
- 401 错误时的日志
- 请求失败时的错误日志

#### 3. pages/login/login.js - 微信登录
- 发送微信登录请求的数据
- 微信登录响应数据
- 设置 token 的过程和结果
- 验证 token 保存是否成功

### 后端端（src/）

#### 1. lib/middleware/auth-middleware.ts - 认证中间件
- 认证中间件开始时的请求信息
- Authorization header 的值
- Cookie header 的值
- Token 提取的过程
- 会话验证的结果
- 认证成功/失败的日志

#### 2. lib/services/session-service.ts - 会话服务
- 验证会话时的 token 值
- 会话查找结果
- 会话过期检查
- 用户状态检查
- 会话验证成功/失败的日志

## 调试步骤

### 1. 启动后端服务
```bash
npm run dev
```

### 2. 打开微信开发者工具
- 导入 `miniprogram` 目录
- 打开调试控制台（Console 面板）

### 3. 执行微信登录
1. 点击"微信登录"按钮
2. 观察控制台输出，查找以下日志：

**小程序端期望看到的日志：**
```
发送微信登录请求，数据: {code: "...", userInfo: {...}}
=== 请求开始 ===
URL: https://www.love-haoran.cn/note/api/auth/wechat-login
Method: POST
Data: {code: "...", userInfo: {...}}
Token: null
=== 请求响应 ===
Status Code: 200
Response Data: {success: true, sessionToken: "...", user: {...}}
微信登录响应: {success: true, sessionToken: "...", user: {...}}
设置 token: a1b2c3d4e5f6g7h8i9j0...
token 已保存到 storage
设置 token 结果: true
用户信息已设置: {...}
验证保存的 token: a1b2c3d4e5f6g7h8i9j0...
```

**后端期望看到的日志：**
```
=== 认证中间件开始 ===
请求 URL: https://www.love-haoran.cn/note/api/auth/wechat-login
请求方法: POST
Authorization header: null
Cookie header: null
未找到任何 token
认证失败：未提供认证令牌
```
（注：登录接口不需要认证，所以这是正常的）

### 4. 进入首页
登录成功后，会自动跳转到首页。观察控制台输出：

**小程序端期望看到的日志：**
```
首页 onShow 触发
app.getToken 返回: a1b2c3d4e5f6g7h8i9j0...
=== 请求开始 ===
URL: https://www.love-haoran.cn/note/api/user/stats
Method: GET
Data: {}
Token: a1b2c3d4e5f6g7h8i9j0...
```

**后端期望看到的日志：**
```
=== 认证中间件开始 ===
请求 URL: https://www.love-haoran.cn/note/api/user/stats
请求方法: GET
Authorization header: Bearer a1b2c3d4e5f6g7h8i9j0...
从 Authorization header 提取 token: a1b2c3d4e5f6g7h8i9j0...
开始验证会话...
=== 验证会话 ===
Token: a1b2c3d4e5f6g7h8i9j0...
找到会话，用户ID: ...
用户状态正常，用户名: ...
会话验证成功
会话验证成功，用户名: ...
认证成功
```

## 可能的问题和解决方案

### 问题 1：Token 未保存到 Storage
**症状：**
- 小程序端显示 `token 已保存到 storage`
- 但后续请求时 `app.getToken 返回: null`

**解决方案：**
检查微信开发者工具的 Storage 面板，确认 token 是否真的保存成功。

### 问题 2：Token 格式不正确
**症状：**
- 小程序端发送了 token
- 后端收到的是 null 或格式错误

**解决方案：**
检查 `utils/request.js` 中的 header 设置，确保格式为 `Bearer ${token}`

### 问题 3：会话未创建或已过期
**症状：**
- 后端日志显示 `会话未找到` 或 `会话已过期`

**解决方案：**
检查数据库中的 `Session` 表，确认会话是否正确创建且未过期。

### 问题 4：用户被禁用
**症状：**
- 后端日志显示 `用户已被禁用`

**解决方案：**
检查数据库中的 `User` 表，确认 `isActive` 字段为 true。

### 问题 5：跨域问题
**症状：**
- 请求失败，网络错误

**解决方案：**
检查 `miniprogram/project.config.json` 中的 `urlCheck` 设置，确保为 `false`。

## 常见错误信息

### 401 - 未提供认证令牌
- 原因：请求中没有包含 token
- 检查：小程序端是否正确保存和发送 token

### 401 - 会话无效或已过期
- 原因：token 无效或已过期
- 检查：数据库中的会话记录是否存在且未过期

### 403 - 权限不足
- 原因：用户角色没有访问权限
- 检查：用户的 role 字段是否正确

## 如何查看日志

### 小程序端
1. 打开微信开发者工具
2. 点击底部的"调试器"按钮
3. 切换到 "Console" 面板
4. 执行操作，观察日志输出

### 后端端
1. 在运行 `npm run dev` 的终端中
2. 直接查看输出的日志信息

## 下一步

根据调试日志的结果，确定具体的问题原因，然后采取相应的解决方案。

如果问题仍然存在，请提供：
1. 小程序端的完整日志
2. 后端的完整日志
3. 数据库中 Session 表的相关记录
