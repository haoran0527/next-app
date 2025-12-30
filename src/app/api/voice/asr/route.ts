import { NextRequest, NextResponse } from 'next/server'
import { protectApiRoute } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { transcribeAudioFile, asrErrorToResponse, ASRServiceError } from '@/lib/services/asr-service'
import { cleanupTempFile } from '@/lib/utils/file-utils'

async function handleVoiceASR(
  request: NextRequest,
  user?: User
): Promise<NextResponse> {
  if (!user) {
    return NextResponse.json(
      { error: '未授权访问' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { fileId, tempPath } = body

    if (!fileId || !tempPath) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    console.log('[Voice ASR] 开始识别:', {
      fileId,
      userId: user.id
    })

    // 调用ASR服务
    const result = await transcribeAudioFile(tempPath, 'mp3')

    // 识别成功，删除临时文件
    await cleanupTempFile(tempPath, true)

    console.log('[Voice ASR] 识别成功:', {
      fileId,
      userId: user.id,
      textLength: result.text.length
    })

    return NextResponse.json({
      success: true,
      text: result.text,
      duration: result.duration,
      confidence: result.confidence
    })
  } catch (error) {
    console.error('[Voice ASR] 识别失败:', error)

    // ASR失败，保留临时文件用于调试
    const body = await request.json().catch(() => ({}))
    if (body.tempPath) {
      await cleanupTempFile(body.tempPath, false).catch(() => {})
    }

    if (error instanceof ASRServiceError) {
      const errorResponse = asrErrorToResponse(error)
      return NextResponse.json(errorResponse, { status: 400 })
    }

    return NextResponse.json(
      {
        success: false,
        error: '识别失败，请重试或使用文字输入'
      },
      { status: 500 }
    )
  }
}

export const POST = protectApiRoute(handleVoiceASR, {
  requireAuth: true,
  enableDataIsolation: false
})
