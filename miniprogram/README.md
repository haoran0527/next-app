# 智能记账微信小程序

基于 AI 的财务管理小程序，支持自然语言记账和智能分类。

## 项目信息

- **AppID**: wx3ef49ea1c22f2a66
- **密钥**: 1f1fc7f7b759511f42588cb6dde6368f
- **后端API**: http://localhost:3000/api

## 功能特性

### 1. 用户认证
- 用户注册
- 用户登录
- 自动登录状态保持
- 退出登录

### 2. 首页
- 显示当前余额
- 显示总收入和总支出
- 最近交易记录

### 3. AI智能记账
- 自然语言输入（如："今天花了50元买午饭"）
- AI自动解析金额、类型、分类
- 手动填写表单
- 支持收入和支出类型
- 多种分类选择
- 日期选择
- 备注功能

### 4. 交易明细
- 交易列表展示
- 按类型筛选（全部/收入/支出）
- 按日期范围筛选
- 下拉刷新
- 上拉加载更多
- 删除交易记录
- 查看交易详情

### 5. 统计分析
- 按月/按年统计
- 总收入、总支出、结余
- 交易笔数
- 支出分类统计
- 分类占比可视化

### 6. 个人中心
- 用户信息展示
- 个人统计数据
- 关于我们
- 退出登录

## 项目结构

```
miniprogram/
├── app.js                 # 小程序入口文件
├── app.json               # 小程序配置文件
├── app.wxss               # 全局样式文件
├── sitemap.json           # 站点地图配置
├── project.config.json    # 项目配置文件
├── pages/                 # 页面目录
│   ├── login/            # 登录页面
│   ├── register/         # 注册页面
│   ├── index/            # 首页
│   ├── add/              # 记账页面
│   ├── list/             # 交易明细页面
│   ├── detail/           # 交易详情页面
│   ├── stats/            # 统计页面
│   └── profile/          # 个人中心页面
├── utils/                # 工具类目录
│   └── request.js        # API请求封装
└── images/               # 图片资源目录
    └── README.md         # 图标说明
```

## 开发指南

### 1. 安装微信开发者工具

下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

### 2. 导入项目

1. 打开微信开发者工具
2. 选择"导入项目"
3. 填写项目信息：
   - 项目目录：选择 `miniprogram` 文件夹
   - AppID：使用测试号或填入 `wx3ef49ea1c22f2a66`
   - 项目名称：智能记账

### 3. 配置后端API

修改 `app.js` 中的 `baseUrl`：

```javascript
globalData: {
  userInfo: null,
  token: null,
  baseUrl: 'http://localhost:3000/api'  // 修改为你的后端API地址
}
```

### 4. 启动后端服务

确保后端服务正在运行：

```bash
cd d:\work\next
npm run dev
```

### 5. 运行小程序

在微信开发者工具中点击"编译"按钮即可运行小程序。

## API接口说明

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 交易相关
- `GET /api/transactions` - 获取交易列表
- `POST /api/transactions` - 创建交易
- `GET /api/transactions/:id` - 获取交易详情
- `PUT /api/transactions/:id` - 更新交易
- `DELETE /api/transactions/:id` - 删除交易

### AI智能解析
- `POST /api/agent/parse` - AI解析自然语言

### 统计相关
- `GET /api/user/stats` - 获取用户统计数据

## 注意事项

1. **网络请求域名**
   - 开发阶段：在开发者工具中勾选"不校验合法域名"
   - 生产环境：需要在微信公众平台配置服务器域名

2. **登录状态**
   - 使用 `wx.setStorageSync` 和 `wx.getStorageSync` 存储token
   - 每次请求自动携带 Authorization header

3. **错误处理**
   - 401错误自动跳转登录页
   - 网络错误显示提示信息

4. **数据格式**
   - 日期格式：YYYY-MM-DD
   - 金额：保留两位小数
   - 交易类型：INCOME（收入）/ EXPENSE（支出）

## 分类说明

### 收入分类
- 工资收入
- 奖金
- 投资收益
- 兼职收入
- 礼金
- 其他收入

### 支出分类
- 餐饮
- 交通
- 购物
- 娱乐
- 医疗
- 教育
- 房租
- 水电费
- 通讯费
- 保险
- 其他支出

## 部署上线

### 1. 代码上传
在微信开发者工具中点击"上传"按钮，填写版本号和备注。

### 2. 提交审核
在微信公众平台提交审核，等待审核通过。

### 3. 发布
审核通过后，点击"发布"按钮即可上线。

## 技术栈

- 微信小程序原生开发
- WXSS样式
- JavaScript ES6+
- 后端API：Next.js + Prisma + PostgreSQL

## 常见问题

### Q: 小程序无法连接后端？
A: 检查后端服务是否启动，确认 `baseUrl` 配置正确，开发阶段勾选"不校验合法域名"。

### Q: AI解析失败？
A: 检查后端 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL` 配置是否正确。

### Q: 登录后跳转失败？
A: 检查 `app.js` 中的 `checkLogin` 方法，确保token正确存储。

## 更新日志

### v1.0.0 (2025-12-25)
- 初始版本发布
- 实现用户登录注册
- 实现AI智能记账
- 实现交易明细和统计
- 实现个人中心

## 联系方式

如有问题，请联系开发团队。
