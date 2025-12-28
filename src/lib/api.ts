/**
 * API 工具函数
 * 处理 basePath 和通用的 fetch 逻辑
 */

/**
 * 获取 API 基础路径
 * 在客户端，从当前 URL 推断 basePath
 */
export function getApiBasePath(): string {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    // 如果路径以 /note 开头，则使用 /note 作为 basePath
    if (pathname.startsWith('/note')) {
      return '/note'
    }
  }
  return ''
}

/**
 * 构建完整的 API URL
 * @param path API 路径，例如 '/api/auth/login'
 * @returns 完整的 API URL
 */
export function buildApiUrl(path: string): string {
  const basePath = getApiBasePath()
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${basePath}${normalizedPath}`
}

/**
 * 封装的 fetch 函数，自动处理 basePath
 * @param path API 路径
 * @param options fetch 选项
 * @returns fetch 响应
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(path)
  return fetch(url, {
    ...options,
    credentials: 'include', // 重要：确保发送cookies以维持会话
    headers: {
      ...options?.headers,
    },
  })
}
