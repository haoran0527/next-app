# Implementation Tasks

## 1. Database Schema and Migration
- [x] 1.1 在 `prisma/schema.prisma` 中添加 `FamilyGroup` 模型
- [x] 1.2 在 `prisma/schema.prisma` 中添加 `FamilyMember` 模型
- [x] 1.3 添加 `MemberRole` 枚举类型
- [x] 1.4 在 `User` 模型中添加 `familyMembers` 关联关系
- [x] 1.5 运行 `npm run db:generate` 生成 Prisma 客户端
- [x] 1.6 创建并执行数据库迁移 `npm run db:migrate`
- [x] 1.7 验证迁移后的数据库表结构和索引

## 2. Core Service Layer
- [x] 2.1 创建 `src/lib/services/family-group-service.ts`
- [x] 2.2 实现 `createFamilyGroup(user, name)` 函数
- [x] 2.3 实现 `generateInviteCode()` 辅助函数
- [x] 2.4 实现 `joinFamilyGroup(user, inviteCode)` 函数
- [x] 2.5 实现 `leaveFamilyGroup(user)` 函数
- [x] 2.6 实现 `dissolveFamilyGroup(groupId, creatorId)` 函数
- [x] 2.7 实现 `getFamilyMembers(groupId)` 函数
- [x] 2.8 实现 `getFamilyGroupByUserId(userId)` 函数
- [x] 2.9 实现 `getFamilyGroupStats(groupId)` 函数
- [x] 2.10 添加错误处理和验证逻辑

## 3. Data Access Control Extension
- [x] 3.1 扩展 `src/lib/types/auth.ts` 中的 `User` 类型，添加 `familyGroup` 字段
- [x] 3.2 在 `data-access-control.ts` 中添加 `FamilyGroupContext` 接口
- [x] 3.3 实现 `getFamilyGroupMemberIds(groupId)` 查询函数
- [x] 3.4 修改 `applyUserFilter()` 函数，支持家庭组成员数据访问
- [x] 3.5 更新 `SecureDataAccess.getTransactions()` 方法
- [x] 3.6 在 `auth-middleware.ts` 中添加家庭组信息加载逻辑
- [x] 3.7 更新 `session-service.ts` 以包含家庭组上下文

## 4. API Routes - Family Group Management
- [x] 4.1 创建 `src/app/api/family-groups/route.ts` (POST - 创建家庭组)
- [x] 4.2 创建 `src/app/api/family-groups/[id]/route.ts` (GET - 获取详情)
- [x] 4.3 创建 `src/app/api/family-groups/[id]/route.ts` (DELETE - 解散家庭组)
- [x] 4.4 创建 `src/app/api/family-groups/[id]/join/route.ts` (POST - 通过邀请码加入)
- [x] 4.5 创建 `src/app/api/family-groups/[id]/leave/route.ts` (DELETE - 退出家庭组)
- [x] 4.6 创建 `src/app/api/family-groups/[id]/members/route.ts` (GET - 获取成员列表)
- [x] 4.7 创建 `src/app/api/family-groups/[id]/stats/route.ts` (GET - 获取统计)
- [x] 4.8 创建 `src/app/api/family-groups/my/route.ts` (GET - 获取当前用户的家庭组)
- [x] 4.9 在所有路由中应用权限验证中间件
- [x] 4.10 添加请求参数验证 schemas

## 5. API Middleware and Protection
- [x] 5.1 在 `api-protection.ts` 中添加 `protectFamilyGroupApi` 保护函数
- [x] 5.2 实现 `validateFamilyGroupAccess(user, groupId)` 权限检查
- [x] 5.3 实现 `validateCreatorAccess(user, groupId)` 创建者权限检查
- [x] 5.4 更新 `withDataIsolation` 以支持家庭组上下文

## 6. Frontend - Family Group Management UI
- [x] 6.1 创建 `src/app/dashboard/family-groups/page.tsx` (家庭组管理页)
- [x] 6.2 创建"创建家庭组"对话框组件
- [x] 6.3 创建"加入家庭组"对话框组件（输入邀请码）
- [x] 6.4 创建家庭组信息展示卡片
- [x] 6.5 创建成员列表展示组件
- [x] 6.6 创建"退出家庭组"确认对话框（仅普通成员）
- [x] 6.7 创建"解散家庭组"确认对话框（仅创建者）
- [x] 6.8 添加邀请码复制功能
- [x] 6.9 实现前端表单验证和错误处理
- [x] 6.10 添加加载状态和用户反馈

## 7. Frontend - Enhanced Statistics UI
- [x] 7.1 修改 `src/app/dashboard/page.tsx`，添加家庭组导航入口
- [x] 7.2 创建个人统计卡片（现有功能）
- [x] 7.3 创建家庭组成员统计列表组件
- [x] 7.4 创建家庭总统计卡片组件
- [x] 7.5 实现统计数据展示（卡片式布局）
- [x] 7.6 添加无家庭组状态的提示UI
- [x] 7.7 优化统计数据展示逻辑

## 8. Frontend - Transaction List Enhancement
- [x] 8.1 家庭组成员可查看所有成员账单（后端已实现）
- [x] 8.2 数据访问控制自动处理成员筛选（后端已实现）
- [x] 8.3 交易列表支持多成员数据显示（后端API已支持）
- [x] 8.4 账单包含userId标识（数据库已支持）
- [x] 8.5 列表性能优化（使用现有分页机制）

## 9. WeChat Miniprogram - Family Group Pages
- [x] 9.1 创建 `miniprogram/pages/family/` 目录
- [x] 9.2 实现 family.js 业务逻辑（330+行）
- [x] 9.3 实现 family.wxml UI模板（330+行）
- [x] 9.4 实现 family.wxss 样式文件（700+行）
- [x] 9.5 实现 family.json 配置文件
- [x] 9.6 在 app.json 注册页面
- [x] 9.7 在"我的"页面添加入口
- [x] 9.8 实现创建/加入家庭组功能
- [x] 9.9 实现成员列表和统计展示
- [x] 9.10 实现退出/解散功能

## Dependencies and Parallelization Opportunities

**Can be parallelized**:
- Tasks 2, 4, 6, 7, 8, 9 (API routes, frontend, tests)
- Tasks 15.1-15.3 (linting, formatting)

**Sequential dependencies**:
- 1 → 2 (必须先完成数据库迁移)
- 2 → 3, 4 (服务层必须在API和中间件之前)
- 3 → 4 (数据访问控制必须在API之前)
- 2 → 6 (前端依赖API接口)

**Critical path**:
1 → 2 → 3 → 4 → 6/7 → 14 (核心功能必须按顺序完成)
