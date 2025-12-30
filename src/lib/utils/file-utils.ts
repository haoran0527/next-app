import fs from 'fs/promises'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'

/**
 * 临时文件目录
 */
const TEMP_DIR = '/tmp/voice'
const MAX_AGE_MS = 60 * 60 * 1000 // 1小时

/**
 * 生成随机文件ID
 * @returns 随机文件ID（cuid）
 */
export function generateFileId(): string {
  return createId()
}

/**
 * 确保临时目录存在
 * 如果不存在则创建
 */
export async function ensureTempDir(): Promise<void> {
  try {
    await fs.access(TEMP_DIR)
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true, mode: 0o755 })
    console.log('[File Utils] 创建临时目录:', TEMP_DIR)
  }
}

/**
 * 获取临时文件路径
 * @param fileId - 文件ID
 * @param extension - 文件扩展名（默认为 "mp3"）
 * @returns 完整的临时文件路径
 */
export function getTempFilePath(fileId: string, extension: string = 'mp3'): string {
  return path.join(TEMP_DIR, `${fileId}.${extension}`)
}

/**
 * 清理临时文件
 * @param filePath - 文件路径
 * @param success - 是否成功（成功则立即删除，失败则保留用于调试）
 */
export async function cleanupTempFile(filePath: string, success: boolean): Promise<void> {
  try {
    if (success) {
      // 成功：立即删除
      await fs.unlink(filePath)
      console.log('[File Utils] 删除临时文件:', filePath)
    } else {
      // 失败：不删除，由定时清理任务处理
      console.log('[File Utils] 保留临时文件用于调试:', filePath)
    }
  } catch (error) {
    // 文件可能已被删除，忽略错误
    console.error('[File Utils] 删除文件失败:', { filePath, error })
  }
}

/**
 * 清理过期的临时文件
 * 扫描临时目录，删除创建时间超过 MAX_AGE_MS 的文件
 * @returns 清理的文件数量和释放的字节数
 */
export async function cleanupExpiredTempFiles(): Promise<{
  deletedCount: number
  freedSpace: number
}> {
  try {
    // 确保目录存在
    await ensureTempDir()

    const files = await fs.readdir(TEMP_DIR)
    const now = Date.now()
    let deletedCount = 0
    let freedSpace = 0

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file)

      try {
        const stats = await fs.stat(filePath)
        const age = now - stats.mtimeMs

        // 删除超过1小时的文件
        if (age > MAX_AGE_MS) {
          await fs.unlink(filePath)
          deletedCount++
          freedSpace += stats.size
          console.log('[File Utils] 清理过期文件:', {
            file,
            age: `${Math.round(age / 1000)}s`,
            size: `${(stats.size / 1024).toFixed(2)}KB`
          })
        }
      } catch (error) {
        console.error('[File Utils] 清理文件失败:', { file, error })
      }
    }

    if (deletedCount > 0) {
      console.log('[File Utils] 清理完成:', {
        deletedCount,
        freedSpace: `${(freedSpace / 1024).toFixed(2)}KB`
      })
    }

    return { deletedCount, freedSpace }
  } catch (error) {
    console.error('[File Utils] 清理任务失败:', error)
    return { deletedCount: 0, freedSpace: 0 }
  }
}

/**
 * 保存上传的文件到临时目录
 * @param fileId - 文件ID
 * @param buffer - 文件内容
 * @param extension - 文件扩展名（默认为 "mp3"）
 * @returns 保存的文件路径
 */
export async function saveTempFile(
  fileId: string,
  buffer: Buffer,
  extension: string = 'mp3'
): Promise<string> {
  await ensureTempDir()
  const filePath = getTempFilePath(fileId, extension)
  await fs.writeFile(filePath, buffer, { mode: 0o644 })
  console.log('[File Utils] 保存临时文件:', {
    filePath,
    size: `${(buffer.length / 1024).toFixed(2)}KB`
  })
  return filePath
}

/**
 * 验证文件大小
 * @param fileSize - 文件大小（字节）
 * @param maxSize - 最大文件大小（字节，默认为5MB）
 * @returns 是否符合大小限制
 */
export function validateFileSize(fileSize: number, maxSize: number = 5 * 1024 * 1024): boolean {
  return fileSize <= maxSize
}

/**
 * 验证文件格式
 * @param filename - 文件名
 * @param allowedExtensions - 允许的扩展名列表（默认为 ["mp3"]）
 * @returns 是否符合格式要求
 */
export function validateFileFormat(
  filename: string,
  allowedExtensions: string[] = ['mp3']
): boolean {
  const ext = path.extname(filename).toLowerCase().replace('.', '')
  return allowedExtensions.includes(ext)
}
