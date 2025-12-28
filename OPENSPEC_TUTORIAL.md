# OpenSpec 使用教程

## 什么是 OpenSpec？

OpenSpec 是一个**规范驱动开发**工具，用于在编写代码前对齐人类和 AI 编码助手。它帮助团队在开始编码前对需求达成一致，确保 AI 助手（如 Claude Code、Cursor、Windsurf 等）能够按照统一的规范工作。

### 核心价值

- **先规范，后实现** - 在写代码前明确需求和设计
- **AI 协作标准化** - 让不同 AI 工具使用相同的规范格式
- **增量文档** - 将变更提案归档为活的规范文档
- **团队协作** - 支持多人使用不同 AI 工具协同工作

---

## 安装与初始化

### 1. 安装 OpenSpec CLI

**前提条件**：Node.js 20.19.0 或更高版本

```bash
# 全局安装 OpenSpec CLI
npm install -g @fission-ai/openspec@latest

# 验证安装
openspec --version
```

### 2. 在项目中初始化

```bash
# 进入项目根目录
cd my-project

# 初始化 OpenSpec（交互式）
openspec init
```

初始化过程中会提示你选择使用的 AI 工具：
- Claude Code
- Cursor
- Windsurf
- CodeBuddy
- OpenCode
- 其他（通过通用 `AGENTS.md` 支持）

### 3. 项目结构

初始化后，会创建以下目录结构：

```
openspec/
├── specs/           # 规范文件（已归档的最终规范）
│   └── auth/
│       └── spec.md
├── changes/         # 进行中的变更提案
│   └── add-2fa/
│       ├── proposal.md    # 变更的目的和范围
│       ├── tasks.md       # 实施任务清单
│       ├── design.md      # 技术决策（可选）
│       └── specs/         # 规范变更（delta）
│           └── auth/
│               └── spec.md
└── AGENTS.md        # AI 助手指令文件（自动生成）
```

---

## 核心概念

### 1. Spec（规范）

规范是系统的最终权威文档，包含：
- **Purpose** - 该规范的目的
- **Requirements** - 系统需求（使用 SHALL/MUST 关键字）
- **Scenarios** - 需求的场景描述（WHEN/THEN 格式）

示例：

```markdown
# Auth Specification

## Purpose
Authentication and session management.

## Requirements

### Requirement: User Authentication
The system SHALL issue a JWT on successful login.

#### Scenario: Valid credentials
- WHEN a user submits valid credentials
- THEN a JWT is returned

#### Scenario: Invalid credentials
- WHEN a user submits invalid credentials
- THEN an error is returned
```

### 2. Change（变更）

