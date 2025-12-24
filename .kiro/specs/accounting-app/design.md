# 设计文档

## 概述

记账本应用是一个基于Next.js 14和TypeScript的全栈Web应用程序，采用现代化的架构设计。应用使用App Router、Server Components和Server Actions来实现高性能的用户体验。数据存储采用PostgreSQL数据库，通过Prisma ORM进行数据访问。认证系统使用NextAuth.js实现，支持多种登录方式。应用部署在Vercel平台上，利用其边缘计算能力提供全球化服务。

## 架构

### 整体架构

应用采用分层架构模式：

```
┌─────────────────────────────────────┐
│           前端层 (Next.js)           │
│  ┌─────────────┐ ┌─────────────────┐ │
│  │   页面组件   │ │    UI组件库     │ │
│  └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│          API层 (App Router)         │
│  ┌─────────────┐ ┌─────────────────┐ │
│  │ Server Actions│ │   API Routes   │ │
│  └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│           业务逻辑层                 │
│  ┌─────────────┐ ┌─────────────────┐ │
│  │   服务层     │ │    验证层       │ │
│  └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│           数据访问层                 │
│  ┌─────────────┐ ┌─────────────────┐ │
│  │ Prisma ORM  │ │   数据库连接     │ │
│  └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│        数据存储层 (PostgreSQL)       │
└─────────────────────────────────────┘
```

### 技术栈

- **前端框架**: Next.js 14 (App Router)
- **编程语言**: TypeScript
- **UI框架**: Tailwind CSS + shadcn/ui
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: NextAuth.js
- **状态管理**: React Server Components + useOptimistic
- **表单处理**: React Hook Form + Zod
- **部署**: Vercel

## 组件和接口

### 核心组件

#### 1. 认证系统
```typescript
// 用户认证接口
interface AuthService {
  signUp(email: string, username: string, password: string): Promise<User>
  signIn(email: string, password: string): Promise<Session>
  signOut(): Promise<void>
  getCurrentUser(): Promise<User | null>
}

// 会话管理接口
interface SessionManager {
  createSession(userId: string): Promise<Session>
  validateSession(sessionId: string): Promise<boolean>
  extendSession(sessionId: string): Promise<void>
  destroySession(sessionId: string): Promise<void>
}
```

#### 2. 财务记录管理
```typescript
// 财务记录服务接口
interface TransactionService {
  createTransaction(userId: string, data: CreateTransactionData): Promise<Transaction>
  getTransactions(userId: string, filters?: TransactionFilters): Promise<Transaction[]>
  updateTransaction(userId: string, id: string, data: UpdateTransactionData): Promise<Transaction>
  deleteTransaction(userId: string, id: string): Promise<void>
  getBalance(userId: string): Promise<number>
}

// 统计服务接口
interface StatisticsService {
  getMonthlyStats(userId: string, year: number, month: number): Promise<MonthlyStats>
  getCategoryStats(userId: string, dateRange: DateRange): Promise<CategoryStats[]>
  getBalanceHistory(userId: string, dateRange: DateRange): Promise<BalanceHistory[]>
}
```

#### 3. 数据隔离中间件
```typescript
// 数据访问控制接口
interface DataAccessControl {
  validateUserAccess(userId: string, resourceId: string): Promise<boolean>
  applyUserFilter<T>(userId: string, query: Query<T>): Query<T>
  checkPermission(userId: string, action: string, resource: string): Promise<boolean>
}
```

#### 4. 管理员系统
```typescript
// 管理员服务接口
interface AdminService {
  getAllUsers(pagination?: Pagination): Promise<PaginatedUsers>
  getUserDetails(userId: string): Promise<UserDetails>
  disableUser(userId: string): Promise<void>
  enableUser(userId: string): Promise<void>
  deleteUser(userId: string): Promise<void>
  getSystemStats(): Promise<SystemStats>
  exportUserData(userId: string): Promise<ExportData>
}
```

## 数据模型

### 数据库架构

