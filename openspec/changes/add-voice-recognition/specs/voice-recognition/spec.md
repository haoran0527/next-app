## ADDED Requirements

### Requirement: Voice Recording
The system SHALL allow users to record audio input through the miniprogram interface for creating financial transactions.

#### Scenario: 成功开始录音
- **WHEN** 用户长按麦克风按钮
- **AND** 用户已授权录音权限
- **AND** 设备支持录音功能
- **THEN** 系统启动录音管理器
- **AND** 显示录音动画反馈（波形或脉冲效果）
- **AND** 开始录制用户语音

#### Scenario: 录音时长检查 - 合法时长
- **WHEN** 用户录音时长在1秒到30秒之间
- **AND** 用户松开麦克风按钮
- **THEN** 系统停止录音
- **AND** 生成临时音频文件
- **AND** 继续后续处理流程

#### Scenario: 录音时长检查 - 过短
- **WHEN** 用户录音时长少于1秒
- **AND** 用户松开麦克风按钮
- **THEN** 系统停止录音
- **AND** 显示错误提示"录音时间太短，请重新录制"
- **AND** 不进行后续处理

#### Scenario: 录音时长检查 - 过长自动停止
- **WHEN** 用户录音时长达到30秒
- **THEN** 系统自动停止录音
- **AND** 提示用户"已达到最长录音时长"
- **AND** 继续后续处理流程

#### Scenario: 录音权限拒绝
- **WHEN** 用户未授权录音权限
- **AND** 用户尝试长按麦克风按钮
- **THEN** 系统显示提示"请允许录音权限后重试"
- **AND** 提供引导按钮跳转到设置页面
- **AND** 不启动录音功能

#### Scenario: 设备不支持录音
- **WHEN** 用户设备不支持录音功能
- **THEN** 系统隐藏麦克风按钮
- **OR** 显示提示"您的设备不支持录音功能，请使用文字输入"

### Requirement: Audio Upload and Temporary Storage
The system SHALL provide an API endpoint to receive and temporarily store uploaded audio files.

#### Scenario: 成功上传音频文件
- **WHEN** 小程序上传MP3格式的音频文件
- **AND** 文件大小在5MB以内
- **AND** 文件格式为MP3
- **THEN** 系统接收文件并保存到临时目录 `/tmp/voice/{fileId}.mp3`
- **AND** 生成唯一的文件ID
- **AND** 返回 `{ fileId: string, tempPath: string }`
- **AND** 返回 HTTP 200 状态码

#### Scenario: 上传失败 - 文件格式错误
- **WHEN** 上传的文件不是MP3格式
- **THEN** 系统拒绝上传
- **AND** 返回错误信息"仅支持MP3格式的音频文件"
- **AND** 返回 HTTP 400 状态码

#### Scenario: 上传失败 - 文件过大
- **WHEN** 上传的文件大小超过5MB
- **THEN** 系统拒绝上传
- **AND** 返回错误信息"文件大小不能超过5MB"
- **AND** 返回 HTTP 413 状态码

#### Scenario: 上传失败 - 未授权
- **WHEN** 请求未包含有效的认证令牌
- **THEN** 系统拒绝上传
- **AND** 返回错误信息"未授权访问"
- **AND** 返回 HTTP 401 状态码

### Requirement: Voice-to-Text Transcription
The system SHALL transcribe uploaded audio files to text using Qwen ASR service.

#### Scenario: 成功识别语音为文字
- **WHEN** 系统接收到有效的音频文件路径
- **AND** 调用千问ASR API成功
- **THEN** 系统返回识别的文字内容
- **AND** 包含识别的置信度（如果API提供）
- **AND** 返回音频时长信息
- **AND** 识别成功后立即删除临时音频文件
- **AND** 返回 `{ text: string, duration: number, success: true }`

#### Scenario: ASR识别失败 - API错误
- **WHEN** 千问ASR API返回错误响应
- **THEN** 系统保留临时音频文件1小时（用于调试）
- **AND** 返回错误信息"语音识别失败，请重试或使用文字输入"
- **AND** 记录错误日志（包含API错误码和消息）
- **AND** 返回 `{ success: false, error: string }`

#### Scenario: ASR识别失败 - 网络超时
- **WHEN** 调用千问ASR API超时（超过10秒）
- **THEN** 系统保留临时音频文件1小时
- **AND** 返回错误信息"识别超时，请检查网络连接后重试"
- **AND** 返回 `{ success: false, error: string, timeout: true }`

#### Scenario: ASR识别返回空结果
- **WHEN** 千问ASR API成功响应但识别文字为空
- **THEN** 系统删除临时音频文件
- **AND** 返回错误信息"未能识别语音内容，请重新录制"
- **AND** 返回 `{ success: false, error: string, emptyResult: true }`

### Requirement: Voice-Based Transaction Parsing
The system SHALL provide a combined endpoint that transcribes audio and parses the text into a structured transaction.

#### Scenario: 成功通过语音创建交易
- **WHEN** 用户上传音频文件到 `/api/voice/parse-transaction`
- **AND** ASR成功识别语音为文字（如"今天花了50元买午饭"）
- **AND** AI成功解析识别文字为交易结构
- **THEN** 系统返回完整的交易数据
- **AND** 包含识别的文字供用户确认
- **AND** 返回 `{ success: true, transaction: {...}, asrText: string }`

