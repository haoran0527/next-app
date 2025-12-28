# Claude Skills 使用指南

本文档介绍如何在项目中使用 Claude Code Skills 来提高开发效率。

## 什么是 Skills?

Skills 是可重用的提示词模板，用于执行常见的开发任务。通过使用 `/skill-name` 命令，可以让 Claude 按照预定义的工作流程执行任务。

## 可用的 Skills

### 1. `/commit` - Git 提交

创建符合 Conventional Commits 规范的 Git 提交。

**使用方法:**
```
/commit
```

**功能:**
- 自动分析代码变更
- 生成规范的提交信息
- 创建提交（需要用户确认）

**示例:**
```bash
# 修改了一些代码后
/commit
# Claude 会分析变更并创建提交，如:
# feat(transaction): add category filter to transaction list
```

---

### 2. `/review` - 代码审查

对代码进行全面审查，关注安全性、性能和最佳实践。

**使用方法:**
```
/review
```

**审查内容:**
- **安全性**: OWASP Top 10 漏洞检查
- **代码质量**: TypeScript 类型安全、错误处理
- **性能**: N+1 查询、不必要的重渲染
- **测试覆盖**: 关键路径的测试覆盖
- **框架规范**: Next.js App Router、微信小程序最佳实践

**适用场景:**
- 合并 Pull Request 前
- 完成重要功能开发后
- 代码重构后
- 定期代码健康检查

**输出示例:**
```
## Summary
发现了 2 个关键问题和 3 个改进建议

## Critical Issues
- src/app/api/transactions/route.ts:45 - SQL 注入风险
- src/lib/services/transaction-service.ts:78 - 缺少用户数据隔离

## Major Issues
- ...

## Positive Notes
- 良好的错误处理
- 清晰的类型定义
```

---

### 3. `/test` - 测试

创建和运行测试。

**使用方法:**
```
/test
```

**功能:**
- 为新代码创建测试
- 运行现有测试
- 检查测试覆盖率
- 修复失败的测试

**测试类型:**
- **单元测试**: 独立函数和类
- **集成测试**: API 路由
- **端到端测试**: 完整用户流程（使用 QA agent）

**测试命令:**
```bash
npm run test          # 运行所有测试
npm run test:watch    # 监视模式
npm run test:ui       # UI 界面
```

**示例场景:**
```bash
# 创建了一个新的 API 路由
/test 请为 src/app/api/transactions/route.ts 创建测试

# 运行所有测试
/test 运行所有测试并报告覆盖率

# 测试失败时
/test 修复失败的测试
```

---

### 4. `/refactor` - 代码重构

改善代码质量、可维护性和性能。

**使用方法:**
```
/refactor
```

**重构类型:**
- 提取函数/组件
- 消除代码重复
- 简化复杂逻辑
- 改进类型安全
- 优化数据库查询
- 提升性能

**重构原则:**
- ✅ 小步前进，一次一个改动
- ✅ 保持行为不变
- ✅ 频繁运行测试
- ✅ 提交小而聚焦的变更

**示例场景:**
```bash
# 函数太长
/refactor src/lib/services/transaction-service.ts 中的 getTransactions 函数太长了

# 有重复代码
/refactor 消除 src/app/api/ 中的重复错误处理代码

# 性能优化
/refactor 优化 transaction list 的查询性能，存在 N+1 问题
```

---

### 5. `/deploy` - 部署

将应用部署到生产服务器。

**使用方法:**
```
/deploy
```

**部署流程:**
1. **预部署检查**
   - 运行测试
   - 本地构建验证
   - TypeScript 类型检查
   - 代码规范检查

2. **自动化部署**
   ```bash
   ./deploy.bat
   ```

3. **部署后验证**
   - 健康检查
   - 功能测试
   - 日志检查

**生产环境:**
- 服务器: 121.89.202.27
- 部署方式: SSH + 自动化脚本
- 数据库: PostgreSQL (需要迁移前备份)

**回滚流程:**
```bash
# 如果部署失败
pm2 revert accounting-app
# 或从备份恢复
```

**示例场景:**
```bash
# 部署到生产
/deploy 部署最新代码到生产环境

# 紧急修复后部署
/deploy 部署紧急修复，跳过部分检查（谨慎使用）
```

---

### 6. OpenSpec Skills

项目还包含 OpenSpec 相关的 skills 用于变更管理。

#### `/openspec:proposal` - 创建变更提案

创建新的 OpenSpec 变更提案并验证。

**使用方法:**
```
/openspec:proposal
```

**适用场景:**
- 新功能开发
- 重大架构变更
- 需要规划和设计的复杂任务

#### `/openspec:apply` - 应用已批准的变更

实施已批准的 OpenSpec 变更。

**使用方法:**
```
/openspec:apply <change-id>
```

#### `/openspec:archive` - 归档已部署的变更

归档已部署到生产的 OpenSpec 变更。

