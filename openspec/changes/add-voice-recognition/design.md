# Design: Voice Recognition for Smart Accounting

## Context

当前小程序已有完整的AI智能记账能力（`agent-service.ts`），用户可以通过文字输入（如"今天花了50元买午饭"）快速创建交易记录。但在移动场景下，打字输入仍不够便捷，语音是更自然的交互方式。

微信小程序提供了 `RecorderManager` API 用于录音，阿里云千问提供了 qwen3-asr-flash-filetrans 文件转写API。我们需要整合这两项技术，在现有AI解析能力基础上，实现"说话即记账"功能。

**Constraints**:
- 必须使用千问 qwen3-asr-flash-filetrans API
- API密钥：sk-ffbecec954ed41538147c4180e90fd8b
- 录音时长限制30秒
- 小程序端不能暴露ASR API密钥
- 临时音频文件需要及时清理

**Stakeholders**:
- 小程序用户：需要快速、便捷的语音记账功能
- 后端系统：需要安全、稳定的ASR服务集成
- 运维团队：需要监控ASR API调用量和错误率

## Goals / Non-Goals

**Goals**:
1. 实现小程序端录音功能（长按录音，松开发送）
2. 集成千问ASR API实现语音转文字
3. 复用现有AI解析能力，实现语音→文字→结构化交易的完整流程
4. 提供友好的UI反馈（录音动画、加载状态、错误提示）
5. 确保临时文件及时清理，避免磁盘空间占用

**Non-Goals**:
1. 不支持实时语音识别（流式ASR）
2. 不支持多语言识别（仅普通话）
3. 不支持语音命令（如"删除上一笔"）
4. 不实现本地语音识别（全依赖云端ASR）

## Decisions

### 1. 技术架构：三步流程设计

**Decision**: 采用"上传 → 识别 → 解析"三步流程

**Rationale**:
- 职责分离：每个端点专注单一功能，便于测试和维护
- 可复用性：`/api/voice/asr` 端点可被其他功能复用
- 错误隔离：ASR失败不影响AI解析，AI解析失败不影响录音

**流程图**:
```
小程序录音 → 上传临时文件 → ASR识别 → AI解析 → 返回交易卡片
    ↓           ↓              ↓          ↓
RecorderManager  /upload    /asr     /parse-transaction
                                      (调用 /asr + /agent/parse)
```

**API端点设计**:

1. **`POST /api/voice/upload`** - 临时文件上传
   - 输入：multipart/form-data, audio file
   - 输出：{ fileId, tempPath }
   - 存储：`/tmp/voice/{fileId}.mp3`

2. **`POST /api/voice/asr`** - ASR识别
   - 输入：{ fileId, tempPath }
   - 输出：{ text, duration, confidence? }
   - 调用千问ASR API
   - 识别完成后删除临时文件

3. **`POST /api/voice/parse-transaction`** - 语音记账（组合端点）
   - 输入：multipart/form-data, audio file
   - 输出：{ success, transaction?, asrText?, error? }
   - 内部流程：upload → asr → AI解析
   - 一步到位返回结构化交易

**Alternatives considered**:
- **单端点方案**（只有 `/api/voice/parse-transaction`）：
  - ❌ 不够灵活，如果用户只想要ASR文字无法复用
  - ✅ 但对当前场景最简单

### 2. 录音格式与质量

**Decision**: 使用 MP3 格式，采样率 16kHz，比特率 48kbps

**Rationale**:
- MP3 兼容性好，所有设备都支持
- 16kHz 是语音识别标准采样率，平衡质量和文件大小
- 48kbps 在30秒录音下约180KB，上传速度快
- 千问ASR支持MP3格式

**RecorderManager 配置**:
```javascript
const recorderManager = wx.getRecorderManager()
recorderManager.onStart(() => {
  console.log('录音开始')
})
recorderManager.onStop((res) => {
  const { tempFilePath, duration } = res
  console.log('录音结束', { tempFilePath, duration })
  // 检查时长，如果超过30秒提示用户
  // 上传文件
})
```

**录音参数**:
```javascript
{
  duration: 30000,        // 最长30秒
  format: 'mp3',          // MP3格式
  sampleRate: 16000,      // 16kHz采样率
  numberOfChannels: 1,    // 单声道
  encodeBitRate: 48000,   // 48kbps比特率
  frameSize: 50           // 帧大小
}
```

### 3. 千问ASR API集成

**Decision**: 使用文件转写API（非实时流式）

**API文档参考**:
- 地址：https://help.aliyun.com/zh/para-api/developer-reference/para-api-file-transcription-details
- 模型：qwen3-asr-flash-filetrans

**实现要点**:

