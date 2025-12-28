# 家庭组功能测试 - Bug 记录

## Bug #1: Cookie Path 硬编码导致开发环境登录失败

**严重程度**: High
**发现阶段**: Phase 2.1 - 用户注册与登录测试
**位置**: `src/app/api/auth/login/route.ts:58`

### 问题描述
登录API成功返回session token，但在开发环境下用户无法保持登录状态，立即被重定向回登录页。

### 根本原因
Cookie path 被硬编码为 `/note`（生产环境路径），但在开发环境中应用运行在根路径 `/`。

### 错误表现
- 登录API返回 200 成功
- Set-Cookie header: `session-token=...; Path=/note; ...`
- 后续请求到 `/api/auth/me` 返回 401 Unauthorized
- Cookie未发送，因为浏览器认为该cookie只对 `/note` 路径有效
- 用户被重定向回登录页

### 预期行为
- 开发环境：Cookie path 应该是 `/`
- 生产环境：Cookie path 应该是 `/note`

### 修复方案
根据 `process.env.NODE_ENV` 动态设置 cookie path：

创建了统一配置文件 `src/lib/cookie-config.ts`：
```typescript
const isProduction = process.env.NODE_ENV === 'production'
const basePath = isProduction ? '/note' : '/'

export const getSessionCookieOptions = (maxAge: number = 24 * 60 * 60) => ({
  httpOnly: true,
  secure: false,
  sameSite: 'strict' as const,
  maxAge,
  path: basePath,
})
```

然后在各个 auth route 中使用这个统一配置。

### Bug #1.1: 空字符串 path 导致 cookie 使用当前路径

**问题描述**:
初始修复使用了 `basePath: isProduction ? '/note' : ''`，空字符串导致 cookie 使用当前请求路径（如 `/api/auth/login`），使得 cookie 只在该路径下有效。

**修复**:
改为 `basePath: isProduction ? '/note' : '/'`

### Bug #1.2: 多个同名 cookie 导致 token 提取失败

**问题描述**:
由于之前的 cookie path 错误，浏览器中累积了多个 `session-token` cookie。当有多个同名 cookie 时，`request.cookies.get()` 的行为不可预测。

**修复**:
在 `src/lib/middleware/auth-middleware.ts` 中手动解析 cookie header，提取最新的 token：
```typescript
const cookieHeader = request.headers.get('cookie')
if (cookieHeader) {
  const matches = cookieHeader.match(/session-token=([^;]+)/g)
  if (matches && matches.length > 0) {
    const lastMatch = matches[matches.length - 1]
    return lastMatch.split('=')[1]
  }
}
```

### 影响范围
- 开发环境下的所有登录功能
- 所有设置 session-token cookie 的地方

### 修复状态
- [x] Web 端已修复
  - [x] `src/lib/cookie-config.ts` (新建)
  - [x] `src/app/api/auth/login/route.ts`
  - [x] `src/app/api/auth/refresh/route.ts`
  - [x] `src/app/api/auth/logout/route.ts`
  - [x] `src/app/api/auth/wechat-login/route.ts`
  - [x] `src/lib/middleware/auth-middleware.ts` (cookie 解析逻辑)
- [ ] 需要重启开发服务器以使更改生效
- [ ] 小程序端待检查（小程序可能不使用 cookies）

### 验证状态
- [ ] 需要清理浏览器的所有旧 cookie
- [ ] 需要重启 Next.js 开发服务器
- [ ] 重新测试登录流程

### 相关文件
- `src/lib/cookie-config.ts` (新建)
- `src/lib/middleware/auth-middleware.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/refresh/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/wechat-login/route.ts`

---

## Bug #3: Next.js 15+ 动态路由 params 未使用 await

**严重程度**: High
**发现阶段**: Phase 4.1 - 第一个成员加入测试
**位置**: 所有 family-groups 动态路由 (5个文件)

### 问题描述
在 Next.js 15+ 中，动态路由的 `params` 参数变成了 Promise，必须使用 `await` 或 `React.use()` 来访问其属性。所有 family-groups 相关的动态路由都直接访问 `params.id` 而没有 await，导致运行时错误。

