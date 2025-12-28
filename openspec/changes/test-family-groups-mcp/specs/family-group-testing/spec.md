# Capability: Family Group Testing

## Context

This capability defines the testing requirements for the family groups feature, ensuring all user flows work correctly through automated end-to-end testing using Chrome DevTools MCP.

## ADDED Requirements

### Requirement: Automated E2E Testing Infrastructure

The testing framework SHALL provide automated end-to-end testing infrastructure for family group functionality using Chrome DevTools MCP to validate all user flows work correctly.

#### Scenario: Setup test environment

**Given** the development server is running
**And** the database is accessible
**And** Chrome DevTools MCP is configured
**When** the tester opens the browser to localhost:3000
**Then** the application should load successfully
**And** the tester can navigate to all pages

#### Scenario: Clean test data before testing

**Given** test accounts may exist from previous runs
**When** the test suite starts
**Then** all existing test accounts (test_family_*) should be deleted
**And** related family group data should be cleaned up
**And** the database should be in a clean state

### Requirement: User Registration and Authentication Testing

The testing framework SHALL validate user registration and authentication flows through automated browser interactions to ensure users can successfully create accounts and log in.

#### Scenario: Automated user registration

**Given** the registration page is loaded
**When** the tester fills in valid user details
  - username: test_family_1
  - email: test1@example.com
  - password: Test123456
**And** submits the registration form
**Then** the registration should succeed
**And** the user should be automatically logged in
**And** the user should be redirected to the dashboard

#### Scenario: Automated user login

**Given** the user is logged out
**And** the login page is loaded
**When** the tester enters valid credentials
**And** submits the login form
**Then** the login should succeed
**And** the session should be established
**And** the user should have access to protected pages

#### Scenario: Automated user logout

**Given** the user is logged in
**When** the tester clicks the logout button
**Then** the session should be terminated
**And** the user should be redirected to the login page
**And** protected pages should be inaccessible

### Requirement: Family Group Creation Testing

The testing framework SHALL validate family group creation functionality through automated testing to ensure authenticated users can create family groups and generate valid invite codes.

#### Scenario: Create family group as authenticated user

**Given** the user is logged in
**And** the family groups page is loaded
**When** the tester clicks "创建家庭组" button
**And** enters a family group name "测试家庭"
**And** submits the creation form
**Then** the family group should be created successfully
**And** an invite code should be generated
**And** the invite code should be displayed on the page
**And** the invite code should be 8 characters long
**And** the invite code should contain only uppercase letters and numbers

#### Scenario: Copy invite code to clipboard

**Given** a family group has been created
**And** the invite code is displayed
**When** the tester clicks the copy button
**Then** the invite code should be copied to clipboard
**And** a confirmation message "已复制" should be displayed
**And** the message should disappear after 2 seconds

### Requirement: Family Group Join Testing

The testing framework SHALL validate the family group join flow through automated testing to ensure users can join existing family groups using invite codes while preventing invalid joins.

#### Scenario: Join family group with valid invite code

**Given** a family group exists with invite code "AB12CD34"
**And** a different user is logged in
**And** the family groups page is loaded
**When** the tester clicks "加入家庭组" button
**And** enters the invite code "AB12CD34"
**And** submits the join form
**Then** the user should join the family group successfully
**And** the member list should display all members
**And** the creator should be marked with a crown icon
**And** the family group statistics should be displayed

#### Scenario: Join family group with invalid invite code

**Given** a user is logged in
**And** the family groups page is loaded
**When** the tester clicks "加入家庭组" button
**And** enters an invalid invite code "INVALID"
**And** submits the join form
**Then** the join request should fail
**And** an appropriate error message should be displayed
**And** the user should not be added to any family group

#### Scenario: Prevent joining multiple family groups

**Given** a user is already a member of a family group
**When** the user attempts to join another family group
**Then** the join request should fail
**And** an error message "您已属于其他家庭组" should be displayed

#### Scenario: Prevent duplicate joining

**Given** a user is already a member of family group A
**When** the user attempts to join family group A again
**Then** the join request should fail
**And** an appropriate error message should be displayed

### Requirement: Data Access and Sharing Testing

