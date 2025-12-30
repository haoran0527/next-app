## ADDED Requirements

### Requirement: ASR Service Integration
The system SHALL integrate with Alibaba Cloud Qwen ASR file transcription API for speech-to-text conversion.

#### Scenario: 成功调用ASR API
- **WHEN** 系统调用ASR服务传入有效的音频文件路径
- **AND** 音频文件格式为MP3
- **AND** API密钥配置正确
- **THEN** 系统发送HTTP POST请求到千问ASR API
- **AND** 请求包含以下参数：
  - `model`: "qwen3-asr-flash-filetrans"
  - `file`: 音频文件的二进制数据
  - `format`: "mp3"
- **AND** 请求头包含 `Authorization: Bearer {API_KEY}`
- **AND** 成功接收响应并提取识别文字

#### Scenario: ASR API认证失败
- **WHEN** 系统使用无效的API密钥调用ASR API
- **THEN** API返回401 Unauthorized错误
- **AND** 系统捕获错误并记录日志
- **AND** 返回用户友好的错误信息"语音识别服务认证失败"
- **AND** 不暴露具体API密钥或错误详情

#### Scenario: ASR API文件格式不支持
- **WHEN** 上传的音频文件格式不被ASR API支持
- **THEN** API返回400错误，错误码包含格式信息
- **AND** 系统返回错误信息"音频格式不支持，请使用MP3格式"
- **AND** 建议用户重新录音

#### Scenario: ASR API文件过大
- **WHEN** 上传的音频文件大小超过ASR API限制
- **THEN** API返回413 Payload Too Large错误
- **AND** 系统返回错误信息"录音文件过大，请录制30秒以内的音频"
- **AND** 保留临时文件用于调试

#### Scenario: ASR API调用频率超限
- **WHEN** ASR API调用频率超过限制
- **THEN** API返回429 Too Many Requests错误
- **AND** 系统返回错误信息"请求过于频繁，请稍后重试"
- **AND** 记录限流告警日志

#### Scenario: ASR API响应解析
- **WHEN** ASR API成功返回响应
- **THEN** 系统解析JSON响应格式：
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
- **AND** 提取 `output.results[0].text` 字段
- **AND** 如果响应格式不符合预期，返回解析错误

### Requirement: ASR Service Configuration
The system SHALL allow configuration of ASR service parameters through environment variables.

#### Scenario: 从环境变量读取ASR配置
- **WHEN** 系统启动或首次调用ASR服务
- **THEN** 系统从环境变量读取以下配置：
  - `QWEN_ASR_API_KEY`: API密钥（sk-ffbecec954ed41538147c4180e90fd8b）
  - `QWEN_ASR_FILE_TRANS_URL`: API端点URL
  - `QWEN_ASR_MODEL`: 模型名称（默认为 "qwen3-asr-flash-filetrans"）

#### Scenario: 环境变量缺失时的降级处理
- **WHEN** `QWEN_ASR_API_KEY` 环境变量未配置
- **THEN** 系统返回错误"ASR服务未配置，请联系管理员"
- **AND** 不尝试调用API

#### Scenario: 默认配置值
- **WHEN** 某些环境变量未设置但非必需
- **THEN** 系统使用以下默认值：
  - API URL: `https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription`
  - 模型: `qwen3-asr-flash-filetrans`
  - 超时时间: 10秒

### Requirement: ASR Service Error Handling
The system SHALL handle ASR API errors gracefully and provide actionable error messages.

#### Scenario: 网络连接错误
- **WHEN** 系统无法连接到ASR API端点（DNS解析失败、网络不可达）
- **THEN** 系统捕获网络错误
- **AND** 返回错误信息"网络连接失败，请检查网络设置"
- **AND** 记录详细的错误日志（包含端点URL、错误代码）
- **AND** 保留临时音频文件用于重试

#### Scenario: 请求超时
- **WHEN** ASR API调用超过配置的超时时间（默认10秒）
- **THEN** 系统取消请求
- **AND** 返回错误信息"识别超时，请稍后重试"
- **AND** 保留临时音频文件用于重试

