# Change: Add Family Groups Feature

## Why

家庭记账场景中，多用户协同管理财务数据是一个核心需求。当前系统只支持单用户数据隔离，无法满足家庭成员共享账单、统计家庭总收支的需求。该功能将使系统能够支持小型团队（家庭）的财务协作，同时保持数据安全性和权限控制。

## What Changes

- **新增数据库模型**:
  - `FamilyGroup` 模型：存储家庭组基本信息（名称、创建者、邀请码）
  - `FamilyMember` 模型：存储用户与家庭组的关联关系

- **新增业务能力**:
  - 用户可以创建家庭组并成为创建者
  - 创建者生成邀请码并邀请其他成员加入
  - 用户通过邀请码加入家庭组
  - 创建者可以解散家庭组
  - 普通成员可以退出家庭组
  - 每个用户最多属于一个家庭组
  - 家庭组成员可以查看组内所有成员的账单
  - 增强统计功能：个人统计 + 家庭组成员统计 + 家庭总统计

- **权限调整**:
  - 扩展现有的 `SecureDataAccess` 机制，增加家庭组数据访问维度
  - 修改 `applyUserFilter` 逻辑，使成员可以访问同家庭组的数据
  - 保持管理员权限不变

- **API 端点**:
  - `POST /api/family-groups` - 创建家庭组
  - `POST /api/family-groups/{id}/join` - 通过邀请码加入
  - `DELETE /api/family-groups/{id}/leave` - 退出家庭组
  - `DELETE /api/family-groups/{id}` - 解散家庭组（仅创建者）
  - `GET /api/family-groups/{id}/members` - 获取成员列表
  - `GET /api/family-groups/{id}/stats` - 获取家庭组统计

## Impact

- **Affected specs**:
  - 新增 capability: `family-groups`
  - 修改 capability: `data-access` (扩展数据隔离逻辑)

- **Affected code**:
  - `prisma/schema.prisma` - 数据库模型
  - `src/lib/services/data-access-control.ts` - 数据访问控制逻辑
  - `src/lib/services/family-group-service.ts` - 新建服务
  - `src/lib/middleware/api-protection.ts` - API保护中间件
  - `src/app/api/family-groups/` - 新建API路由
  - `src/app/dashboard/` - 前端UI界面（家庭组管理、统计展示）

- **Breaking changes**:
  - 无破坏性变更，向后兼容现有单用户功能

- **Data migration**:
  - 不需要数据迁移，现有用户默认不属于任何家庭组