1. **API认证**:
   - API Key: sk-ffbecec954ed41538147c4180e90fd8b
   - 需要 HTTP Header: `Authorization: Bearer {apiKey}`

2. **请求格式**:
   ```
   POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription
   Content-Type: multipart/form-data

   {
     "model": "qwen3-asr-flash-filetrans",
     "file": <binary audio data>,
     "format": "mp3"
   }
   ```

3. **响应格式**:
   ```json
   {
     "output": {
       "results": [
         {
           "text": "识别的文字内容"
         }
       ]
     }
   }
   ```

4. **错误处理**:
   - 400: 文件格式不支持
   - 401: API Key无效
   - 413: 文件过大
   - 429: 调用频率超限
   - 500: ASR服务内部错误

**ASR服务封装** (`src/lib/services/asr-service.ts`):
```typescript
export interface ASRResult {
  text: string
  duration?: number
  confidence?: number
}

export async function transcribeAudioFile(
  filePath: string,
  format: string = 'mp3'
): Promise<ASRResult> {
  // 读取文件
  // 调用千问ASR API
  // 解析响应
  // 返回识别文字
}
```

### 4. 临时文件管理策略

**Decision**: 识别成功后立即删除临时文件，失败时保留1小时用于调试

**Rationale**:
- 成功场景：不需要保留原始音频，节省存储
- 失败场景：保留文件便于问题排查和手动重试

**实现**:
```typescript
import fs from 'fs/promises'
import path from 'path'

const TEMP_DIR = '/tmp/voice'
const MAX_AGE_MS = 60 * 60 * 1000 // 1小时

// 清理临时文件
export async function cleanupTempFile(filePath: string, success: boolean) {
  if (success) {
    // 成功：立即删除
    await fs.unlink(filePath).catch(() => {})
  } else {
    // 失败：不删除，由定时任务清理
  }
}

// 定时清理过期文件（每小时执行）
export async function cleanupExpiredTempFiles() {
  const files = await fs.readdir(TEMP_DIR)
  const now = Date.now()

  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file)
    const stats = await fs.stat(filePath)
    const age = now - stats.mtimeMs

    if (age > MAX_AGE_MS) {
      await fs.unlink(filePath).catch(() => {})
    }
  }
}
```

### 5. 小程序UI/UX设计

**Decision**: 在"添加"页面添加浮动麦克风按钮，长按录音，松开发送

**UI布局**:
```
┌─────────────────────────────┐
│   输入框 (文字输入)          │
├─────────────────────────────┤
│                               │
│   [记账内容输入区域]          │
│                               │
├─────────────────────────────┤
│        [🎤] 麦克风按钮       │  ← 浮动按钮
└─────────────────────────────┘
```

**交互流程**:
1. 用户长按麦克风按钮
2. 显示录音动画（波形或脉冲）
3. 松开按钮，显示"处理中..."加载动画
4. ASR识别 + AI解析（后端并行处理）
5. 成功：显示交易卡片，用户点击确认保存
6. 失败：显示错误提示（ASR失败或解析失败）

**WXML结构**:
```xml
<view class="voice-container">
  <!-- 录音按钮 -->
  <view
    class="mic-button {{recording ? 'recording' : ''}}"
    bindtouchstart="startRecording"
    bindtouchend="stopRecording"
  >
    <image src="/images/mic.png" />
  </view>

  <!-- 录音动画 -->
  <view wx:if="{{recording}}" class="recording-animation">
    <view class="wave"></view>
    <view class="wave"></view>
    <view class="wave"></view>
  </view>

  <!-- 加载状态 -->
  <view wx:if="{{processing}}" class="processing">
    <text>识别中...</text>
  </view>
</view>
```

**样式设计**:
- 麦克风按钮：圆形，居中，48px x 48px
- 录音中：按钮放大，波形动画扩散
- 加载中：显示进度条或旋转图标

### 6. 错误处理与降级

**Decision**: 每个环节都有清晰的错误提示和降级方案

**错误场景矩阵**:

| 场景 | 错误提示 | 降级方案 |
|------|---------|---------|
| 用户拒绝录音权限 | "请允许录音权限后重试" | 引导打开设置 |
| 设备不支持录音 | "您的设备不支持录音功能" | 提示使用文字输入 |
| 录音时长为0 | "录音时间太短，请重新录制" | 提示重新录音 |
| 上传失败 | "网络异常，请检查网络连接" | 重试按钮 |
| ASR识别失败 | "语音识别失败，请重试或使用文字输入" | 重试或文字输入 |
| AI解析失败 | "已识别文字：{text}，但无法解析为账单" | 显示识别文字，允许手动编辑 |
| 服务器错误 | "服务异常，请稍后重试" | 重试按钮 |

