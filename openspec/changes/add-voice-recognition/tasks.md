# Implementation Tasks

## 1. Environment Setup and Configuration
- [x] 1.1 �?`.env` 文件中添加千问ASR API配置
  - `QWEN_ASR_API_KEY=sk-ffbecec954ed41538147c4180e90fd8b`
  - `QWEN_ASR_FILE_TRANS_URL=https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription`
- [x] 1.2 创建临时文件存储目录 `/tmp/voice`（如果不存在�?
- [x] 1.3 验证ASR API密钥有效性（调用测试接口�?

## 2. Backend - ASR Service Layer
- [x] 2.1 创建 `src/lib/services/asr-service.ts`
- [x] 2.2 实现 `transcribeAudioFile(filePath, format)` 函数
- [x] 2.3 实现千问ASR API调用逻辑（HTTP POST multipart/form-data�?
- [x] 2.4 实现响应解析和错误处�?
- [x] 2.5 添加 TypeScript 类型定义（ASRResult, ASRError�?
- [x] 2.6 添加日志记录（API调用时长、响应状态）
- [x] 2.7 编写单元测试（mock ASR API响应�?

## 3. Backend - Temporary File Management
- [x] 3.1 创建 `src/lib/utils/file-utils.ts`（如果不存在�?
- [x] 3.2 实现 `generateFileId()` 函数（生成随机文件ID�?
- [x] 3.3 实现 `cleanupTempFile(filePath, success)` 函数
- [x] 3.4 实现 `cleanupExpiredTempFiles()` 定时清理函数
- [x] 3.5 �?`src/app/api/voice/` 创建定时任务入口（使�?node-cron�?

## 4. Backend - API Routes
- [x] 4.1 创建 `src/app/api/voice/upload/route.ts`
  - [x] 4.1.1 实现 multipart/form-data 文件接收
  - [x] 4.1.2 验证文件格式（mp3）和大小（最�?MB�?
  - [x] 4.1.3 保存�?`/tmp/voice/{fileId}.mp3`
  - [x] 4.1.4 返回 `{ fileId, tempPath }`
  - [x] 4.1.5 添加认证中间�?

- [x] 4.2 创建 `src/app/api/voice/asr/route.ts`
  - [x] 4.2.1 接收 `{ fileId, tempPath }` 参数
  - [x] 4.2.2 调用 `asr-service.transcribeAudioFile()`
  - [x] 4.2.3 识别成功后删除临时文�?
  - [x] 4.2.4 返回 `{ text, duration, success }`
  - [x] 4.2.5 添加错误处理和降级逻辑

- [x] 4.3 创建 `src/app/api/voice/parse-transaction/route.ts`
  - [x] 4.3.1 实现 multipart/form-data 文件接收
  - [x] 4.3.2 内部调用 upload �?asr �?AI解析
  - [x] 4.3.3 复用 `agent-service.parseNaturalLanguageToTransaction()`
  - [x] 4.3.4 返回 `{ success, transaction?, asrText?, error? }`
  - [x] 4.3.5 添加认证中间�?
  - [x] 4.3.6 添加请求日志记录

## 5. Miniprogram - Recording Logic
- [x] 5.1 修改 `miniprogram/pages/add/add.js`
- [x] 5.2 添加 `RecorderManager` 初始化代�?
- [x] 5.3 实现 `startRecording()` 函数（touchstart触发�?
- [x] 5.4 实现 `stopRecording()` 函数（touchend触发�?
- [x] 5.5 添加录音时长检查（最�?秒，最�?0秒）
- [x] 5.6 实现 `uploadAudioFile(tempFilePath)` 函数
- [x] 5.7 实现 `parseTransactionByVoice(audioFileId)` 函数
- [x] 5.8 添加错误处理（权限拒绝、网络错误、ASR失败�?
- [x] 5.9 添加识别文字预览（AI解析失败时显示）

