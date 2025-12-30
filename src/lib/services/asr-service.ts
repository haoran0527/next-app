import fs from 'fs/promises'
import FormData from 'form-data'

/**
 * ASR服务结果
 */
export interface ASRResult {
  text: string // 识别的文字内容
  duration?: number // 音频时长（秒）
  confidence?: number // 识别置信度（0-1）
}

/**
 * ASR服务错误
 */
export interface ASRError {
  code: string // 错误代码（如 "NETWORK_ERROR", "API_ERROR"）
  message: string // 用户友好的错误消息
  statusCode?: number // HTTP状态码
  details?: Record<string, unknown> // 详细错误信息（仅用于日志）
}

/**
 * 从环境变量获取ASR配置
 */
function getASRConfig() {
  const apiKey = process.env.QWEN_ASR_API_KEY
  const apiUrl =
    process.env.QWEN_ASR_FILE_TRANS_URL ||
    'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription'

  if (!apiKey) {
    throw new Error('QWEN_ASR_API_KEY is not configured')
  }

  return { apiKey, apiUrl }
}

/**
 * 调用千问ASR API进行语音转文字
 *
 * @param filePath - 音频文件路径
 * @param format - 音频格式（默认为 "mp3"）
 * @returns Promise<ASRResult> 识别结果
 */
export async function transcribeAudioFile(
  filePath: string,
  format: string = 'mp3'
): Promise<ASRResult> {
  const startTime = Date.now()
  const { apiKey, apiUrl } = getASRConfig()

  try {
    // 读取音频文件
    const fileBuffer = await fs.readFile(filePath)
    const fileSize = fileBuffer.length

    console.log('[ASR Service] 开始识别语音:', {
      filePath,
      format,
      fileSize: `${(fileSize / 1024).toFixed(2)}KB`,
    })

    // 构建multipart/form-data请求
    const formData = new FormData()
    formData.append('file', fileBuffer, {
      filename: `audio.${format}`,
      contentType: `audio/${format}`,
    })
    formData.append('model', 'qwen3-asr-flash')
    formData.append('format', format)

    // 调用千问ASR API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
      body: formData as unknown as BodyInit,
      // 10秒超时
      signal: AbortSignal.timeout(10000),
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log('[ASR Service] API响应:', {
      statusCode: response.status,
      duration: `${duration}ms`,
    })

    // 处理API错误
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ASR Service] API错误:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })

      throw new ASRServiceError(
        'API_ERROR',
        '语音识别失败，请重试或使用文字输入',
        response.status,
        { responseBody: errorText }
      )
    }

    // 解析响应
    const data = await response.json()

    // 验证响应格式
    if (
      !data.output ||
      !data.output.results ||
      !Array.isArray(data.output.results) ||
      data.output.results.length === 0
    ) {
      console.error('[ASR Service] 响应格式异常:', data)
      throw new ASRServiceError('EMPTY_RESULT', '未能识别语音内容，请重新录制')
    }

    const text = data.output.results[0].text?.trim()

    if (!text) {
      throw new ASRServiceError('EMPTY_RESULT', '未能识别语音内容，请重新录制')
    }

    console.log('[ASR Service] 识别成功:', {
      textLength: text.length,
      duration: `${duration}ms`,
    })

    return {
      text,
      confidence: data.output.results[0].confidence,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[ASR Service] 识别失败:', {
      error,
      duration: `${duration}ms`,
    })

    if (error instanceof ASRServiceError) {
      throw error
    }

    // 处理网络错误
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new ASRServiceError(
          'TIMEOUT',
          '识别超时，请检查网络连接后重试',
          undefined,
          { originalError: error.message }
        )
      }

      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')
      ) {
        throw new ASRServiceError(
          'NETWORK_ERROR',
          '网络连接失败，请检查网络设置',
          undefined,
          { originalError: error.message }
        )
      }

      if (error.code === 'ENOENT') {
        throw new ASRServiceError(
          'FILE_NOT_FOUND',
          '音频文件不存在',
          undefined,
          { filePath }
        )
      }
    }

    throw new ASRServiceError(
      'UNKNOWN_ERROR',
      '语音识别失败，请稍后重试',
      undefined,
      { originalError: error }
    )
  }
}

/**
 * ASR服务错误类
 */
class ASRServiceError extends Error implements ASRError {
  code: string
  statusCode?: number
  details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ASRServiceError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  toJSON(): ASRError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

/**
 * 将ASRServiceError转换为用户友好的错误响应
 */
export function asrErrorToResponse(error: ASRServiceError): {
  success: false
  error: string
  code?: string
  timeout?: boolean
} {
  const response: {
    success: false
    error: string
    code?: string
    timeout?: boolean
  } = {
    success: false,
    error: error.message,
  }

  if (error.code) {
    response.code = error.code
  }

  if (error.code === 'TIMEOUT') {
    response.timeout = true
  }

  return response
}
