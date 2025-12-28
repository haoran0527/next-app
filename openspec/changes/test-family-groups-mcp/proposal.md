# Change: Test Family Groups Feature with Chrome DevTools MCP

## Why

家庭组功能已完成开发（change: add-family-groups），但尚未经过系统性的端到端测试。使用 Chrome DevTools MCP 工具可以自动化测试 Web 端的完整用户流程，确保功能在实际浏览器环境中的正确性和稳定性。

本次测试将覆盖以下关键场景：
1. **用户注册与登录** - 验证测试账号自动创建和认证流程
2. **创建家庭组** - 测试创建者端创建流程和邀请码生成
3. **邀请成员加入** - 测试邀请码分享和加入流程
4. **成员数据访问** - 验证家庭成员间的数据共享功能
5. **退出与解散** - 测试成员退出和创建者解散流程

通过自动化测试发现潜在的 Bug 和用户体验问题，并在 Web 端和微信小程序端同步修复相关问题。

## What Changes

### 新增测试基础设施
- 创建 Chrome DevTools MCP 自动化测试脚本
- 实现测试账号自动注册和清理机制
- 建立测试数据隔离和清理流程

### 测试覆盖范围
1. **注册流程测试**
   - 自动注册测试用户（user1, user2, user3）
   - 验证登录状态和会话管理

2. **家庭组操作测试**
   - User1 创建家庭组
   - 生成并复制邀请码
   - User2 通过邀请码加入
   - User3 通过邀请码加入

3. **数据访问测试**
   - 验证各成员能看到家庭组内所有数据
   - 测试统计数据准确性（个人/成员/家庭统计）
   - 验证数据隔离（非家庭成员无法访问）

4. **退出与解散测试**
   - User2 退出家庭组
   - 验证退出后无法访问家庭组数据
   - User1（创建者）解散家庭组
   - 验证解散后所有成员失去访问权限

5. **边界条件测试**
   - 用户重复加入（应该失败）
   - 创建者尝试退出（应该失败）
   - 非创建者尝试解散（应该失败）
   - 无效邀请码加入（应该失败）

### Bug 修复与同步
- 在测试过程中发现的问题将记录并修复
- Web 端修复后，同步检查并修复微信小程序端的类似问题
- 确保两端功能一致性

### 预期产出
- 详细的测试报告（包含发现的问题）
- 修复后的代码（如有必要）
- 测试脚本和文档（供未来回归测试使用）

## Impact

- **Affected specs**:
  - 不影响现有规格，属于质量保证活动
  - 可能发现需要修复的实现缺陷

- **Affected code**:
  - 新增：`openspec/changes/test-family-groups-mcp/test-script.js` - 自动化测试脚本
  - 可能修改：Web 端家庭组相关页面（`src/app/dashboard/family-groups/page.tsx`）
  - 可能修改：小程序端家庭组页面（`miniprogram/pages/family/*`）
  - 可能修改：API 端点（`src/app/api/family-groups/**/*`）
  - 可能修改：服务层（`src/lib/services/family-group-service.ts`）

- **Breaking changes**:
  - 无破坏性变更，仅修复发现的 Bug

- **Testing requirements**:
  - 使用 Chrome DevTools MCP 工具
  - 需要访问运行中的 Next.js 开发服务器
  - 需要数据库连接（测试环境或开发环境）

## Dependencies

- 依赖已完成的 `add-family-groups` 变更
- 需要运行中的开发服务器（`npm run dev`）
- 需要 Chrome DevTools MCP 服务器配置
- 需要测试数据库或开发数据库
