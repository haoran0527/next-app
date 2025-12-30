# Change: Add Voice Recognition for Smart Accounting

## Why

当前小程序仅支持手动输入和文字智能记账，用户在移动场景下（如购物、用餐后）记录账单时，打字输入不够便捷。通过语音识别功能，用户可以更自然、快速地记录财务信息，提升用户体验和记账效率。

语音识别结合现有的 AI 解析能力，将实现"说话即记账"的流畅体验：用户说出"今天花了50元买午饭"，系统自动识别语音、转换文字、解析账单结构，用户只需确认即可完成记账。

## What Changes

- **新增后端语音识别服务**:
  - 创建 `/api/voice/asr` 端点接收音频文件
  - 集成阿里云千问 qwen3-asr-flash-filetrans API
  - 返回识别的文字内容

- **新增后端智能语音记账端点**:
  - 创建 `/api/voice/parse-transaction` 端点
  - 接收音频文件，内部流程：上传 → ASR识别 → AI解析 → 返回结构化交易
  - 复用现有的 `parseNaturalLanguageToTransaction` 能力

- **小程序端录音功能**:
  - 在记账页面添加麦克风按钮
  - 使用 `RecorderManager` API 实现长按录音、松开发送
  - 录音时长限制 30 秒
  - 录音格式：mp3 (兼容性好，文件小)

- **小程序端临时文件上传**:
  - 录音后先上传到后端 `/api/voice/upload` 临时存储
  - 后端调用 ASR API 完成识别后自动删除临时文件
  - 避免小程序直接暴露 ASR API 密钥

- **UI交互优化**:
  - 录音时显示动画反馈（波形或脉冲动画）
  - ASR处理中显示加载状态
  - 识别失败提供清晰的错误提示
  - 解析成功后显示交易卡片，用户点击确认按钮保存

## Impact

- **Affected specs**:
  - 新增 capability: `voice-recognition`
  - 新增 capability: `asr-service`

- **Affected code**:
  - `src/app/api/voice/upload/route.ts` (新建) - 临时文件上传
  - `src/app/api/voice/asr/route.ts` (新建) - ASR识别接口
  - `src/app/api/voice/parse-transaction/route.ts` (新建) - 语音记账接口
  - `src/lib/services/asr-service.ts` (新建) - 千问ASR服务封装
  - `miniprogram/pages/add/add.js` (修改) - 添加录音功能
  - `miniprogram/pages/add/add.wxml` (修改) - 添加麦克风按钮
  - `miniprogram/pages/add/add.wxss` (修改) - 添加录音样式

- **Breaking changes**:
  - 无破坏性变更，向后兼容现有手动输入和文字输入功能

- **Environment Variables**:
  - `QWEN_ASR_API_KEY` - 千问ASR API密钥（用户提供：sk-ffbecec954ed41538147c4180e90fd8b）
  - `QWEN_ASR_APP_KEY` - 千问ASR AppKey（需要从阿里云获取）
  - `QWEN_ASR_FILE_TRANS_URL` - ASR文件转写API地址

- **Data migration**:
  - 不需要数据迁移
  - 临时音频文件存储在 `/tmp` 目录，自动清理

## Dependencies

- **外部服务**:
  - 阿里云千问 qwen3-asr-flash-filetrans API
  - 文档：https://help.aliyun.com/zh/para-api/developer-reference/para-api-file-transcription-details

- **小程序API**:
  - `wx.getRecorderManager()` - 录音管理器
  - `wx.uploadFile()` - 文件上传

- **内部服务**:
  - `src/lib/services/agent-service.ts` - 复用AI解析功能

## Open Questions

1. **Q**: ASR API返回格式是否包含置信度？是否需要过滤低置信度识别结果？
   **A**: 待技术调研时确认，初步计划直接使用ASR返回的文本

2. **Q**: 临时音频文件是否需要持久化存储用于问题排查？
   **A**: 当前版本不持久化，识别成功后立即删除。未来可考虑保留7天用于调试

3. **Q**: 是否需要支持多语言识别（如方言、英文）？
   **A**: 当前版本仅支持普通话，使用通用模型

4. **Q**: 录音失败（权限拒绝、设备不支持）时如何处理？
   **A**: 提供清晰错误提示，引导用户检查权限设置或使用文字输入
