---
name: Review
description: Perform comprehensive code review with focus on bugs, security, performance, and best practices
category: Code Quality
tags: [review, code-quality, security]
---

**Code Review Guidelines**

When reviewing code in this Next.js + WeChat Mini Program accounting application, focus on:

**Security & Safety**
- Check for OWASP Top 10 vulnerabilities (SQL injection, XSS, CSRF, etc.)
- Verify proper authentication and authorization checks
- Ensure user data isolation via `SecureDataAccess`
- Validate that sensitive data (passwords, tokens) is properly handled
- Review API endpoints for proper protection middleware usage

**Code Quality**
- Look for TypeScript type safety issues
- Check for proper error handling and edge cases
- Ensure Prisma queries use data access control
- Verify no hardcoded credentials or sensitive data
- Check for proper async/await usage

**Performance**
- Identify N+1 query problems in database operations
- Check for unnecessary re-renders in React components
- Look for missing database indexes
- Review caching strategies where applicable

**Testing**
- Verify critical paths have test coverage
- Check for proper test isolation
- Ensure test cases cover edge cases

**Next.js Specific**
- Check App Router conventions
- Verify proper server/client component usage
- Review API route protection patterns
- Ensure proper session management

**WeChat Mini Program**
- Review wx API usage patterns
- Check proper error handling for network requests
- Verify session token handling

**Process**
1. Read the changed files carefully
2. Identify issues categorized by severity (critical/major/minor)
3. Provide specific line references where issues exist
4. Suggest concrete improvements
5. Highlight positive aspects of the changes

**Output Format**
```
## Summary
[2-3 sentence overview]

## Critical Issues
[Must fix before merging]

## Major Issues
[Should fix before merging]

## Minor Issues
[Nice to have improvements]

## Positive Notes
[What was done well]
```