#### Scenario: API服务端错误
- **WHEN** ASR API返回5xx错误（500, 502, 503等）
- **THEN** 系统返回错误信息"语音识别服务异常，请稍后重试"
- **AND** 记录错误日志（包含状态码和响应体）
- **AND** 保留临时音频文件

#### Scenario: 响应格式异常
- **WHEN** ASR API返回的响应体不是有效的JSON格式
- **OR** JSON结构不符合预期
- **THEN** 系统返回错误信息"识别结果格式异常"
- **AND** 记录原始响应体到日志（脱敏处理）
- **AND** 保留临时音频文件

### Requirement: ASR Service Logging and Monitoring
The system SHALL log ASR API calls for monitoring and debugging purposes.

#### Scenario: 记录成功的ASR调用
- **WHEN** ASR API调用成功
- **THEN** 系统记录以下信息：
  - 调用时间戳
  - 请求耗时（毫秒）
  - 音频文件大小
  - 识别文字长度
  - 识别置信度（如果API提供）

#### Scenario: 记录失败的ASR调用
- **WHEN** ASR API调用失败
- **THEN** 系统记录以下信息：
  - 调用时间戳
  - 错误类型（网络错误、API错误、超时等）
  - HTTP状态码（如果适用）
  - 错误消息（脱敏处理）
  - 音频文件大小

#### Scenario: 性能监控
- **WHEN** 系统记录ASR调用日志
- **THEN** 日志包含性能指标：
  - API响应时间
  - 文件上传时间
  - 总处理时间
- **AND** 支持通过日志分析工具查询平均响应时间
- **AND** 支持设置性能告警阈值（如响应时间超过5秒）

### Requirement: ASR Service Type Safety
The system SHALL provide TypeScript type definitions for ASR service interfaces.

#### Scenario: ASRResult类型定义
- **WHEN** ASR服务成功返回识别结果
- **THEN** 返回对象符合以下TypeScript类型：
  ```typescript
  interface ASRResult {
    text: string          // 识别的文字内容
    duration?: number     // 音频时长（秒）
    confidence?: number   // 识别置信度（0-1）
  }
  ```

#### Scenario: ASRError类型定义
- **WHEN** ASR服务调用失败
- **THEN** 错误对象符合以下TypeScript类型：
  ```typescript
  interface ASRError {
    code: string          // 错误代码（如 "NETWORK_ERROR", "API_ERROR"）
    message: string       // 用户友好的错误消息
    statusCode?: number   // HTTP状态码
    details?: any         // 详细错误信息（仅用于日志）
  }
  ```

#### Scenario: 函数签名类型检查
- **WHEN** 开发者调用ASR服务函数
- **THEN** TypeScript编译器验证参数类型：
  - `filePath: string` - 必须是字符串
  - `format?: string` - 可选，默认为 "mp3"
  - 返回类型为 `Promise<ASRResult>`
- **AND** 类型错误在编译时被捕获

### Requirement: ASR Service Testing
The system SHALL provide unit tests for ASR service functionality.

#### Scenario: 测试成功的ASR调用
- **WHEN** 运行单元测试
- **THEN** 测试用例模拟成功的API响应
- **AND** 验证返回的识别文字正确
- **AND** 验证临时文件被正确删除

#### Scenario: 测试API错误处理
- **WHEN** 运行单元测试
- **THEN** 测试用例模拟各种API错误（401, 400, 413, 429, 500）
- **AND** 验证错误消息正确
- **AND** 验证临时文件被保留

#### Scenario: 测试网络错误处理
- **WHEN** 运行单元测试
- **THEN** 测试用例模拟网络连接失败和超时
- **AND** 验证重试逻辑正确执行
- **AND** 验证最终错误返回正确

#### Scenario: 测试响应解析
- **WHEN** 运行单元测试
- **THEN** 测试用例验证各种响应格式：
  - 标准格式（包含 `output.results[0].text`）
  - 空结果（`results` 数组为空）
  - 异常格式（缺少必要字段）
- **AND** 验证解析逻辑正确处理各种情况
