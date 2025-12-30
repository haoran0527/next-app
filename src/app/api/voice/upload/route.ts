import { NextRequest, NextResponse } from 'next/server'
import { protectApiRoute } from '@/lib/middleware/api-protection'
import { User } from '@/lib/types/auth'
import {
  generateFileId,
  saveTempFile,
  validateFileSize,
  validateFileFormat
} from '@/lib/utils/file-utils'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

async function handleVoiceUpload(
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

    // 生成文件ID
    const fileId = generateFileId()

    // 将File对象转换为Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 保存到临时目录
    const tempPath = await saveTempFile(fileId, buffer, 'mp3')

    console.log('[Voice Upload] 上传成功:', {
      fileId,
      userId: user.id,
      fileSize: `${(file.size / 1024).toFixed(2)}KB`,
      tempPath
    })

    return NextResponse.json({
      success: true,
      fileId,
      tempPath
    })
  } catch (error) {
    console.error('[Voice Upload] 上传失败:', error)
    return NextResponse.json(
      { error: '上传失败，请稍后重试' },
      { status: 500 }
    )
  }
}

export const POST = protectApiRoute(handleVoiceUpload, {
  requireAuth: true,
  enableDataIsolation: false
})
