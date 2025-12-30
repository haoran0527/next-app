# Design: Family Groups Feature

## Context

当前系统实现了严格的单用户数据隔离，每个用户只能访问自己的账单数据。家庭组功能需要在不破坏现有安全机制的前提下，实现受控的跨用户数据共享。

**Constraints**:
- 必须保持现有的 `SecureDataAccess` 和权限检查机制
- 每个用户最多属于一个家庭组
- 创建者拥有特殊权限（解散、邀请）
- 管理员权限不受影响

**Stakeholders**:
- 家庭成员：需要查看和管理家庭财务
- 系统管理员：需要审计家庭组操作
- API消费者：需要清晰的权限语义

## Goals / Non-Goals

**Goals**:
1. 实现家庭组内成员数据共享（账单可见）
2. 提供基于邀请码的安全加入机制
3. 支持家庭组级别的统计分析
4. 保持与现有权限系统的兼容性
5. 确保数据隔离的扩展性（支持未来团队功能）

**Non-Goals**:
1. 不支持复杂的多层级权限（角色、权限继承）
2. 不支持用户同时加入多个家庭组
3. 不提供实时通知功能（邀请/加入仅通过查询状态）
4. 不实现家庭组间的数据迁移或合并

## Decisions

### 1. 数据模型设计

**Decision**: 使用两个独立的模型 `FamilyGroup` 和 `FamilyMember`

**Rationale**:
- 关注点分离：`FamilyGroup` 存储家庭组元数据，`FamilyMember` 存储成员关系
- 便于扩展：未来可以在 `FamilyMember` 上添加角色字段（如 ADMIN/MEMBER）
- 性能优化：通过外键和索引提升查询效率

**Schema**:
```prisma
model FamilyGroup {
  id          String   @id @default(cuid())
  name        String
  creatorId   String
  inviteCode  String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  creator  User           @relation(fields: [creatorId], references: [id])
  members  FamilyMember[]

  @@map("family_groups")
  @@index([inviteCode])
}

model FamilyMember {
  id        String   @id @default(cuid())
  userId    String
  groupId   String
  role      MemberRole @default(MEMBER)
  joinedAt  DateTime @default(now())

  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  group FamilyGroup  @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([userId, groupId])
  @@map("family_members")
  @@index([userId])
  @@index([groupId])
}

enum MemberRole {
  CREATOR
  MEMBER
}
```

**Alternatives considered**:
- **单模型方案**（在 User 上添加 familyGroupId）：
  - ❌ 限制未来扩展（如多组支持、成员角色）
  - ❌ 难以追溯成员加入历史
- **JSON字段方案**（在 FamilyGroup 存储 members 数组）：
  - ❌ 查询性能差
  - ❌ 难以建立外键约束

### 2. 邀请码机制

**Decision**: 使用 8 字符随机字符串作为邀请码，创建时自动生成

**Rationale**:
- 简单易用，用户无需记住复杂的URL
- 足够的安全性（62^8 ≈ 2.18e14 种组合）
- 避免依赖外部服务（如邮件、短信）

**Implementation**:
```typescript
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
```

**Validation**:
- 加入时检查邀请码是否存在
- 检查用户是否已属于其他家庭组
- 防止重复加入同一家庭组

### 3. 数据访问控制扩展

**Decision**: 扩展 `SecureDataAccess` 类，增加家庭组数据访问维度

**Rationale**:
- 复用现有的权限检查框架
- 最小化代码变更
- 保持 API 的向后兼容性

**Changes to `data-access-control.ts`**:

```typescript
// 新增接口
export interface FamilyGroupContext {
  groupId: string | null
  isMember: boolean
  role?: 'CREATOR' | 'MEMBER'
}

// 扩展 User 类型
interface User {
  // ... 现有字段
  familyGroup?: FamilyGroupContext
}

// 修改 applyUserFilter
export function applyUserFilter(
  currentUser: User,
  baseFilters: QueryFilters = {}
): QueryFilters {
  // 管理员逻辑保持不变
  if (currentUser.role === 'ADMIN' && !baseFilters.userId) {
    return baseFilters
  }

  // 如果用户属于家庭组，允许查看组内所有成员数据
  if (currentUser.familyGroup?.groupId) {
    return {
      ...baseFilters,
      // 使用子查询获取家庭组成员的 userId
      userId: {
        in: getFamilyGroupMemberIds(currentUser.familyGroup.groupId)
      }
    }
  }

  // 普通用户只能查看自己的数据
  return {
    ...baseFilters,
    userId: currentUser.id
  }
}
```