**使用方法:**
```
/openspec:archive <change-id>
```

---

## 最佳实践

### 1. 选择合适的 Skill

| 任务 | 推荐的 Skill |
|------|-------------|
| 创建 Git 提交 | `/commit` |
| PR 代码审查 | `/review` |
| 编写测试 | `/test` |
| 改善代码质量 | `/refactor` |
| 部署到生产 | `/deploy` |
| 规划新功能 | `/openspec:proposal` |

### 2. 组合使用 Skills

典型的开发工作流:
```
1. /openspec:proposal  # 规划功能
2. [开发代码]
3. /test              # 编写测试
4. /review            # 代码审查
5. /commit            # 提交代码
6. /deploy            # 部署到生产
```

代码重构工作流:
```
1. /refactor          # 识别问题
2. [重构代码]
3. /test              # 确保测试通过
4. /review            # 验证重构质量
5. /commit            # 提交变更
```

### 3. 提供上下文

使用 skills 时，提供足够的上下文可以获得更好的结果:

```
❌ /review

✅ /review 请审查 src/app/api/transactions/route.ts 的新增过滤功能，
   重点关注安全性和性能
```

### 4. 分阶段使用

对于复杂任务，分阶段使用 skills:

```
# 第一阶段：创建测试
/test 为新的 category filter 功能创建测试

# 第二阶段：代码审查
/review 审查 category filter 的实现

# 第三阶段：提交
/commit 提交 category filter 功能
```

---

## 自定义 Skills

你可以创建自己的 skills 来满足特定需求。

### Skill 文件位置
```
.claude/skills/
├── review.md
├── test.md
├── refactor.md
└── deploy.md
```

### Skill 文件格式

每个 skill 文件需要包含:

1. **Front Matter** (YAML)
```yaml
---
name: SkillName
description: 简短描述
category: 分类
tags: [tag1, tag2]
---
```

2. **Guidelines** (Markdown)
- 清晰的指导原则
- 使用步骤
- 示例场景
- 最佳实践

### 创建新 Skill 示例

创建 `.claude/skills/debug.md`:

```markdown
---
name: Debug
description: Debug issues and errors in the application
category: Troubleshooting
tags: [debug, fix, troubleshooting]
---

**Debugging Guidelines**

1. Understand the problem
2. Gather relevant logs/errors
3. Identify root cause
4. Propose solution
5. Verify fix

**Common Issues**
- Database connection errors
- Authentication failures
- API route errors
- TypeScript type errors

**Process**
...
```

创建后即可使用: `/debug`

---

## Agent vs Skill

项目中还配置了专门的 Agents，了解何时使用：

### 使用 Agents 当:
- 需要探索和理解代码库
- 执行复杂的、多步骤的任务
- 需要专门的领域知识（Next.js、微信小程序）
- 需要并行执行多个任务

### 使用 Skills 当:
- 执行标准的、定义明确的任务
- 遵循预定义的工作流程
- 需要一致的输出格式
- 任务相对简单直接

**示例对比:**
```
# 使用 Agent - 探索和复杂任务
"帮我理解整个认证系统的实现"
"添加一个完整的用户管理模块"

# 使用 Skill - 标准化任务
"/commit"
"/review 检查这个 PR"
"/test 为新功能编写测试"
```

---

## 进阶技巧

### 1. 在 Skill 中引用其他 Skill

```
/refactor 重构这个组件，完成后运行 /test 确保测试通过
```

### 2. 保存常用命令

在 `.claude/commands/` 中创建自定义命令（类似 OpenSpec）。

### 3. 结合 Hooks 使用

配置 hooks 在 skill 执行前后自动运行命令。

### 4. 批量操作

```
请并行执行：
1. /test 运行所有测试
2. /review 审查 src/app/api/
```

---

## 常见问题

### Q: Skill 执行失败怎么办?
A: 检查 skill 文件格式是否正确，front matter 是否完整。

### Q: 如何查看可用的 skills?
A: 查看 `.claude/skills/` 目录，或在 Claude Code 中输入 `/?` 查看帮助。

### Q: Skill 和 Agent 可以一起使用吗?
A: 可以! Agent 可以在内部调用 skill，你也可以在对话中同时使用。

### Q: 如何禁用某个 skill?
A: 删除或重命名对应的 `.md` 文件即可。

---

## 更新日志

- **2025-12-28**: 初始版本，包含 5 个核心 skills (commit, review, test, refactor, deploy)
- 集成 OpenSpec skills
- 创建使用指南

---

## 参考资源

- [Claude Code 官方文档](https://github.com/anthropics/claude-code)
- 项目开发指南: `CLAUDE.md`
- OpenSpec 指南: `openspec/AGENTS.md`
- Agent 配置: `AGENTS.md`

---

**提示**: 定期查看 `CLAUDE.md` 和 `openspec/AGENTS.md` 以获取最新的项目规范和指南。
