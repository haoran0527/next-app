import { prisma } from '@/lib/prisma'

// 缓存清除回调
let onModelActivatedCallback: (() => void) | null = null

/**
 * 注册模型激活时的回调函数
 */
export function registerModelActivatedCallback(callback: () => void) {
  onModelActivatedCallback = callback
}

/**
 * 获取所有AI模型配置
 */
export async function getAllAIModels() {
  try {
    const models = await prisma.aIModel.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // 不返回完整的API Key，只返回前8位和后4位
    return {
      success: true,
      data: models.map((model) => ({
        ...model,
        apiKey: maskApiKey(model.apiKey)
      }))
    }
  } catch (error) {
    console.error('获取AI模型配置失败:', error)
    return { success: false, error: '获取AI模型配置失败' }
  }
}

/**
 * 根据ID获取AI模型配置（包含完整API Key）
 */
export async function getAIModelById(id: string) {
  try {
    const model = await prisma.aIModel.findUnique({
      where: { id }
    })

    if (!model) {
      return { success: false, error: 'AI模型配置不存在' }
    }

    return { success: true, data: model }
  } catch (error) {
    console.error('获取AI模型配置失败:', error)
    return { success: false, error: '获取AI模型配置失败' }
  }
}

/**
 * 获取当前激活的AI模型配置
 */
export async function getActiveAIModel() {
  try {
    const model = await prisma.aIModel.findFirst({
      where: { isActive: true }
    })

    if (!model) {
      return { success: false, error: '未找到激活的AI模型配置' }
    }

    return { success: true, data: model }
  } catch (error) {
    console.error('获取激活的AI模型配置失败:', error)
    return { success: false, error: '获取激活的AI模型配置失败' }
  }
}

/**
 * 创建AI模型配置
 */
export async function createAIModel(data: {
  name: string
  baseUrl: string
  apiKey: string
  model: string
}) {
  try {
    // 检查名称是否已存在
    const existing = await prisma.aIModel.findUnique({
      where: { name: data.name }
    })

    if (existing) {
      return { success: false, error: '模型名称已存在' }
    }

    const newModel = await prisma.aIModel.create({
      data: {
        name: data.name,
        baseUrl: data.baseUrl,
        apiKey: data.apiKey,
        model: data.model
      }
    })

    return {
      success: true,
      data: {
        ...newModel,
        apiKey: maskApiKey(newModel.apiKey)
      }
    }
  } catch (error) {
    console.error('创建AI模型配置失败:', error)
    return { success: false, error: '创建AI模型配置失败' }
  }
}

/**
 * 更新AI模型配置
 */
export async function updateAIModel(
  id: string,
  data: {
    name?: string
    baseUrl?: string
    apiKey?: string
    model?: string
  }
) {
  try {
    // 如果要修改名称，检查新名称是否已被使用
    if (data.name) {
      const existing = await prisma.aIModel.findFirst({
        where: {
          name: data.name,
          NOT: { id }
        }
      })

      if (existing) {
        return { success: false, error: '模型名称已存在' }
      }
    }

    const updated = await prisma.aIModel.update({
      where: { id },
      data
    })

    return {
      success: true,
      data: {
        ...updated,
        apiKey: maskApiKey(updated.apiKey)
      }
    }
  } catch (error) {
    console.error('更新AI模型配置失败:', error)
    return { success: false, error: '更新AI模型配置失败' }
  }
}

/**
 * 删除AI模型配置
 */
export async function deleteAIModel(id: string) {
  try {
    // 检查是否是激活的模型
    const model = await prisma.aIModel.findUnique({
      where: { id }
    })

    if (!model) {
      return { success: false, error: 'AI模型配置不存在' }
    }

    if (model.isActive) {
      return { success: false, error: '无法删除激活的模型配置，请先切换到其他模型' }
    }

    await prisma.aIModel.delete({
      where: { id }
    })

    return { success: true }
  } catch (error) {
    console.error('删除AI模型配置失败:', error)
    return { success: false, error: '删除AI模型配置失败' }
  }
}

/**
 * 切换激活的AI模型
 */
export async function activateAIModel(id: string) {
  try {
    // 检查目标模型是否存在
    const targetModel = await prisma.aIModel.findUnique({
      where: { id }
    })

    if (!targetModel) {
      return { success: false, error: 'AI模型配置不存在' }
    }

    // 使用事务确保只有一个激活的模型
    await prisma.$transaction([
      // 先将所有模型设为未激活
      prisma.aIModel.updateMany({
        data: { isActive: false }
      }),
      // 再将目标模型设为激活
      prisma.aIModel.update({
        where: { id },
        data: { isActive: true }
      })
    ])

    // 清除 agent 服务的缓存，使其立即使用新模型
    if (onModelActivatedCallback) {
      onModelActivatedCallback()
    }

    return { success: true }
  } catch (error) {
    console.error('切换AI模型失败:', error)
    return { success: false, error: '切换AI模型失败' }
  }
}

/**
 * 掩码API Key（只显示前8位和后4位）
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '****'
  }
  const prefix = apiKey.substring(0, 8)
  const suffix = apiKey.substring(apiKey.length - 4)
  const maskedLength = Math.max(8, apiKey.length - 12)
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`
}
