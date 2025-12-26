# 微信小程序自动登录功能说明

## 功能概述

微信小程序实现了自动登录功能，用户无需手动输入用户名和密码，可以直接使用微信账号登录系统。

## 实现原理

### 1. 微信账号与系统账号映射

- 在数据库 `users` 表中添加了 `wechatOpenId` 字段，用于存储微信用户的唯一标识
- 每个微信账号对应一个系统账号，通过 `wechatOpenId` 建立映射关系

### 2. 自动登录流程

#### 首次使用（未注册）
1. 小程序启动时调用 `wx.login()` 获取临时登录凭证 `code`
2. 将 `code` 发送到后端 `/api/auth/wechat-login` 接口
3. 后端使用 `code` 向微信服务器换取 `openid`
4. 查询数据库，如果该 `openid` 不存在，自动创建新用户
5. 生成系统会话 token，返回给小程序
6. 小程序保存 token 和用户信息，完成自动登录

#### 再次使用（已注册）
1. 小程序启动时调用 `wx.login()` 获取临时登录凭证 `code`
2. 将 `code` 发送到后端 `/api/auth/wechat-login` 接口
3. 后端使用 `code` 向微信服务器换取 `openid`
4. 查询数据库，找到对应的用户
5. 生成系统会话 token，返回给小程序
6. 小程序保存 token 和用户信息，完成自动登录

### 3. 手动登录

用户也可以在登录页面选择：
- 使用用户名/密码登录
- 使用微信快速登录按钮

## 配置说明

### 1. 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# 微信小程序配置
WECHAT_MINI_APP_ID="your-wechat-mini-app-id"
WECHAT_MINI_APP_SECRET="your-wechat-mini-app-secret"
```

### 2. 获取微信小程序 AppID 和 AppSecret

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 复制 `AppID` 和 `AppSecret`
4. 将这两个值填入 `.env` 文件

## 数据库变更

### Schema 变更

在 `prisma/schema.prisma` 中添加了 `wechatOpenId` 字段：

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  password     String
  role         Role     @default(USER)
  isActive     Boolean  @default(true)
  wechatOpenId String?  @unique  // 新增字段
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // 关联关系
  transactions Transaction[]
  sessions     Session[]
  
  @@map("users")
}
```

### 数据库迁移

运行以下命令应用数据库变更：

```bash
npx prisma migrate dev --name add_wechat_openid
```

## API 接口

### 微信登录接口

**请求地址**: `POST /api/auth/wechat-login`

**请求参数**:
```json
{
  "code": "wx_login_code",
  "userInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "用户头像URL"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "sessionToken": "session_token_here",
  "user": {
    "id": "user_id",
    "email": "user_email",
    "username": "username",
    "role": "USER"
  }
}
```

## 小程序代码变更

### 1. app.js

添加了 `wechatAutoLogin()` 方法，在应用启动时自动调用微信登录。

### 2. pages/login/login.js

添加了 `onWechatLogin()` 方法，支持用户手动点击微信登录按钮。

### 3. pages/login/login.wxml

添加了微信快速登录按钮。

### 4. pages/login/login.wxss

添加了微信登录按钮的样式。

## 安全性考虑

1. **临时凭证**: `wx.login()` 返回的 `code` 只能使用一次，有效期为 5 分钟
2. **会话管理**: 后端创建的会话 token 有效期为 7 天
3. **自动创建用户**: 新用户自动创建时，密码为随机字符串，不会暴露给用户
4. **openid 唯一性**: 数据库中 `wechatOpenId` 字段设置为唯一，确保一个微信账号只能对应一个系统账号

## 使用说明

### 用户端

1. 打开小程序，系统会自动尝试使用微信账号登录
2. 如果自动登录失败，可以进入登录页面，点击"微信快速登录"按钮
3. 首次使用会自动创建账号，无需注册

### 开发者端

1. 配置微信小程序的 AppID 和 AppSecret
2. 运行数据库迁移命令
3. 部署后端代码
4. 上传小程序代码并发布

## 注意事项

1. 微信小程序必须配置服务器域名白名单
2. 后端服务器必须支持 HTTPS（微信小程序要求）
3. `.env` 文件中的 AppSecret 是敏感信息，不要提交到代码仓库
4. 自动创建的用户无法使用用户名/密码登录，只能使用微信登录

## 故障排查

### 自动登录失败

1. 检查网络连接
2. 检查后端服务器是否正常运行
3. 检查微信小程序配置是否正确
4. 查看小程序控制台日志

### 无法获取 openid

1. 检查 AppID 和 AppSecret 是否正确
2. 检查微信服务器是否正常
3. 查看后端服务器日志

### 会话过期

1. 会话 token 有效期为 7 天
2. 过期后需要重新登录
3. 可以在 `src/app/api/auth/wechat-login/route.ts` 中修改 `maxAge` 参数调整有效期