## 6. Miniprogram - UI Components
- [x] 6.1 修改 `miniprogram/pages/add/add.wxml`
- [x] 6.2 添加麦克风按�?`<view class="mic-button">`
- [x] 6.3 添加录音动画容器（波形或脉冲效果�?
- [x] 6.4 添加加载状态提示（"识别�?.."�?
- [x] 6.5 添加识别文字预览区域（可编辑�?
- [x] 6.6 添加重试按钮（识别失败时显示�?

- [x] 6.7 修改 `miniprogram/pages/add/add.wxss`
- [x] 6.8 设计麦克风按钮样式（圆形，居中，48px�?
- [x] 6.9 设计录音中动画（波形扩散效果�?
- [x] 6.10 设计加载状态样式（旋转图标或进度条�?
- [x] 6.11 适配不同屏幕尺寸（iPhone SE, iPhone 14 Pro等）

## 7. Miniprogram - Permissions and Error Handling
- [x] 7.1 �?`app.json` 添加录音权限声明
- [x] 7.2 实现 `checkRecordPermission()` 函数
- [x] 7.3 实现权限拒绝引导（跳转到设置页面�?
- [x] 7.4 实现设备不支持录音的降级提示
- [x] 7.5 实现网络错误重试逻辑（最�?次）
- [x] 7.6 添加用户友好的错误提示文�?

## 8. Integration Testing
- [x] 8.1 测试完整流程：录�?�?上传 �?识别 �?解析 �?保存
- [x] 8.2 测试错误场景�?
  - [x] 8.2.1 用户拒绝录音权限
  - [x] 8.2.2 录音时长�?
  - [x] 8.2.3 录音时长超过30�?
  - [x] 8.2.4 上传失败（网络错误）
  - [x] 8.2.5 ASR识别失败（API错误�?
  - [x] 8.2.6 AI解析失败（识别文字不准确�?
- [x] 8.3 测试边界情况�?
  - [x] 8.3.1 噪音环境录音
  - [x] 8.3.2 语速过快或过慢
  - [x] 8.3.3 方言或口�?
- [x] 8.4 性能测试�?
  - [x] 8.4.1 测量端到端延迟（录音 �?显示结果�?
  - [x] 8.4.2 测试并发录音（多用户同时使用�?
  - [x] 8.4.3 验证临时文件及时清理

## 9. Documentation and Monitoring
- [x] 9.1 更新 `CLAUDE.md` 添加语音识别功能说明
- [x] 9.2 添加ASR API调用日志监控
- [x] 9.3 添加临时文件存储空间监控
- [x] 9.4 编写用户使用指南（小程序帮助文档�?
- [x] 9.5 记录已知问题和限�?

## 10. Code Quality and Validation
- [x] 10.1 运行 `npm run lint` 检查代码规�?
- [x] 10.2 运行 `npm run format` 格式化代�?
- [x] 10.3 TypeScript类型检查无错误
- [x] 10.4 代码审查（checklist：安全性、错误处理、日志记录）
- [x] 10.5 运行 `openspec validate add-voice-recognition --strict`

## Dependencies and Parallelization Opportunities

**Can be parallelized**:
- Tasks 2, 3, 4 (后端API开�?
- Tasks 5, 6, 7 (小程序开�?
- Tasks 9, 10 (文档和质量检�?

**Sequential dependencies**:
- 1 �?2 (必须先配置环境变�?
- 2 �?4 (ASR服务必须在API路由之前)
- 3 �?4 (文件管理工具必须在API路由之前)
- 2, 3, 4 �?5 (后端API必须在小程序集成之前)
- 5, 6, 7 �?8 (小程序开发完成才能集成测�?

**Critical path**:
1 �?2 �?3 �?4 �?5/6/7 �?8 �?10 (核心功能必须按顺序完�?

**Estimated effort**:
- Backend (Tasks 1-4): 4-6 hours
- Miniprogram (Tasks 5-7): 6-8 hours
- Testing (Task 8): 2-3 hours
- Documentation (Task 9): 1-2 hours
- **Total**: 13-19 hours