### 根本原因
Next.js 15 引入了 breaking change，动态路由参数从对象改为 Promise：
```typescript
// ❌ Next.js 14 (旧)
{ params }: { params: { id: string } }
const id = params.id

// ✅ Next.js 15+ (新)
{ params }: { params: Promise<{ id: string }> }
const { id } = await params
```

### 错误表现
- 加入家庭组时返回 500 错误
- 错误信息：`Route used \`params.id\`. \`params\` is a Promise and must be unwrapped with \`await\``
- 所有使用动态路由的 family-groups API 都受影响

### 修复方案
修改所有 family-groups 动态路由的类型定义和参数访问：

1. **类型定义**：`{ params: { id: string } }` → `{ params: Promise<{ id: string }> }`
2. **参数访问**：`params.id` 或 `const { id } = params` → `const { id } = await params`

### 修复的文件
- [x] `src/app/api/family-groups/[id]/join/route.ts` (line 8, 33)
- [x] `src/app/api/family-groups/[id]/stats/route.ts` (line 7, 9)
- [x] `src/app/api/family-groups/[id]/leave/route.ts` (line 7, 9)
- [x] `src/app/api/family-groups/[id]/members/route.ts` (line 7, 9)
- [x] `src/app/api/family-groups/[id]/route.ts` (line 7, 9 和 45, 47)

### 示例修复

**修复前 (join/route.ts)**:
```typescript
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // ...
  const inviteCode = params.id  // ❌ 错误
```

**修复后**:
```typescript
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ...
  const { id: inviteCode } = await params  // ✅ 正确
```

### 修复状态
- [x] 5个文件全部修复
- [ ] 需要重启开发服务器以使更改生效
- [ ] 需要重新测试加入家庭组流程

### 影响范围
- 所有 family-groups 动态路由 API
- 可能影响其他动态路由（需要进一步检查）

### 验证状态
- [ ] 重启开发服务器
- [ ] 用 test_family_2 重新测试加入家庭组功能
- [ ] 验证所有 family-groups API 正常工作

### 相关文件
- `src/app/api/family-groups/[id]/join/route.ts`
- `src/app/api/family-groups/[id]/stats/route.ts`
- `src/app/api/family-groups/[id]/leave/route.ts`
- `src/app/api/family-groups/[id]/members/route.ts`
- `src/app/api/family-groups/[id]/route.ts`

### 其他需要注意的动态路由
项目中可能还有其他动态路由存在相同问题，建议全局搜索：
```bash
grep -r "params.*{ id.*string.*}" src/app/api/
```

---

## Bug #4: apiFetch 未发送 cookies 导致认证失败

**严重程度**: High
**发现阶段**: Phase 6.1 - 测试成员退出功能
**位置**: `src/lib/api.ts:39-42`

### 问题描述
前端封装的 `apiFetch` 函数没有包含 `credentials: 'include'` 选项，导致浏览器不会发送 cookies（包括 session-token）到 API 端点。这导致所有需要认证的 API 请求都返回 401 Unauthorized。

### 根本原因
默认情况下，浏览器在使用 `fetch` API 时不会自动发送 cookies，除非明确指定 `credentials: 'include'`。原实现：

```typescript
// ❌ 错误：不发送 cookies
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(path)
  return fetch(url, options)  // 缺少 credentials: 'include'
}
```

### 错误表现
- `/api/auth/me` 返回 200（可能是因为使用了不同的认证方式）
- `/api/family-groups` 返回 401 Unauthorized
- `/api/user/stats` 返回 401 Unauthorized
- 所有使用 `apiFetch` 的需要认证的 API 都失败
- 用户登录后无法访问需要认证的资源
- 家庭组功能完全无法使用

### 预期行为
- `apiFetch` 应该自动发送 cookies 以维持会话
- 所有 API 请求都应该包含 session-token cookie
- 认证应该对所有 API 一致工作

### 修复方案
在 `apiFetch` 函数中添加 `credentials: 'include'` 选项：

```typescript
// ✅ 正确：发送 cookies
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
```

### 修复的文件
- [x] `src/lib/api.ts` (添加 credentials: 'include')

### 影响范围
- 所有使用 `apiFetch` 的前端 API 调用
- 包括但不限于：
  - 家庭组相关 API (`/api/family-groups*`)
  - 统计数据 API (`/api/user/stats`)
  - 交易列表 API (`/api/transactions`)
  - 用户认证 API (`/api/auth/me`)