#### Scenario: ASR成功但AI解析失败
- **WHEN** ASR成功识别语音为文字
- **BUT** AI无法解析文字为有效交易（如缺少金额、分类错误）
- **THEN** 系统返回识别的文字
- **AND** 提示用户"已识别文字：{text}，但无法解析为账单，请手动编辑后重试"
- **AND** 允许用户编辑识别文字后再次调用AI解析
- **AND** 返回 `{ success: false, asrText: string, error: string }`

#### Scenario: ASR失败导致流程终止
- **WHEN** ASR识别失败（API错误、超时、空结果）
- **THEN** 系统不调用AI解析
- **AND** 返回ASR阶段的错误信息
- **AND** 提示用户"语音识别失败，请重试或使用文字输入"
- **AND** 返回 `{ success: false, error: string, stage: "asr" }`

### Requirement: Temporary File Cleanup
The system SHALL automatically clean up temporary audio files to prevent disk space exhaustion.

#### Scenario: 识别成功后立即删除临时文件
- **WHEN** ASR识别成功返回文字
- **THEN** 系统立即删除对应的临时音频文件
- **AND** 记录删除操作日志

#### Scenario: 定时清理过期临时文件
- **WHEN** 系统定时任务触发（每小时执行）
- **THEN** 系统扫描 `/tmp/voice` 目录
- **AND** 删除创建时间超过1小时的所有文件
- **AND** 记录清理文件数量和释放的磁盘空间

#### Scenario: 临时目录不存在时自动创建
- **WHEN** 系统启动时 `/tmp/voice` 目录不存在
- **THEN** 系统自动创建该目录
- **AND** 设置适当的文件权限（仅服务可读写）

### Requirement: User Interface Feedback
The system SHALL provide clear visual feedback during the voice recording and processing stages.

#### Scenario: 录音中的视觉反馈
- **WHEN** 用户正在录音（长按麦克风按钮）
- **THEN** 系统显示录音动画（波形或脉冲效果）
- **AND** 麦克风按钮放大1.2倍
- **AND** 动画持续播放直到录音结束

#### Scenario: 处理中的视觉反馈
- **WHEN** 系统正在处理音频（上传、识别、解析）
- **THEN** 系统显示加载状态提示"识别中..."
- **AND** 显示加载动画（旋转图标或进度条）
- **AND** 禁用麦克风按钮防止重复提交

#### Scenario: 成功后的结果展示
- **WHEN** 语音识别和AI解析成功
- **THEN** 系统显示交易卡片
- **AND** 包含金额、类型、分类、描述
- **AND** 显示识别的文字原文（可编辑）
- **AND** 显示"确认"按钮供用户保存

#### Scenario: 错误提示展示
- **WHEN** 任一阶段失败（录音、上传、识别、解析）
- **THEN** 系统显示明确的错误提示信息
- **AND** 提供重试按钮（如果是临时性错误）
- **AND** 提供降级方案（如"使用文字输入"）

### Requirement: Error Handling and Retry Logic
The system SHALL handle errors gracefully and provide retry mechanisms for recoverable failures.

#### Scenario: 网络错误自动重试
- **WHEN** 音频上传或ASR调用因网络错误失败
- **THEN** 系统自动重试（最多3次）
- **AND** 每次重试间隔递增（1秒、2秒、4秒）
- **AND** 显示"正在重试..."提示
- **AND** 3次重试仍失败后显示最终错误

#### Scenario: 用户手动重试
- **WHEN** 识别失败后用户点击重试按钮
- **THEN** 系统重新上传音频文件（如果临时文件仍存在）
- **OR** 提示用户重新录音（如果临时文件已删除）

#### Scenario: 降级到文字输入
- **WHEN** 语音识别失败或用户不愿使用语音
- **THEN** 系统保留文字输入功能
- **AND** 用户可以手动输入或粘贴文字
- **AND** 仍然可以使用AI解析功能

### Requirement: Audio Quality Constraints
The system SHALL enforce audio recording parameters to ensure compatibility with ASR service.

#### Scenario: 录音参数配置
- **WHEN** 系统初始化录音管理器
- **THEN** 系统设置以下录音参数：
  - 格式：MP3
  - 采样率：16kHz
  - 声道：单声道（1 channel）
  - 比特率：48kbps
  - 最长时长：30秒
  - 帧大小：50

#### Scenario: 音频文件大小验证
- **WHEN** 用户上传音频文件
- **THEN** 系统验证文件大小不超过5MB
- **AND** 如果超过限制，返回413错误
- **AND** 提示用户"录音时长过长，请录制30秒以内的音频"

### Requirement: Security and Privacy
The system SHALL protect user privacy and secure the ASR API integration.

#### Scenario: API密钥不暴露给客户端
- **WHEN** 小程序调用语音识别功能
- **THEN** 所有ASR API调用通过后端代理
- **AND** API密钥仅存储在后端环境变量
- **AND** 小程序端不包含任何ASR认证信息

#### Scenario: 临时文件隔离
- **WHEN** 系统存储临时音频文件
- **THEN** 文件保存在 `/tmp/voice` 目录
- **AND** 文件名使用随机ID（如 `cuid()`）
- **AND** 不在日志中记录完整文件路径

#### Scenario: 认证要求
- **WHEN** 客户端调用任一语音API端点
- **THEN** 系统验证用户身份（Bearer token或session cookie）
- **AND** 未认证请求返回401错误
- **AND** 认证成功才能访问语音功能