```prisma
// 用户模型
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关联关系
  transactions Transaction[]
  sessions     Session[]
  
  @@map("users")
}

// 角色枚举
enum Role {
  USER
  ADMIN
}

// 财务记录模型
model Transaction {
  id          String          @id @default(cuid())
  userId      String
  amount      Decimal         @db.Decimal(10, 2)
  type        TransactionType
  category    String
  description String?
  date        DateTime
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  
  // 关联关系
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("transactions")
  @@index([userId, date])
  @@index([userId, type])
  @@index([userId, category])
}

// 交易类型枚举
enum TransactionType {
  INCOME
  EXPENSE
}

// 会话模型
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  // 关联关系
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
  @@index([token])
  @@index([userId])
}

// 管理员操作日志模型
model AdminLog {
  id        String   @id @default(cuid())
  adminId   String
  action    String
  targetId  String?
  details   Json?
  createdAt DateTime @default(now())
  
  @@map("admin_logs")
  @@index([adminId])
  @@index([createdAt])
}
```

### TypeScript类型定义

```typescript
// 基础类型
interface User {
  id: string
  email: string
  username: string
  role: 'USER' | 'ADMIN'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface Transaction {
  id: string
  userId: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: string
  description?: string
  date: Date
  createdAt: Date
  updatedAt: Date
}

// 请求/响应类型
interface CreateTransactionData {
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: string
  description?: string
  date: Date
}

interface TransactionFilters {
  startDate?: Date
  endDate?: Date
  type?: 'INCOME' | 'EXPENSE'
  category?: string
  limit?: number
  offset?: number
}

interface MonthlyStats {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
}
```
## 正确性
属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

基于需求分析，以下是系统必须满足的核心正确性属性：

### 属性 1: 用户注册完整性
*对于任何*有效的用户注册数据（邮箱、用户名、密码），系统应该成功创建用户账户、为用户分配独立数据空间，并且新用户应该能够立即登录
**验证需求: 需求 1.1, 1.4**

### 属性 2: 邮箱唯一性约束
*对于任何*已存在的邮箱地址，尝试使用相同邮箱注册新账户应该被拒绝
**验证需求: 需求 1.2**

### 属性 3: 密码验证规则
*对于任何*不符合安全要求的密码（长度、复杂度等），注册请求应该被拒绝并返回相应错误信息
**验证需求: 需求 1.3**

### 属性 4: 认证验证正确性
*对于任何*用户凭据，当且仅当邮箱和密码都正确时，登录应该成功并创建有效会话
**验证需求: 需求 2.1, 2.2**

### 属性 5: 会话管理一致性
*对于任何*用户会话，会话过期后的任何数据访问请求都应该被拒绝，延长会话应该更新过期时间
**验证需求: 需求 2.4, 2.5, 6.5**

### 属性 6: 财务记录管理完整性
*对于任何*有效的财务记录数据，创建、更新、删除操作应该正确执行，无效数据应该被拒绝
**验证需求: 需求 3.1, 3.2, 5.2, 5.3**

### 属性 7: 余额计算一致性
*对于任何*用户的财务记录变更（添加、修改、删除），账户余额应该始终等于所有收入记录总和减去所有支出记录总和
**验证需求: 需求 3.4, 5.4**

### 属性 8: 时间戳完整性
*对于任何*新创建的财务记录，系统应该自动添加创建时间戳
**验证需求: 需求 3.5**

### 属性 9: 数据隔离严格性
*对于任何*用户的数据查询请求，返回的结果应该只包含该用户拥有的数据，不能访问其他用户的数据
**验证需求: 需求 4.2, 5.5, 6.1, 6.2, 6.3, 6.4**

### 属性 10: 日期筛选准确性
*对于任何*指定的日期范围，查询结果应该只包含该时间段内的财务记录
**验证需求: 需求 4.3**

### 属性 11: 统计计算准确性
*对于任何*用户的财务数据，统计信息（月度汇总、分类统计、系统统计）应该与实际记录数据保持一致
**验证需求: 需求 4.1, 4.4, 7.4**

### 属性 12: 数据导出完整性
*对于任何*用户的数据导出请求，导出文件应该包含该用户的所有财务记录且数据格式正确
**验证需求: 需求 4.5**