### 修复状态
- [x] 已修复
- [ ] 需要刷新浏览器页面以使更改生效
- [ ] 需要重新测试所有 API 调用

### 验证状态
- [ ] 刷新浏览器后测试家庭组页面
- [ ] 验证所有 API 请求都包含 cookies
- [ ] 确认认证对所有端点正常工作

### 相关文件
- `src/lib/api.ts`
- `src/app/dashboard/family-groups/page.tsx` (使用 apiFetch 的主要页面)

### 技术说明
`credentials: 'include'` 告诉浏览器：
1. 在同源请求中发送 cookies
2. 在跨源请求中发送 cookies（如果 CORS 配置允许）
3. 接收服务器设置的 Set-Cookie headers

这是使用 cookie-based 认证的应用程序必须的配置。

---

## Bug #5: withAuth 包装器不传递 params 参数

**严重程度**: High
**发现阶段**: Phase 6.1 - 测试成员退出功能
**位置**: `src/app/api/family-groups/[id]/*` 路由 (4个文件)

### 问题描述
`withAuth` 包装器（来自 `src/lib/middleware/api-protection.ts`）只传递 `(request, user)` 两个参数给处理器函数，但动态路由处理器需要接收第三个参数 `params`。使用 `withAuth` 包装的动态路由会导致运行时错误：`Cannot destructure property 'params' of 'undefined'`。

### 根本原因
`withAuth` 等认证包装器的设计假设是处理简单的 `(request, user)` 签名，没有考虑动态路由的 `params` 参数：

```typescript
// withAuth 的实现（简化）
export const withAuth = (handler: (request: NextRequest, user: User) => Promise<NextResponse>) => {
  return async (request: NextRequest, { params }: any) => {
    // 认证逻辑...
    return handler(request, user)  // ❌ 只传递 request 和 user
  }
}
```

而动态路由需要：
```typescript
export async function DELETE(
  request: NextRequest,
  user: User,
  { params }: { params: Promise<{ id: string }> }  // ❌ withAuth 不会传递这个
) {
  const { id } = await params
  // ...
}
```

### 错误表现
- 点击"退出家庭组"按钮返回 500 错误
- 错误信息：`TypeError: Cannot destructure property 'params' of 'undefined'`
- 路由处理器中 `params` 为 `undefined`
- 所有使用 `withAuth` 包装的动态路由都失败

### 受影响的路由
1. `src/app/api/family-groups/[id]/leave/route.ts` (DELETE)
2. `src/app/api/family-groups/[id]/stats/route.ts` (GET)
3. `src/app/api/family-groups/[id]/members/route.ts` (GET)
4. `src/app/api/family-groups/[id]/route.ts` (GET, DELETE)

### 修复方案
移除 `withAuth` 包装器，在每个动态路由中实现手动认证：

```typescript
// ✅ 正确：手动实现认证
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 1. 提取 token
  const authHeader = request.headers.get('authorization')
  const cookieToken = request.cookies.get('session-token')?.value
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken

  if (!token) {
    return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
  }

  // 2. 验证会话
  const { validateSession } = await import('@/lib/services/session-service')
  const sessionData = await validateSession(token)

  if (!sessionData) {
    return NextResponse.json({ error: '会话无效或已过期' }, { status: 401 })
  }

  // 3. 获取用户和 params
  const user = sessionData.user
  const { id } = await params

  // 4. 执行业务逻辑
  // ...
}
```

### 修复的文件
- [x] `src/app/api/family-groups/[id]/leave/route.ts`
- [x] `src/app/api/family-groups/[id]/stats/route.ts`
- [x] `src/app/api/family-groups/[id]/members/route.ts`
- [x] `src/app/api/family-groups/[id]/route.ts`

### 技术债务
此修复方案增加了代码重复（每个路由都需要手动实现认证），但这是 Next.js 15+ 动态路由架构的限制。

可能的长期解决方案：
1. 修改 `withAuth` 以支持 params：`withAuthWithParams(handler, { params })`
2. 创建专用的动态路由认证包装器：`withDynamicRouteAuth(handler)`
3. 迁移到 middleware-based 认证（在 middleware 层处理认证）

