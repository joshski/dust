# Over-Abstraction Audit

Add a stock audit that identifies violations of the "reasonably-dry" principle—code that has been over-engineered with excessive abstraction.

## Context

The "reasonably-dry" principle states that "Don't Repeat Yourself" is a good principle, but don't overdo it. Over-abstraction can make code harder to understand and modify than targeted duplication.

Signs of over-abstraction include:
- Abstractions used in only one place
- Deep inheritance hierarchies
- Generic "framework" code for simple tasks
- Configuration-driven logic that could be explicit code
- Excessive indirection (many layers of wrappers)
- Premature generalization for "future needs"

Currently, there is no stock audit to systematically identify over-abstraction. This audit would complement existing code quality audits by focusing specifically on unnecessary complexity.

## Proposed Audit

Create an `over-abstraction` stock audit in `lib/audits/stock-audits.ts` that:

1. **Identifies single-use abstractions**:
   - Interfaces or base classes with only one implementation
   - Utility functions or helpers called from only one place
   - Generic abstractions created before there are 2+ concrete cases
   - Factory functions that always produce the same type

2. **Detects abstraction complexity**:
   - Deep inheritance hierarchies (3+ levels)
   - Chain of wrappers (function calling wrapper calling wrapper)
   - Configuration files driving simple logic
   - Type gymnastics for minimal benefit

3. **Finds premature generalization**:
   - Parameters that are always the same value
   - Options/flags that are never varied
   - "Plugin systems" with one plugin
   - "Strategy patterns" with one strategy

4. **Suggests simplification**:
   - Inline single-use abstractions
   - Replace configuration with explicit code
   - Flatten inheritance hierarchies
   - Remove unused flexibility

## Related Principles

- **reasonably-dry** - Primary principle this audit enforces
- **make-the-change-easy** - Sometimes duplication makes change easier
- **clarity-over-brevity** - Simple duplicated code can be clearer than abstract code
- **context-optimised-code** - Over-abstraction burdens context windows

## Example Patterns to Detect

```javascript
// Single-use interface
interface UserRepository {
  findById(id: string): User
}

class PostgresUserRepository implements UserRepository {
  findById(id: string): User { ... }
}
// No other implementations exist - interface adds no value

// Single-use abstraction
function createUserProcessor(config) {
  return new UserProcessor(config)
}
// Called once with same config - could just instantiate directly

// Over-parameterized for no benefit
function formatDate(date, format = 'YYYY-MM-DD', locale = 'en-US', timezone = 'UTC') {
  // Always called as formatDate(date) with all defaults
}

// Configuration-driven simple logic
const operations = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
}

function calculate(operation, a, b) {
  return operations[operation](a, b)
}
// Could just be: if/switch or separate functions

// Deep inheritance hierarchy
class Entity { }
class DomainEntity extends Entity { }
class User extends DomainEntity { }
class AdminUser extends User { }
// Deep hierarchy for minimal shared behavior

// Generic wrapper adding no value
function executeQuery(query) {
  return database.execute(query)
}
// Just call database.execute directly
```

## Output Format

For each over-abstraction found, create ideas containing:
- Type of over-abstraction (single-use, deep hierarchy, premature generalization, etc.)
- Location and description
- Why it's problematic (complexity without benefit)
- Usage analysis (how often is the abstraction used, how is it varied)
- Suggested simplification approach
- Estimated impact of simplification

## Open Questions

### How should the audit determine if an abstraction is valuable?

#### Option: Count usage and variation

Flag abstractions used in <2 places or always used the same way.

Pros: Objective, data-driven
Cons: Misses valuable abstractions that enforce consistency

#### Option: Complexity vs benefit analysis

Compare the complexity cost of the abstraction against the benefits it provides.

Pros: More nuanced
Cons: Subjective, hard to automate

#### Option: Age-based heuristic

Flag recent abstractions with low usage; allow old abstractions as they may have historical value.

Pros: Avoids flagging legacy code
Cons: Allows old over-abstraction to persist

### Should the audit flag all single-use abstractions?

#### Option: Flag all single-use cases

Report any abstraction used in only one place.

Pros: Comprehensive, simple rule
Cons: May flag abstractions created in anticipation of future use

#### Option: Exclude "boundary" abstractions

Allow single-use abstractions at system boundaries (e.g., repository interfaces for testing).

Pros: Recognizes legitimate use cases
Cons: Requires classifying abstraction purposes

#### Option: Consider age

Only flag single-use abstractions older than N months—newer ones might be work-in-progress.

Pros: Allows room for growth
Cons: Allows old dead abstractions

### How should the audit handle test-focused abstractions?

#### Option: Exclude test utilities

Don't flag abstractions that exist primarily to enable testing.

Pros: Recognizes testing value
Cons: May excuse over-abstraction in tests

#### Option: Apply same standards

Treat test code like production code—flag over-abstraction equally.

Pros: Consistent, simple
Cons: May flag legitimate test helpers

### Should the audit suggest automatic refactoring?

#### Option: Provide inline suggestions

For simple cases (e.g., single-use wrapper function), suggest exact code to inline.

Pros: Actionable, low-friction
Cons: May suggest wrong refactoring

#### Option: Identify pattern only

Flag over-abstraction without prescribing specific fixes.

Pros: Avoids bad suggestions
Cons: Less actionable

### How should the audit handle framework/library patterns?

#### Option: Respect framework conventions

Don't flag abstractions that match framework patterns (e.g., React component wrappers, factory functions in DI frameworks).

Pros: Reduces noise, respects ecosystem conventions
Cons: Requires framework detection

#### Option: Flag all patterns

Report all over-abstraction regardless of framework.

Pros: Comprehensive, simple
Cons: Noisy for projects using abstraction-heavy frameworks

### What depth of inheritance should be considered excessive?

#### Option: Strict limit (2 levels)

Flag any hierarchy deeper than 2 levels.

Pros: Encourages composition over inheritance
Cons: May be too strict for some domains

#### Option: Moderate limit (3 levels)

Flag hierarchies deeper than 3 levels.

Pros: Balanced
Cons: Still allows significant complexity

#### Option: Context-dependent

Consider domain complexity when determining acceptable depth.

Pros: Nuanced
Cons: Subjective, hard to automate
