import { NextRequest, NextResponse } from 'next/server'
import { protectApiRoute } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import { transcribeAudioFile, asrErrorToResponse, ASRServiceError } from '@/lib/services/asr-service'
import { parseNaturalLanguageToTransaction } from '@/lib/services/agent-service'
import { generateFileId, saveTempFile, cleanupTempFile, validateFileSize, validateFileFormat } from '@/lib/utils/file-utils'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

async function handleVoiceParseTransaction(
  request: NextRequest,
  user?: User
): Promise<NextResponse> {
  if (!user) {
    return NextResponse.json(
      { error: '未授权访问' },
      { status: 401 }
    )
  }

  let tempPath: string | null = null

  try {
    // 解析multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '请上传音频文件' },
        { status: 400 }
      )
    }

    // 验证文件格式
    if (!validateFileFormat(file.name)) {
      return NextResponse.json(
        { error: '仅支持MP3格式的音频文件' },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (!validateFileSize(file.size, MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: '文件大小不能超过5MB' },
        { status: 413 }
      )
    }

    console.log('[Voice Parse Transaction] 开始处理:', {
      userId: user.id,
      fileSize: `${(file.size / 1024).toFixed(2)}KB`
    })

    // 步骤1: 保存临时文件
    const fileId = generateFileId()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    tempPath = await saveTempFile(fileId, buffer, 'mp3')

    // 步骤2: ASR识别
    console.log('[Voice Parse Transaction] 步骤1: ASR识别...')
    const asrResult = await transcribeAudioFile(tempPath, 'mp3')

    console.log('[Voice Parse Transaction] ASR识别成功:', {
      asrText: asrResult.text,
      textLength: asrResult.text.length
    })

    // 识别成功，删除临时文件
    await cleanupTempFile(tempPath, true)
    tempPath = null

    // 步骤3: AI解析
    console.log('[Voice Parse Transaction] 步骤2: AI解析交易...')
    const parseResult = await parseNaturalLanguageToTransaction(asrResult.text)

    console.log('[Voice Parse Transaction] AI解析结果:', {
      success: parseResult.success,
      transaction: parseResult.transaction
    })

    if (!parseResult.success) {
      // AI解析失败，返回识别文字供用户编辑
      console.log('[Voice Parse Transaction] AI解析失败，返回识别文字')
      return NextResponse.json({
        success: false,
        asrText: asrResult.text,
        error: parseResult.error || '无法解析为账单，请手动编辑后重试',
        stage: 'parsing'
      })
    }

    console.log('[Voice Parse Transaction] 处理成功')
    return NextResponse.json({
      success: true,
      transaction: parseResult.transaction,
      asrText: asrResult.text
    })
  } catch (error) {
    console.error('[Voice Parse Transaction] 处理失败:', error)

    // 清理临时文件
    if (tempPath) {
      await cleanupTempFile(tempPath, false).catch(() => {})
    }

    if (error instanceof ASRServiceError) {
      const errorResponse = asrErrorToResponse(error)
      errorResponse.stage = 'asr'
      return NextResponse.json(errorResponse, { status: 400 })
    }

    return NextResponse.json(
      {
        success: false,
        error: '处理失败，请稍后重试',
        stage: 'unknown'
      },
      { status: 500 }
    )
  }
}

export const POST = protectApiRoute(handleVoiceParseTransaction, {
  requireAuth: true,
  enableDataIsolation: false
})