### 修复状态
- [x] 4个文件全部修复
- [x] 退出功能测试通过
- [x] 统计功能测试通过
- [x] 成员列表测试通过
- [x] 家庭组详情测试通过

### 验证状态
- [x] test_exit 成功退出家庭组
- [x] 退出后访问家庭组返回 403
- [x] 家庭组统计正常显示
- [x] 成员列表正常显示

### 影响范围
- 所有 family-groups 动态路由 API
- 未来新增的动态路由需要注意同样问题

### 相关文件
- `src/lib/middleware/api-protection.ts` (withAuth 实现)
- `src/app/api/family-groups/[id]/leave/route.ts`
- `src/app/api/family-groups/[id]/stats/route.ts`
- `src/app/api/family-groups/[id]/members/route.ts`
- `src/app/api/family-groups/[id]/route.ts`

---

## Bug 汇总统计

### 已修复的 Bug 总数: 6

1. **Bug #1**: Cookie Path 硬编码 (3个子问题)
2. **Bug #2**: UI 链接使用 `/note/` 硬编码路径（已记录，未修复）
3. **Bug #3**: Next.js 15+ params Promise 问题
4. **Bug #4**: apiFetch 未发送 cookies
5. **Bug #5**: withAuth 不传递 params
6. **Bug #6**: 小程序 WXML 包含 HTML 标签

### 按严重程度分类

- **High**: 5个 (Bug #1, #3, #4, #5)
- **Medium**: 2个 (Bug #2, #6)
- **Low**: 0个

### 修复状态

- ✅ **已修复**: 5个 (Bug #1, #3, #4, #5, #6)
- 📝 **已记录未修复**: 1个 (Bug #2)

### 需要同步到小程序端

根据分析，以下 Bug 需要在小程序端检查：

1. **✅ Bug #6 已修复**: WXML HTML 标签问题（`div` → `view`）
2. **Bug #3**: 小程序端如有动态路由需要检查 params Promise 问题
3. **Bug #1**: 小程序可能不使用 cookies（使用不同的认证机制）

小程序端特有的认证机制（微信登录）可能不受 Bug #1 和 #4 影响。

---

## Bug #6: 小程序端 WXML 文件包含 HTML 标签

**严重程度**: Medium
**发现阶段**: 测试完成后 - 小程序编译错误
**位置**: `miniprogram/pages/family/family.wxml:100`

### 问题描述
小程序的 WXML 文件中包含了 HTML 的 `</div>` 标签，导致编译错误。小程序应该使用 `<view>` 而不是 `<div>`。

### 根本原因
从 Web 端复制代码到小程序端时，没有正确转换 HTML 标签为 WXML 标签。

### 错误表现
- 编译错误：`expect end-tag 'view'., near 'div'`
- 运行时错误：`__route__ is not defined`
- 小程序无法正常加载家庭组页面

### 预期行为
小程序应使用 WXML 标签：
- `<div>` → `<view>`
- `<span>` → `<text>`
- `<button>` → `<view>` 或 `<button>` (小程序支持的标签)
- `<input>` → `<input>` (小程序支持的标签)

### 修复方案
将 `</div>` 改为 `</view>`：

```wxml
<!-- ❌ 错误：使用 HTML 标签 -->
      </div>

<!-- ✅ 正确：使用 WXML 标签 -->
      </view>
```

### 修复的文件
- [x] `miniprogram/pages/family/family.wxml` (line 100)

### 修复状态
- [x] 已修复
- [ ] 需要重新编译小程序验证

### 验证状态
- [ ] 小程序编译成功
- [ ] 家庭组页面正常显示
- [ ] 无运行时错误

### 相关文件
- `miniprogram/pages/family/family.wxml`

### 技术说明
小程序不支持标准 HTML 标签，必须使用 WXML 标签：
- `<view>` - 容器组件（类似 div）
- `<text>` - 文本组件（类似 span）
- `<image>` - 图片组件（类似 img）
- `<button>` - 按钮组件

### 影响范围
- 小程序端家庭组页面
- 可能其他小程序页面也存在类似问题（建议全局搜索）

### 小程序端 HTML 标签检查
建议运行以下命令检查所有小程序页面：
```bash
grep -r "<div\|</div>\|<span\|</span>" miniprogram/pages/
```