变更是进行中的工作，包含：
- **proposal.md** - 为什么需要这个变更
- **tasks.md** - 实施任务清单
- **design.md** - 技术设计（可选）
- **specs/** - 规范变更（增量）

### 3. Delta（增量）

增量描述对现有规范的变更，支持三种操作：
- **ADDED** - 新增需求
- **MODIFIED** - 修改现有需求
- **REMOVED** - 删除需求

示例：

```markdown
## ADDED Requirements

### Requirement: Two-Factor Authentication
Users MUST provide a second factor during login.

#### Scenario: OTP required
- WHEN valid credentials are provided
- THEN an OTP challenge is required
```

---

## 工作流程

### 标准工作流程

```
1. 创建变更提案
   ↓
2. AI 生成任务清单
   ↓
3. 实施代码
   ↓
4. 归档变更到规范
   ↓
5. 规范成为活文档
```

### 步骤 1：创建变更

使用 AI 助手（如 Claude Code）触发 `/openspec` 工作流：

```
我想要为系统添加两步验证功能，请使用 OpenSpec 创建变更提案
```

AI 会创建：
```
openspec/changes/add-2fa/
├── proposal.md
├── tasks.md
└── specs/auth/spec.md
```

**proposal.md 示例**：

```markdown
# Add Two-Factor Authentication

## Why
We need two-factor authentication to enhance security and meet compliance requirements.

## What Changes
- Add OTP generation endpoint
- Modify login flow to require OTP
- Add OTP verification endpoint
- Update UI to support OTP input
```

**tasks.md 示例**：

```markdown
## 1. Database Setup
- [ ] 1.1 Add OTP secret column to users table
- [ ] 1.2 Create OTP verification logs table

## 2. Backend Implementation
- [ ] 2.1 Add OTP generation endpoint
- [ ] 2.2 Modify login flow to require OTP
- [ ] 2.3 Add OTP verification endpoint

## 3. Frontend Updates
- [ ] 3.1 Create OTP input component
- [ ] 3.2 Update login flow UI
```

### 步骤 2：实施变更

按照 `tasks.md` 中的清单实施代码，完成后勾选任务：

```markdown
## 1. Database Setup
- [x] 1.1 Add OTP secret column to users table
- [x] 1.2 Create OTP verification logs table

## 2. Backend Implementation
- [x] 2.1 Add OTP generation endpoint
- [x] 2.2 Modify login flow to require OTP
- [x] 2.3 Add OTP verification endpoint

## 3. Frontend Updates
- [x] 3.1 Create OTP input component
- [x] 3.2 Update login flow UI
```

### 步骤 3：归档变更

变更完成后，将变更归档到主规范：

```bash
# 列出所有变更
openspec list

# 归档指定变更
openspec archive add-2fa
```

归档会：
1. 将变更中的 delta 合并到主规范
2. 将变更目录移动到 `openspec/archive/YYYY-MM-DD-add-2fa/`
3. 更新 `openspec/specs/` 中的规范文件

---

## 常用命令

### 查看命令帮助

```bash
openspec --help
```

### 初始化项目

```bash
openspec init
```

### 列出变更

```bash
# 列出所有进行中的变更
openspec list
```

### 归档变更

```bash
# 交互式选择变更归档
openspec archive

# 直接指定变更名称
openspec archive add-2fa
```

### 更新 AI 配置

```bash
# 当更换 AI 工具时，更新配置
openspec update
```

---

## 规范编写最佳实践

### 1. 使用正确的关键字

需求必须包含 **SHALL** 或 **MUST** 关键字：

```markdown
# ✅ 正确
The system SHALL issue a JWT on successful login.
Users MUST provide a valid email address.

# ❌ 错误
The system issues a JWT on successful login.
Users provide a valid email address.
```

### 2. 场景使用 WHEN/THEN 格式

```markdown
#### Scenario: User login with valid credentials
- WHEN a user submits valid email and password
- AND the account is active
- THEN a JWT token is returned
- AND session expires in 24 hours
```

### 3. 保持需求原子性

每个需求应该关注单一功能点：

```markdown
# ✅ 好的做法
### Requirement: Password Validation
Passwords MUST be at least 8 characters.

### Requirement: Password Complexity
Passwords MUST contain uppercase, lowercase, and numbers.

# ❌ 不好的做法
### Requirement: Password
Passwords must be 8 characters with uppercase, lowercase, numbers, and must be hashed, and must be expired after 90 days.
```

### 4. 清晰的变更描述

在 `proposal.md` 中明确变更的范围：

```markdown
# In Scope
- OTP generation and verification
- UI for OTP input
- Database schema changes

# Out of Scope
- SMS/Email delivery (assumed existing service)
- Backup codes
- Authenticator app integration (future phase)
```

---

## 与 AI 助手协作

### 使用 Claude Code

1. 确保 `CLAUDE.md` 包含 OpenSpec 指令（`openspec init` 自动配置）
2. 直接对话创建变更：

```
请使用 OpenSpec 为用户添加忘记密码功能
```

3. Claude 会自动：
   - 创建 `openspec/changes/add-forgot-password/`
   - 生成 `proposal.md`、`tasks.md`
   - 更新相关规范的 delta

4. 完成后归档：

```
请使用 OpenSpec 归档 add-forgot-password 变更
```

### 使用 Cursor/Windsurf

同样通过对话触发，确保 `AGENTS.md` 已正确配置：

```
/openspec: 创建一个导出交易数据为 CSV 的功能
```

---

## TypeScript 验证

OpenSpec 提供 Zod schemas 用于验证规范结构：

```typescript
import {
  SpecSchema,
  ChangeSchema,
  RequirementSchema,
  ScenarioSchema,
  DeltaSchema
} from '@fission-ai/openspec';

// 验证场景
const scenario = {
  rawText: 'Given a user\nWhen they login\nThen authenticated'
};
const scenarioResult = ScenarioSchema.safeParse(scenario);
console.log(scenarioResult.success); // true

// 验证需求
const requirement = {
  text: 'The system SHALL provide user authentication',
  scenarios: [scenario]
};
const reqResult = RequirementSchema.safeParse(requirement);
console.log(reqResult.success); // true

// 验证规范
const spec = {
  name: 'auth',
  overview: 'Authentication specification',
  requirements: [requirement]
};
const specResult = SpecSchema.safeParse(spec);
console.log(specResult.success); // true
```

---

## 团队协作建议

### 1. 增量采用

- 从小功能开始使用 OpenSpec
- 每次变更归档后成为活文档
- 逐步构建完整的系统规范

### 2. 多工具协作

- 不同团队成员可使用不同的 AI 工具
- 所有工具共享同一个 `openspec/` 目录
- 使用 `openspec update` 同步工具配置

### 3. 代码审查

在 PR 中包含：
- 变更的 `proposal.md`（说明为什么）
- 已完成的 `tasks.md`（说明做了什么）
- 规范 delta（说明规范变更）

---

## 项目中的实际应用

针对当前的记账应用系统，可以使用 OpenSpec 管理以下规范：

### 已有功能规范

- `auth/` - 认证和会话管理
- `transactions/` - 交易记录 CRUD
- `agent/` - AI 自然语言解析
- `admin/` - 管理员功能
- `export/` - 数据导出

### 新功能示例

添加新功能时使用 OpenSpec：

```bash
# 示例：添加交易分类预算功能
# AI 会创建 openspec/changes/add-budget-feature/
```

**proposal.md**：

```markdown
# Add Transaction Budget Feature

## Why
Users want to set budgets for different transaction categories to track spending limits.

## What Changes
- Add budget CRUD endpoints
- Add budget tracking to transaction service
- Create budget dashboard UI
- Add budget exceeded notifications
```

**tasks.md**：

```markdown
## 1. Database
- [ ] Create budgets table
- [ ] Add foreign key to categories

## 2. Backend
- [ ] Implement budget service
- [ ] Add budget validation to transactions
- [ ] Create budget API endpoints

## 3. Frontend
- [ ] Create budget management page
- [ ] Add budget progress indicators
- [ ] Implement budget alerts
```

---

## 故障排查

### 问题：AI 助手不识别 `/openspec` 命令

**解决**：
1. 检查 `openspec/AGENTS.md` 是否存在
2. 重启 AI 工具（命令在启动时加载）
3. 确认 AI 工具在初始化时被选择

### 问题：归档时提示任务未完成

**解决**：
- 检查 `tasks.md` 是否所有任务都已勾选
- 使用 `openspec archive --force` 强制归档（如确认可归档）

### 问题：规范合并冲突

**解决**：
- 手动检查 `openspec/specs/*/spec.md`
- 解决冲突后再次运行 `openspec archive`

---

## 参考资源

- **官方文档**: https://github.com/fission-ai/openspec
- **当前版本**: 0.17.2
- **Node.js 要求**: >= 20.19.0

---

## 总结

OpenSpec 通过以下方式提升开发效率：

1. **明确需求** - 在编码前明确要做什么
2. **标准化协作** - AI 和人类使用统一的规范语言
3. **活文档** - 规范随代码演进，始终保持最新
4. **可追溯** - 每个功能都有提案、任务和规范变更

开始使用：
```bash
npm install -g @fission-ai/openspec@latest
openspec init
```

让你的下一个功能开发先从规范开始！
