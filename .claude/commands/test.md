---
name: Test
description: Create and run tests for the application
category: Testing
tags: [test, vitest, testing]
---

**Testing Guidelines**

This project uses Vitest for testing. Follow these guidelines:

**Test Structure**
- Test files should be co-located with source files or in `src/test/` directory
- Use `.test.ts` or `.spec.ts` suffix
- Follow AAA pattern: Arrange, Act, Assert

**What to Test**
- API routes: test authentication, authorization, request/response handling
- Services: test business logic, edge cases, error handling
- Utilities: test pure functions with various inputs
- Data access: test query building, filtering logic

**What NOT to Test**
- Third-party libraries (trust they work)
- Database/Prisma internals
- Framework internals (Next.js functionality)

**Database Testing**
- Use `vi.mock()` for Prisma client
- Focus on testing query construction and filtering logic
- Test `SecureDataAccess` filtering behavior
- Verify authorization checks

**API Testing**
- Test protected routes with proper authentication
- Verify data isolation between users
- Test error scenarios (401, 403, 404, 500)
- Validate input validation schemas

**Test Categories**
1. **Unit Tests**: Individual functions and classes
2. **Integration Tests**: API routes with mocked dependencies
3. **E2E Tests**: Critical user flows (use QA agent for these)

**Common Test Patterns**

```typescript
// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    transaction: { findMany: vi.fn() }
  }
}))

// Mock authentication
const mockUser = { id: 1, role: 'USER' }
vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

// Test API protection
await expect(GET(request)).resolves.toEqual(
  expect.objectContaining({ status: 401 })
)
```

**Running Tests**
- `npm run test` - Run all tests once
- `npm run test:watch` - Watch mode
- `npm run test:ui` - UI interface

**Process**
1. Identify what needs testing
2. Create test file if needed
3. Write test cases covering:
   - Happy path
   - Edge cases
   - Error conditions
   - Authorization boundaries
4. Run tests and ensure they pass
5. Report coverage if requested
