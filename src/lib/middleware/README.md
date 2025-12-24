# 数据隔离中间件

本目录包含了记账本应用的数据隔离和安全访问控制中间件，确保用户只能访问自己的数据，同时为管理员提供必要的跨用户访问权限。

## 核心组件

### 1. 认证中间件 (`auth-middleware.ts`)

提供基础的用户认证和授权功能：

- `authMiddleware()` - 基础认证中间件
- `withAuth()` - 认证装饰器
- `withDataIsolation()` - 数据隔离装饰器
- `withResourceAccess()` - 资源访问控制装饰器
- `withPermission()` - 权限检查装饰器
- `withSecureAccess()` - 组合安全访问装饰器

### 2. API保护中间件 (`api-protection.ts`)

提供专门的API路由保护功能：

- `protectApiRoute()` - 通用API保护
- `protectTransactionApi()` - 财务记录API保护
- `protectUserApi()` - 用户管理API保护
- `protectAdminApi()` - 管理员API保护
- `protectSessionApi()` - 会话管理API保护
- `protectBatchApi()` - 批量操作保护
- `protectExportApi()` - 数据导出保护
- `protectStatsApi()` - 统计API保护

### 3. 数据访问控制服务 (`../services/data-access-control.ts`)

提供核心的数据隔离逻辑：

- `validateUserAccess()` - 验证用户访问权限
- `checkPermission()` - 检查用户权限
- `validateResourceOwnership()` - 验证资源所有权
- `SecureDataAccess` - 安全数据访问类
- `createSecureDataAccess()` - 创建安全数据访问实例

### 4. 数据隔离验证工具 (`../utils/data-isolation-validator.ts`)

提供查询验证和安全构建功能：

- `validateQueryIsolation()` - 验证查询隔离
- `addUserIsolation()` - 添加用户隔离条件
- `validateUpdateIsolation()` - 验证更新隔离
- `SecureQueryBuilder` - 安全查询构建器
- `createSecureQuery()` - 创建安全查询构建器

## 使用示例

### 基础API保护

```typescript
import { protectTransactionApi } from '@/lib/middleware/api-protection'

async function handleGetTransactions(
  request: NextRequest,
  user: User,
  secureDataAccess: any
): Promise<NextResponse> {
  // 使用安全数据访问获取交易记录
  const result = await secureDataAccess.getTransactions(filters)
  return NextResponse.json({ success: true, data: result.data })
}

// 导出受保护的API处理器
export const GET = protectTransactionApi(handleGetTransactions, 'read')
```

### 管理员API保护

```typescript
import { protectAdminApi } from '@/lib/middleware/api-protection'

async function handleGetAllUsers(
  request: NextRequest,
  user: User
): Promise<NextResponse> {
  // 管理员可以访问所有用户数据
  const users = await prisma.user.findMany()
  return NextResponse.json({ success: true, data: users })
}

export const GET = protectAdminApi(handleGetAllUsers)
```

### 自定义权限检查

```typescript
import { protectApiRoute } from '@/lib/middleware/api-protection'

const customHandler = protectApiRoute(
  async (request, user, secureDataAccess) => {
    // 处理逻辑
  },
  {
    requireAuth: true,
    resourceType: 'transaction',
    action: 'read',
    enableDataIsolation: true,
    customPermissionCheck: async (user, request) => {
      // 自定义权限检查逻辑
      return user.isActive && someCustomCondition()
    }
  }
)
```

### 安全查询构建

```typescript
import { createSecureQuery } from '@/lib/utils/data-isolation-validator'

// 创建安全查询
const query = createSecureQuery(user, 'transaction')
  .where('category', 'food')
  .dateRange('date', startDate, endDate)
  .whereIn('type', ['INCOME', 'EXPENSE'])

// 构建查询条件（自动包含用户隔离）
const whereClause = query.build()

// 执行查询
const transactions = await prisma.transaction.findMany({
  where: whereClause
})
```

### 直接使用安全数据访问

```typescript
import { createSecureDataAccess } from '@/lib/services/data-access-control'

// 创建安全数据访问实例
const secureAccess = createSecureDataAccess(user)

// 安全获取交易记录
const result = await secureAccess.getTransactions({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  category: 'food'
})

// 安全创建交易记录
const createResult = await secureAccess.createTransaction({
  amount: 100,
  type: 'EXPENSE',
  category: 'food',
  description: '午餐',
  date: new Date()
})
```

## 安全特性

### 数据隔离

1. **自动用户过滤**: 所有查询自动添加用户ID过滤条件
2. **资源所有权验证**: 验证用户是否拥有要访问的资源
3. **跨用户访问阻止**: 普通用户无法访问其他用户的数据

### 权限控制

1. **角色基础访问控制**: 区分普通用户和管理员权限
2. **操作级权限检查**: 细粒度的CRUD权限控制
3. **资源类型权限**: 不同资源类型的专门权限管理

### 管理员特权

1. **跨用户数据访问**: 管理员可以访问所有用户数据
2. **系统级操作**: 管理员可以执行系统管理操作
3. **审计日志**: 管理员操作自动记录日志

### 安全验证

1. **查询验证**: 验证所有数据库查询的安全性
2. **更新验证**: 验证数据更新操作的合法性
3. **输入清理**: 防止恶意输入和注入攻击

## 测试

运行数据隔离相关测试：

```bash
# 运行所有中间件测试
npx vitest run src/lib/middleware/__tests__/

# 运行数据隔离验证工具测试
npx vitest run src/lib/utils/__tests__/data-isolation-validator.test.ts

# 运行所有测试
npx vitest run
```

## 配置选项

### API保护配置

```typescript
interface ApiProtectionConfig {
  requireAuth?: boolean              // 是否需要认证
  requiredRole?: 'USER' | 'ADMIN'   // 需要的角色
  resourceType?: 'transaction' | 'user' | 'session'  // 资源类型
  action?: 'create' | 'read' | 'update' | 'delete' | 'admin'  // 操作类型
  enableDataIsolation?: boolean     // 是否启用数据隔离
  customPermissionCheck?: (user: User, request: NextRequest) => Promise<boolean>  // 自定义权限检查
}
```

### 查询过滤器

```typescript
interface QueryFilters {
  userId?: string      // 用户ID（自动添加）
  startDate?: Date     // 开始日期
  endDate?: Date       // 结束日期
  type?: string        // 类型过滤
  category?: string    // 分类过滤
  limit?: number       // 限制数量
  offset?: number      // 偏移量
}
```

## 最佳实践

1. **始终使用保护中间件**: 所有API路由都应该使用适当的保护中间件
2. **最小权限原则**: 只授予用户完成任务所需的最小权限
3. **验证所有输入**: 使用验证工具检查所有用户输入
4. **记录敏感操作**: 记录所有管理员操作和敏感数据访问
5. **定期审计**: 定期检查权限配置和访问日志

## 错误处理

中间件会返回标准的HTTP错误响应：

- `401 Unauthorized`: 未认证或会话过期
- `403 Forbidden`: 权限不足或数据隔离违规
- `404 Not Found`: 资源不存在或无权访问
- `500 Internal Server Error`: 系统内部错误

## 性能考虑

1. **查询优化**: 数据库查询包含适当的索引
2. **缓存策略**: 权限检查结果可以适当缓存
3. **批量操作**: 支持批量数据访问以提高性能
4. **连接池**: 使用数据库连接池管理连接