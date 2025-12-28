# Claude Skills 快速参考

## 可用的 Skills

| 命令 | 功能 | 适用场景 |
|------|------|---------|
| `/commit` | Git 提交 | 创建符合规范的提交信息 |
| `/review` | 代码审查 | PR 审查、代码质量检查 |
| `/test` | 测试 | 创建测试、运行测试、覆盖率检查 |
| `/refactor` | 代码重构 | 改善代码质量、消除重复、优化性能 |
| `/deploy` | 部署 | 部署到生产服务器 |
| `/openspec:proposal` | 创建提案 | 规划新功能或重大变更 |
| `/openspec:apply` | 应用变更 | 实施已批准的 OpenSpec 变更 |
| `/openspec:archive` | 归档变更 | 归档已部署的变更 |

## 快速示例

```bash
# 开发工作流
/openspec:proposal    # 1. 规划功能
[开发代码]            # 2. 编写代码
/test                 # 3. 编写/运行测试
/review               # 4. 代码审查
/commit               # 5. 提交代码
/deploy               # 6. 部署到生产

# 代码审查
/review 请审查 src/app/api/transactions/route.ts

# 测试
/test 为 transaction service 创建单元测试

# 重构
/refactor 优化查询性能，解决 N+1 问题
```

## 详细文档

查看 `SKILLS_GUIDE.md` 获取完整的使用指南。

## 技能文件位置

`.claude/skills/`
- `review.md` - 代码审查指导
- `test.md` - 测试指导
- `refactor.md` - 重构指导
- `deploy.md` - 部署指导
