---
name: Refactor
description: Refactor code to improve quality, maintainability, and performance
category: Code Quality
tags: [refactor, cleanup, optimization]
---

**Refactoring Guidelines**

When refactoring code in this project, follow these principles:

**Before Refactoring**
1. Read and understand the existing code
2. Identify specific problems or smells
3. Ensure tests exist (create them first if needed)
4. Clearly define the refactoring goal

**Refactoring Principles**
- **Keep it small**: One logical change at a time
- **Preserve behavior**: Refactoring shouldn't change functionality
- **Test frequently**: Run tests after each change
- **Commit often**: Small, focused commits

**Common Refactorings**

**Extract Function**
- When: A function is too long or does multiple things
- How: Extract logical blocks into named functions
- Benefit: Improved readability and testability

**Extract Component**
- When: A React component has complex subsections
- How: Create separate components for each section
- Benefit: Reusability and clearer structure

**Introduce Parameter Object**
- When: Functions have too many parameters (>4)
- How: Group related parameters into an object
- Benefit: Easier to extend and maintain

**Replace Magic Numbers/Strings**
- When: Hardcoded values appear in code
- How: Extract to named constants
- Benefit: Self-documenting code

**Simplify Conditional Logic**
- When: Nested if/else or complex conditions
- How: Use early returns, guard clauses, or strategy pattern
- Benefit: Improved readability

**Remove Duplication**
- When: Similar code appears in multiple places
- How: Extract to shared functions/utilities
- Benefit: Single source of truth

**Type Safety Improvements**
- When: Using `any` or missing types
- How: Add proper TypeScript types
- Benefit: Catch errors at compile time

**Database Query Optimization**
- When: N+1 queries or missing indexes
- How: Use `include`/`select` in Prisma, add indexes
- Benefit: Better performance

**Process**
1. **Understand**: Read the code thoroughly
2. **Identify**: Find specific refactoring opportunities
3. **Plan**: Decide on the refactoring approach
4. **Execute**: Make the changes incrementally
5. **Verify**: Run tests to ensure behavior unchanged
6. **Document**: Update comments/docs if needed

**What to Avoid**
- Don't refactor and add features simultaneously
- Don't skip tests ("it's just a refactor")
- Don't change APIs/interfaces without considering consumers
- Don't optimize prematurely without measurements

**Refactoring Checklist**
- [ ] Tests exist and pass
- [ ] Only structural changes, no behavioral changes
- [ ] Code is easier to understand
- [ ] Duplication reduced
- [ ] Types are properly defined
- [ ] No new dependencies introduced unnecessarily
- [ ] Performance not degraded
