# 微信小程序调试指南

## 推荐安装的 VS Code 插件

### 1. 微信小程序官方插件
- **wechatdevteam.vscode-wxml** - WXML 语法高亮和智能提示
- **wechatdevteam.vscode-wechat** - 微信小程序开发工具集成

### 2. 代码质量插件
- **esbenp.prettier-vscode** - 代码格式化
- **dbaeumer.vscode-eslint** - JavaScript/TypeScript 代码检查
- **bradlc.vscode-tailwindcss** - Tailwind CSS 智能提示

## 安装插件

在 VS Code 中按 `Ctrl+Shift+X` 打开扩展面板，搜索并安装上述插件。

## 调试步骤

### 方式一：使用微信开发者工具（推荐）

1. **安装微信开发者工具**
   - 下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

2. **打开项目**
   - 启动微信开发者工具
   - 选择"小程序项目"
   - 导入项目，选择 `miniprogram` 目录
   - AppID 使用你的测试号或正式 AppID

3. **调试功能**
   - **断点调试**：在 JS 文件中设置断点
   - **Console 面板**：查看日志和执行代码
   - **Network 面板**：监控网络请求
   - **Storage 面板**：查看本地存储
   - **AppData 面板**：查看页面数据状态

### 方式二：使用 VS Code 调试

1. **启动开发服务器**
   - 按 `Ctrl+Shift+P` 打开命令面板
   - 输入 "Tasks: Run Task"
   - 选择 "启动 Next.js 开发服务器"

2. **启动调试**
   - 按 `F5` 或点击调试面板的"开始调试"
   - 选择 "微信小程序调试" 配置

## 调试技巧

### 1. 使用 console.log
```javascript
console.log('调试信息', data)
console.warn('警告信息')
console.error('错误信息')
```

### 2. 使用 debugger
```javascript
function test() {
  debugger // 程序会在此处暂停
  const result = calculate()
  return result
}
```

### 3. 查看网络请求
在微信开发者工具的 Network 面板中：
- 查看 API 请求和响应
- 检查请求头和响应头
- 分析请求耗时

### 4. 调试样式
- 在 Elements 面板中查看和修改样式
- 实时预览样式变化
- 检查盒模型

### 5. 调试数据状态
- 在 AppData 面板中查看页面数据
- 修改数据实时预览效果
- 检查数据绑定是否正确

## 常见问题

### 1. 网络请求失败
- 检查 `project.config.json` 中的 `urlCheck` 设置
- 在开发者工具中关闭"不校验合法域名"
- 确保后端服务正在运行

### 2. 样式不生效
- 检查 WXSS 文件是否正确引入
- 确认样式选择器是否正确
- 使用 !important 临时测试

### 3. 页面跳转失败
- 检查 `app.json` 中是否注册了页面路径
- 确认跳转路径是否正确
- 检查 tabBar 配置

### 4. 数据不更新
- 检查是否使用了 `this.setData()`
- 确认数据路径是否正确
- 查看是否有语法错误

## 最佳实践

1. **使用版本控制**
   - 定期提交代码
   - 使用有意义的提交信息

2. **代码格式化**
   - 使用 Prettier 统一代码风格
   - 保存时自动格式化

3. **代码检查**
   - 使用 ESLint 检查代码质量
   - 修复所有警告和错误

4. **测试**
   - 编写单元测试
   - 在真机上测试
   - 测试不同场景和边界情况

5. **性能优化**
   - 减少网络请求次数
   - 使用缓存
   - 优化图片大小

## 快捷键

### 微信开发者工具
- `Ctrl+B` - 切换侧边栏
- `Ctrl+Shift+I` - 打开开发者工具
- `Ctrl+S` - 保存文件
- `Ctrl+R` - 刷新页面

### VS Code
- `F5` - 开始调试
- `F9` - 切换断点
- `F10` - 单步跳过
- `F11` - 单步进入
- `Shift+F11` - 单步跳出
- `Ctrl+Shift+P` - 打开命令面板
