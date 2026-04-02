# Dependency Injection Audit

Add a stock audit that identifies violations of the dependency-injection principle, particularly global mocks and hard-coded dependencies.

## Context

The "dependency-injection" principle states that we should avoid global mocks. Hard-coded dependencies and global mocking make code harder to test, understand, and modify.

The principle is closely related to:
- "decoupled-code" - Explicit dependencies enable decoupling
- "design-for-testability" - Injectable dependencies improve testability
- "functional-core-imperative-shell" - Pure functions don't have hidden dependencies

Currently, there is no stock audit to systematically identify these violations. Common patterns include:
- Global mock setup that affects all tests
- Hard-coded imports of concrete implementations
- Singleton access instead of injection
- Test files that mock modules globally
- Functions that directly import side-effecting dependencies

## Proposed Audit

Create a `dependency-injection` stock audit in `lib/audits/stock-audits.ts` that:

1. **Identifies global mocking patterns**:
   - `jest.mock()` or `vi.mock()` at module level in test files
   - `beforeAll()` or `beforeEach()` that sets up global mocks
   - Mocking frameworks that replace global state
   - Test utilities that mutate global objects

2. **Detects hard-coded dependencies**:
   - Functions that directly import and call I/O operations (filesystem, network, etc.)
   - Direct instantiation of concrete classes instead of accepting interfaces
   - Singleton access patterns (`getInstance()`, global state)
   - Static method calls that can't be overridden

3. **Suggests alternatives**:
   - Convert global mocks to dependency injection in tests
   - Extract interfaces and inject implementations
   - Pass dependencies as parameters instead of importing directly
   - Use constructor injection or factory functions

## Related Principles

- **dependency-injection** - Primary principle this audit enforces
- **decoupled-code** - Explicit dependencies reduce coupling
- **design-for-testability** - Injectable dependencies enable testing
- **functional-core-imperative-shell** - Pure core has no hidden dependencies
- **stubs-over-mocks** - Hand-rolled stubs complement dependency injection

## Example Patterns to Detect

```javascript
// Global module mock (problematic)
vi.mock('fs')  // at module level

test('should read file', () => {
  // Test using globally mocked fs
})

// Hard-coded filesystem dependency
function loadConfig() {
  const content = fs.readFileSync('config.json')  // Hard-coded fs
  return JSON.parse(content)
}

// Better: injected dependency
function loadConfig(fileSystem) {
  const content = fileSystem.readFile('config.json')
  return JSON.parse(content)
}

// Singleton access pattern
class Database {
  static instance = null
  static getInstance() { ... }
}

function saveUser(user) {
  Database.getInstance().save(user)  // Hard-coded singleton
}

// Better: injected
function saveUser(user, database) {
  database.save(user)
}
```

## Output Format

For each violation found, create ideas containing:
- Location and type of violation (global mock, hard-coded import, singleton, etc.)
- Current implementation pattern
- Why it's problematic (testing difficulty, coupling, etc.)
- Suggested refactoring approach
- Estimated impact (how many tests or call sites affected)

## Open Questions

### Should the audit distinguish between test and production code?

#### Option: Separate analysis for tests vs production

Apply different rules: flag global mocks in tests, flag hard-coded I/O in production code.

Pros: Context-appropriate analysis
Cons: More complex implementation

#### Option: Unified analysis

Apply the same dependency injection principles to both test and production code.

Pros: Consistent, simpler
Cons: May flag acceptable test patterns

### How should the audit handle framework-provided globals?

#### Option: Allow framework-specific patterns

Recognize frameworks (React, Express, etc.) and permit their global dependencies (e.g., `process.env` in Node.js).

Pros: Reduces noise, respects conventions
Cons: Requires framework detection and pattern exceptions

#### Option: Flag all globals

Highlight all global dependencies, letting reviewers decide what's acceptable.

Pros: Comprehensive, no special cases
Cons: May create noise for legitimate framework usage

### Should the audit suggest specific refactoring approaches?

#### Option: Provide concrete refactoring examples

For each violation, show before/after code demonstrating how to inject the dependency.

Pros: Educational, actionable
Cons: May suggest approaches that don't fit the codebase architecture

#### Option: Identify pattern only

Flag violations without prescribing specific refactorings.

Pros: Avoids potentially wrong suggestions
Cons: Less actionable, requires more analysis

### How should the audit handle legitimate global state?

#### Option: Allow configuration for acceptable globals

Let projects specify which global dependencies are acceptable (e.g., `process.env`, logging).

Pros: Flexible, pragmatic
Cons: Requires configuration, may be overused

#### Option: Flag all global access

Report all global state access, including legitimate uses.

Pros: Comprehensive visibility
Cons: High noise ratio

### Should the audit detect inverse violations (over-injection)?

#### Option: Flag unnecessary parameter passing

Identify functions with many injected dependencies that could be simplified.

Pros: Balances injection with simplicity
Cons: Subjective, hard to automate

#### Option: Focus only on missing injection

Only flag places where dependency injection is needed, not where it's overdone.

Pros: Simpler, clearer scope
Cons: Misses over-engineering