**降级策略**:
- ASR识别成功但AI解析失败时，将识别的文字填充到输入框，用户可以手动编辑后再次解析
- 所有网络请求都支持重试（最多3次）

## Risks / Trade-offs

### Risk 1: ASR API调用成本和频率限制

**Risk**: 千问ASR API可能有调用次数限制或产生费用

**Mitigation**:
- 监控ASR API调用量，设置告警阈值
- 考虑在用户端做限流（如每分钟最多3次录音）
- 评估是否需要缓存常见语音的识别结果

### Risk 2: 识别准确率受环境影响

**Risk**: 噪音环境、口音、语速可能导致识别准确率下降

**Mitigation**:
- 提示用户在安静环境下使用
- AI解析时容错性强，即使识别有小错误也能正确解析
- 提供识别文字预览，允许用户手动修正

### Risk 3: 临时文件占用磁盘空间

**Risk**: 如果识别频繁失败，大量临时文件可能占用磁盘空间

**Mitigation**:
- 定时清理任务（每小时删除过期文件）
- 监控 `/tmp/voice` 目录大小
- 限制临时文件最大数量（如最多保留100个）

### Trade-off 1: 实时性 vs 准确率

**Decision**: 选择文件转写而非实时流式识别

**Justification**:
- 文件转写准确率更高，适合记账场景
- 实时识别会增加复杂度（WebSocket连接）
- 30秒录音的文件转写延迟可接受（约1-3秒）

### Trade-off 2: 功能丰富度 vs 开发时间

**Decision**: 实现核心语音记账功能，暂不添加语音编辑、重录等高级功能

**Justification**:
- 快速验证语音交互的用户接受度
- 基础功能满足80%使用场景
- 高级功能可根据用户反馈迭代添加

## Migration Plan

### Steps

1. **环境准备**:
   ```bash
   # 添加环境变量到 .env
   QWEN_ASR_API_KEY=sk-ffbecec954ed41538147c4180e90fd8b
   QWEN_ASR_FILE_TRANS_URL=https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription
   ```

2. **后端开发**:
   - 创建 `src/lib/services/asr-service.ts`
   - 创建 `/api/voice/upload` 端点
   - 创建 `/api/voice/asr` 端点
   - 创建 `/api/voice/parse-transaction` 端点
   - 添加临时文件清理定时任务

3. **小程序开发**:
   - 修改 `pages/add/add.js` 添加录音逻辑
   - 修改 `pages/add/add.wxml` 添加麦克风按钮
   - 修改 `pages/add/add.wxss` 添加录音样式
   - 测试录音、上传、识别、解析完整流程

4. **测试**:
   - 单元测试：ASR服务封装
   - 集成测试：语音记账API端到端测试
   - 手动测试：真机录音测试，模拟各种错误场景

### Rollback

- 如果ASR服务不稳定：
  - 保留文字输入和手动输入功能
  - 隐藏麦克风按钮，提示用户"语音功能暂时不可用"
  - 不影响现有记账流程

## Security Considerations

1. **API密钥安全**:
   - ASR API密钥仅存储在后端环境变量
   - 小程序端不暴露密钥
   - 所有ASR调用通过后端代理

2. **临时文件安全**:
   - 临时文件存储在 `/tmp` 目录，有系统自动清理
   - 文件名使用随机ID，避免路径遍历攻击
   - 文件上传大小限制（如最大5MB）

3. **隐私保护**:
   - 录音内容不持久化存储
   - 识别成功后立即删除音频文件
   - 不在日志中记录完整的识别文字

4. **权限控制**:
   - 所有语音API端点需要用户认证
   - 检查录音文件大小和格式
   - 防止恶意用户上传大量文件占用服务器资源

## Performance Considerations

1. **ASR API延迟**:
   - 文件转写API通常1-3秒返回结果
   - 前端显示加载动画，避免用户焦虑
   - 设置合理的超时时间（10秒）

2. **文件上传速度**:
   - 压缩录音参数，控制文件大小在200KB以内
   - 支持断点续传（如果需要）

3. **并发处理**:
   - ASR调用是IO密集型，不会阻塞其他请求
   - 考虑使用队列处理大量并发请求

## Future Enhancements

1. **语音命令支持**: "删除上一笔"、"查看本月支出"等
2. **多语言识别**: 支持方言、英文等
3. **实时流式识别**: 边说边显示文字
4. **语音编辑**: 录音后允许用户播放、重新录制部分内容
5. **智能纠错**: AI根据上下文自动修正识别错误的词
6. **本地语音识别**: 离线场景下使用浏览器内置语音识别API
