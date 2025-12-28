## ADDED Requirements

### Requirement: Family Group Creation
The system SHALL allow users to create family groups and automatically assign them the CREATOR role.

#### Scenario: 成功创建家庭组
- **WHEN** 用户提供家庭组名称
- **THEN** 系统创建新的家庭组记录
- **AND** 生成唯一的8字符邀请码
- **AND** 将用户设置为创建者角色
- **AND** 返回家庭组信息和邀请码

#### Scenario: 创建失败 - 用户已属于其他家庭组
- **WHEN** 用户已属于某个家庭组
- **THEN** 系统拒绝创建请求
- **AND** 返回错误信息"您已属于其他家庭组，无法创建新的家庭组"

#### Scenario: 创建失败 - 无效名称
- **WHEN** 用户提供的名称为空或超过100字符
- **THEN** 系统拒绝创建请求
- **AND** 返回验证错误

### Requirement: Family Group Invitation
The system SHALL provide an invitation code mechanism that allows users to join family groups.

#### Scenario: 生成邀请码
- **WHEN** 家庭组创建成功
- **THEN** 系统自动生成8字符随机邀请码
- **AND** 邀请码由大写字母和数字组成
- **AND** 邀请码全局唯一

#### Scenario: 成员通过邀请码加入
- **WHEN** 用户提供有效的邀请码
- **AND** 用户不属于任何家庭组
- **THEN** 系统将用户添加到家庭组
- **AND** 用户角色为 MEMBER
- **AND** 记录加入时间

#### Scenario: 加入失败 - 邀请码不存在
- **WHEN** 用户提供无效的邀请码
- **THEN** 系统拒绝加入请求
- **AND** 返回错误信息"邀请码无效或家庭组不存在"

#### Scenario: 加入失败 - 用户已属于其他家庭组
- **WHEN** 用户已属于某个家庭组
- **THEN** 系统拒绝加入请求
- **AND** 返回错误信息"您已属于其他家庭组，无法加入"

#### Scenario: 加入失败 - 已是该组成员
- **WHEN** 用户尝试加入自己已所属的家庭组
- **THEN** 系统拒绝加入请求
- **AND** 返回错误信息"您已在该家庭组中"

### Requirement: Family Group Membership Management
The system SHALL allow members to leave family groups and creators to dissolve family groups.

#### Scenario: 普通成员退出家庭组
- **WHEN** 普通成员发起退出请求
- **THEN** 系统删除该成员的家庭组关联
- **AND** 用户变为无家庭组状态
- **AND** 用户的账单数据保留但不再对原家庭组成员可见

#### Scenario: 创建者尝试退出失败
- **WHEN** 创建者发起退出请求
- **THEN** 系统拒绝退出请求
- **AND** 返回错误信息"您是家庭组创建者，无法退出。请先解散家庭组。"

#### Scenario: 创建者解散家庭组
- **WHEN** 创建者发起解散请求
- **THEN** 系统删除家庭组记录
- **AND** 删除所有成员的关联关系
- **AND** 所有成员变为无家庭组状态

#### Scenario: 非创建者尝试解散失败
- **WHEN** 普通成员发起解散请求
- **THEN** 系统拒绝解散请求
- **AND** 返回错误信息"只有创建者可以解散家庭组"

### Requirement: Family Group Data Access
The system SHALL allow family group members to view transaction data from all members within the same group.

#### Scenario: 成员查看家庭组账单
- **WHEN** 用户属于某个家庭组
- **AND** 用户查询账单列表
- **THEN** 系统返回所有家庭成员的账单
- **AND** 账单按日期倒序排列
- **AND** 每条账单显示所属用户信息

#### Scenario: 无家庭组用户查看账单
- **WHEN** 用户不属于任何家庭组
- **AND** 用户查询账单列表
- **THEN** 系统仅返回该用户自己的账单
- **AND** 行为与之前版本保持一致

#### Scenario: 管理员查看账单
- **WHEN** 管理员用户查询账单
- **THEN** 系统返回所有用户的账单（不受家庭组限制）

### Requirement: Family Group Statistics
The system SHALL provide statistical analysis at three levels: personal, per-member, and family aggregate.

#### Scenario: 获取家庭组统计
- **WHEN** 用户请求家庭组统计
- **AND** 用户属于某个家庭组
- **THEN** 系统返回三层统计数据：
  - **个人统计**: 当前用户的总收支和余额
  - **成员统计**: 每个成员的收支明细和余额
  - **家庭统计**: 整个家庭组的总收支和余额

#### Scenario: 无家庭组用户请求统计
- **WHEN** 无家庭组的用户请求家庭组统计
- **THEN** 系统返回错误信息"您不属于任何家庭组"

#### Scenario: 统计数据包含交易数量
- **WHEN** 系统计算统计数据
- **THEN** 每个统计层级都包含交易记录总数
- **AND** 分别统计收入和支出的笔数

### Requirement: Family Group Member List
The system SHALL provide an endpoint for users to retrieve the list of members in their family group.

#### Scenario: 查看成员列表
- **WHEN** 用户请求家庭成员列表
- **AND** 用户属于某个家庭组
- **THEN** 系统返回所有成员信息：
  - 用户ID
  - 用户名
  - 昵称
  - 角色（CREATOR/MEMBER）
  - 加入时间

#### Scenario: 无家庭组用户请求成员列表
- **WHEN** 无家庭组的用户请求成员列表
- **THEN** 系统返回错误信息"您不属于任何家庭组"

### Requirement: Single Group Membership Constraint
The system MUST enforce that each user can belong to at most one family group at any time.

#### Scenario: 强制单一家庭组约束
- **WHEN** 用户尝试创建或加入第二个家庭组
- **THEN** 系统拒绝操作
- **AND** 返回错误信息提示用户先退出当前家庭组

#### Scenario: 数据库层面的唯一性约束
- **WHEN** 数据库写入成员关系
- **THEN** 数据库通过唯一索引确保 userId 在 family_members 表中唯一
- **AND** 并发创建请求会被数据库拒绝

### Requirement: Family Group Metadata
The system SHALL store basic metadata for each family group including name, creator, invite code, and timestamps.

#### Scenario: 家庭组包含名称
- **WHEN** 用户创建家庭组
- **THEN** 家庭组必须有1-100字符的名称
- **AND** 名称用于UI展示

#### Scenario: 家庭组包含创建者信息
- **WHEN** 家庭组创建成功
- **THEN** 系统记录创建者用户ID
- **AND** 创建者关系通过外键关联

#### Scenario: 家庭组包含创建时间
- **WHEN** 家庭组创建成功
- **THEN** 系统自动记录创建时间戳
- **AND** 创建时间不可修改

### Requirement: API Endpoint Security
All family group API endpoints MUST enforce authentication and authorization checks before processing requests.

#### Scenario: 未认证用户访问家庭组API
- **WHEN** 未登录用户请求家庭组API
- **THEN** 系统返回401未授权错误
- **AND** 不执行任何业务逻辑

#### Scenario: 创建者专用操作权限检查
- **WHEN** 用户执行创建者专用操作（如解散）
- **AND** 用户不是创建者
- **THEN** 系统返回403禁止访问错误

#### Scenario: 成员操作权限检查
- **WHEN** 用户尝试操作不属于自己的家庭组
- **THEN** 系统返回403禁止访问错误
- **AND** 错误信息"您无权访问该家庭组"