**Alternatives considered**:
- **创建新的 FamilyGroupDataAccess 类**：
  - ❌ 代码重复，维护成本高
  - ❌ API 调用方需要处理两种不同的数据访问对象

### 4. 统计功能设计

**Decision**: 实现三层统计：个人统计 + 家庭组成员统计 + 家庭总统计

**Rationale**:
- 满足用户不同粒度的分析需求
- 复用现有的 `getUserStats` 逻辑
- 通过聚合查询实现高效的家庭统计

**API Response**:
```typescript
interface FamilyGroupStatsResponse {
  personalStats: {
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
  }
  memberStats: Array<{
    userId: string
    username: string
    nickname: string | null
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
  }>
  familyStats: {
    totalIncome: number
    totalExpense: number
    balance: number
    transactionCount: number
    memberCount: number
  }
}
```

### 5. 创建者退出策略

**Decision**: 不允许创建者直接退出家庭组

**Rationale**:
- 避免创建者退出后的权限真空
- 简化权限转移逻辑
- 明确创建者的责任

**User Experience**:
- 创建者尝试退出时返回错误提示："您是家庭组创建者，无法退出。请先转让创建者权限或解散家庭组。"
- 未来版本可以添加"转让创建者"功能

## Risks / Trade-offs

### Risk 1: 邀请码泄露
**Risk**: 用户分享邀请码时可能被非预期用户获取
**Mitigation**:
- 使用足够长的随机字符串（8字符）
- 未来可添加"重置邀请码"功能
- 日志记录所有加入操作，便于审计

### Risk 2: 数据隔离边界模糊
**Risk**: 用户可能不理解哪些数据对家庭组成员可见
**Mitigation**:
- UI上明确标注"家庭组共享"状态
- 在敏感操作（删除、修改）时显示数据归属
- 提供数据访问日志（未来功能）

### Trade-off 1: 简化 vs 功能完整性
**Decision**: 选择简化实现（不支持多组、角色继承）
**Justification**: 当前需求主要是家庭小型团队，过度设计会增加复杂度和维护成本

### Trade-off 2: 实时通知 vs 延迟查询
**Decision**: 使用延迟查询（用户主动刷新状态）
**Justification**: 避免引入额外的通知系统依赖，降低系统复杂度

## Migration Plan

### Steps
1. **数据库迁移**:
   ```bash
   npx prisma migrate dev --name add_family_groups
   ```

2. **代码迁移**:
   - 修改 `data-access-control.ts` 添加家庭组逻辑
   - 创建 `family-group-service.ts`
   - 添加 API 路由

3. **测试**:
   - 单元测试：家庭组创建、加入、退出、解散
   - 集成测试：数据隔离、权限检查
   - 手动测试：用户场景

### Rollback
- 如果出现严重问题：
  1. 禁用家庭组相关 API 端点
  2. 回滚 `data-access-control.ts` 到原版本
  3. 保留数据库表（不影响现有功能）

## Open Questions

1. **Q**: 是否需要支持"转让创建者"功能？
   **A**: 当前版本不支持，作为未来增强功能（v2）

2. **Q**: 家庭组是否有成员数量限制？
   **A**: 当前版本不限制，未来可考虑（如最多10人）

3. **Q**: 退出家庭组后，历史数据是否保留？
   **A**: 退出仅解除关联关系，不删除任何账单数据（数据所有权归属创建者）

4. **Q**: 是否需要家庭组操作日志（非管理员审计日志）？
   **A**: 作为未来功能，当前版本复用 `AdminLog` 记录关键操作

## Security Considerations

1. **邀请码安全**:
   - 使用加密安全的随机生成器
   - 避免使用易混淆字符（如 I, l, 1, O, 0）

2. **权限验证**:
   - 所有 API 端点必须验证用户身份
   - 创建者操作必须验证 `role === 'CREATOR'`
   - 跨用户数据访问必须验证家庭组关系

3. **数据泄露防护**:
   - 确保普通用户无法通过 API 遍历获取其他家庭组信息
   - 统计 API 必须验证用户属于该家庭组

4. **拒绝服务**:
   - 限制单个用户创建家庭组的数量（如最多 3 个）
   - 限制加入/退出操作的频率