The testing framework SHALL validate that family group members can access shared data correctly and that data isolation is properly enforced when users leave or are removed from family groups.

#### Scenario: View family member transactions

**Given** user A and user B are members of the same family group
**And** user A has created transaction records
**When** user B views the transaction list
**Then** user B should see user A's transactions
**And** the transactions should display user A's name
**And** the transaction amounts and details should be correct

#### Scenario: View family group statistics

**Given** multiple users are members of a family group
**And** each user has created transactions
**When** any member views the family group statistics
**Then** the system should display three levels of statistics:
  - Personal statistics (current user's data)
  - Member statistics (each member's data)
  - Family statistics (aggregate data)
**And** total income should be the sum of all members' income
**And** total expense should be the sum of all members' expenses
**And** transaction count should be the sum of all transactions

#### Scenario: Data isolation after leaving family group

**Given** user A is a member of a family group
**When** user A leaves the family group
**Then** user A should no longer see family group data
**And** user A should only see their own transactions
**And** other members should not see user A in the member list

### Requirement: Family Group Leave Testing

The testing framework SHALL validate the family group leave functionality to ensure non-creator members can leave while creators are prevented from leaving their own family groups.

#### Scenario: Member leaves family group

**Given** a non-creator user is a member of a family group
**And** the family group has multiple members
**When** the user clicks "退出家庭组" button
**And** confirms the action
**Then** the user should be removed from the family group
**And** the user should see the "not in any family group" state
**And** the member count should decrease by 1
**And** the user should not appear in other members' lists

#### Scenario: Creator cannot leave family group

**Given** the creator of a family group is logged in
**When** the creator attempts to leave the family group
**Then** the leave request should fail
**And** an error message "创建者不能退出家庭组" should be displayed
**And** the creator should remain in the family group

### Requirement: Family Group Dissolution Testing

The testing framework SHALL validate the family group dissolution functionality to ensure only creators can dissolve family groups and that dissolution properly removes all members and data.

#### Scenario: Creator dissolves family group

**Given** the creator of a family group is logged in
**And** the family group has multiple members
**When** the creator clicks "解散家庭组" button
**And** confirms the action
**Then** the family group should be deleted
**And** all members should be removed
**And** all members should see the "not in any family group" state
**And** the invite code should become invalid

#### Scenario: Non-creator cannot dissolve family group

**Given** a non-creator member is logged in
**When** the member attempts to dissolve the family group
**Then** the dissolution request should fail
**And** an error message "只有创建者可以解散家庭组" should be displayed
**And** the family group should remain intact

### Requirement: Bug Detection and Fixing

The testing framework SHALL detect bugs during automated testing and ensure they are properly documented, fixed, and validated, with synchronization between web and miniprogram implementations.

#### Scenario: Detect and report bugs

**Given** a test scenario is executed
**When** the actual behavior differs from expected behavior
**Then** the issue should be logged with:
  - Test scenario name
  - Expected behavior
  - Actual behavior
  - Error messages
  - Page snapshots
  - API responses

#### Scenario: Fix bugs and validate

**Given** a bug has been reported
**When** the fix is implemented
**Then** the failing test scenario should be re-executed
**And** the test should pass
**And** the fix should not break other test scenarios

#### Scenario: Synchronize fixes between web and miniprogram

**Given** a bug is fixed in the web application
**And** the miniprogram has similar code/logic
**When** the fix is validated in web
**Then** the miniprogram code should be reviewed
**And** the same fix should be applied if needed
**And** the miniprogram functionality should be validated

### Requirement: Test Documentation

The testing framework SHALL maintain comprehensive test documentation including test reports with execution results, discovered issues, and evidence such as screenshots and logs for future reference.

#### Scenario: Generate test report

**Given** all test scenarios have been executed
**When** the test report is generated
**Then** the report should include:
  - Test environment details
  - Test execution summary (pass/fail counts)
  - Detailed results for each scenario
  - List of discovered issues
  - Fix status for each issue
  - Test coverage metrics

#### Scenario: Store test evidence

**Given** a test scenario is executed
**When** critical steps are performed
**Then** the following should be captured:
  - Page snapshots
  - Network request logs
  - Console messages
  - API responses
**And** the evidence should be stored for future reference