### 属性 13: 分页逻辑正确性
*对于任何*分页查询，所有页面的记录总和应该等于完整查询结果，且不应有重复或遗漏
**验证需求: 需求 9.2**

### 属性 14: 管理员权限正确性
*对于任何*超级管理员操作，应该能够访问所有用户数据，执行用户管理操作，且操作结果应该正确反映
**验证需求: 需求 7.2, 7.3, 8.1, 8.3**

### 属性 15: 审计日志完整性
*对于任何*管理员操作，系统应该记录完整的操作日志，包括操作者、操作类型、目标对象和时间戳
**验证需求: 需求 8.2, 8.4**

### 属性 16: 密码重置功能性
*对于任何*管理员发起的密码重置操作，应该生成新的临时密码并更新用户账户
**验证需求: 需求 8.5**

### 属性 17: 数据备份完整性
*对于任何*数据备份操作，备份文件应该包含所有用户的完整数据且格式正确
**验证需求: 需求 7.5**

## 错误处理

### 错误分类和处理策略

#### 1. 验证错误
- **输入验证失败**: 返回400状态码和详细错误信息
- **业务规则违反**: 返回422状态码和业务错误描述
- **数据格式错误**: 返回400状态码和格式要求说明

#### 2. 认证和授权错误
- **未认证访问**: 返回401状态码，重定向到登录页面
- **权限不足**: 返回403状态码和权限说明
- **会话过期**: 返回401状态码，清除客户端会话

#### 3. 系统错误
- **数据库连接失败**: 返回503状态码，记录错误日志
- **外部服务不可用**: 返回502状态码，启用降级机制
- **服务器内部错误**: 返回500状态码，记录详细错误信息

#### 4. 错误处理机制

```typescript
// 全局错误处理器
interface ErrorHandler {
  handleValidationError(error: ValidationError): ErrorResponse
  handleAuthError(error: AuthError): ErrorResponse
  handleSystemError(error: SystemError): ErrorResponse
  logError(error: Error, context: RequestContext): void
}

// 错误响应格式
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
  requestId: string
}
```

## 测试策略

### 双重测试方法

系统将采用单元测试和基于属性的测试相结合的综合测试策略：

#### 单元测试
- **具体示例验证**: 测试特定的输入输出场景
- **边界条件测试**: 验证极端情况和边界值
- **集成点测试**: 确保组件间正确协作
- **错误条件测试**: 验证错误处理的正确性

#### 基于属性的测试
- **通用正确性验证**: 验证跨所有输入的通用属性
- **测试库**: 使用fast-check进行JavaScript/TypeScript的基于属性测试
- **测试配置**: 每个属性测试运行最少100次迭代
- **属性标记**: 每个基于属性的测试必须使用注释明确引用设计文档中的正确性属性

#### 测试标记格式
每个基于属性的测试必须使用以下格式进行标记：
```typescript
// **Feature: accounting-app, Property {number}: {property_text}**
```

#### 测试覆盖要求
- 所有正确性属性必须通过单独的基于属性测试实现
- 单元测试和属性测试是互补的，两者都必须包含
- 单元测试捕获具体错误，属性测试验证通用正确性
- 一起提供全面覆盖：单元测试捕获具体错误，属性测试验证通用正确性

### 测试环境配置

#### 开发环境
- **数据库**: PostgreSQL测试实例
- **认证**: 模拟认证服务
- **外部服务**: 使用测试替身

#### CI/CD环境
- **自动化测试**: 每次提交触发完整测试套件
- **性能测试**: 定期执行性能基准测试
- **安全测试**: 集成安全扫描工具

### 测试数据管理

#### 测试数据生成
```typescript
// 测试数据生成器
interface TestDataGenerator {
  generateUser(overrides?: Partial<User>): User
  generateTransaction(userId: string, overrides?: Partial<Transaction>): Transaction
  generateRandomEmail(): string
  generateValidPassword(): string
  generateInvalidPassword(): string
}
```

#### 数据清理策略
- **测试隔离**: 每个测试使用独立的数据集
- **自动清理**: 测试完成后自动清理测试数据
- **数据重置**: 提供快速重置测试环境的机制