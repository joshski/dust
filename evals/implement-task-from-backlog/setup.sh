#!/bin/bash
# Setup script for implement-task-from-backlog eval
# Creates a full dust project with a multi-step task in the backlog

set -e

# Initialize git repo (required for dust)
git init --quiet
git config user.email "test@example.com"
git config user.name "Test User"
git config commit.gpgsign false

# Create .dust directory structure
mkdir -p .dust/tasks .dust/goals .dust/ideas .dust/facts

# Create a goal
cat > .dust/goals/code-quality.md << 'GOALEOF'
# Code Quality

Maintain high code quality through well-tested, modular utility functions.
GOALEOF

# Create a multi-step task
cat > .dust/tasks/add-string-utilities.md << 'TASKEOF'
# Add string utilities module

Create a string utilities module with common string manipulation functions. The module should be well-tested and follow the existing project conventions.

## Goals

- [Code Quality](../goals/code-quality.md)

## Blocked By

(none)

## Definition of Done

- [ ] Create `src/string-utils.js` exporting three functions: `capitalize`, `reverse`, and `truncate`
- [ ] `capitalize(str)` returns the string with first character uppercased
- [ ] `reverse(str)` returns the string reversed
- [ ] `truncate(str, maxLength)` returns the string truncated to maxLength with '...' appended if it was longer
- [ ] Create `test/string-utils.test.js` with tests for all three functions
- [ ] All tests pass when running `npm test`
- [ ] Update `src/index.js` to import and re-export the string utilities
TASKEOF

# Create a fact about the project
cat > .dust/facts/project-structure.md << 'FACTEOF'
# Project Structure

- `src/index.js` - Main entry point, re-exports all modules
- `src/math-utils.js` - Math utility functions
- `test/` - Test files using Node.js built-in test runner (`node --test 'test/**/*.test.js'`)
- `package.json` - Project configuration with `npm test` script
FACTEOF

# Create existing source files
mkdir -p src test

cat > src/math-utils.js << 'SRCEOF'
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = { add, subtract };
SRCEOF

cat > src/index.js << 'SRCEOF'
const mathUtils = require('./math-utils');

module.exports = {
  ...mathUtils,
};
SRCEOF

# Create existing test file as an example
cat > test/math-utils.test.js << 'TESTEOF'
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { add, subtract } = require('../src/math-utils');

describe('math-utils', () => {
  describe('add', () => {
    it('adds two numbers', () => {
      assert.strictEqual(add(2, 3), 5);
    });
  });

  describe('subtract', () => {
    it('subtracts two numbers', () => {
      assert.strictEqual(subtract(5, 3), 2);
    });
  });
});
TESTEOF

# Create package.json
cat > package.json << 'PKGEOF'
{
  "name": "test-project",
  "version": "1.0.0",
  "scripts": {
    "test": "node --test 'test/**/*.test.js'"
  }
}
PKGEOF

# Create CLAUDE.md
cat > CLAUDE.md << EOF
# Claude Code Instructions

This project uses dust for planning and documentation.

Always immediately run \`$DUST_BIN agent\` when you start working in this repository.
EOF

# Create bin/dust wrapper
mkdir -p bin
cat > bin/dust << EOF
#!/bin/bash
exec "$DUST_BIN" "\$@"
EOF
chmod +x bin/dust

# Make initial commit so git operations work
git add -A
git commit --quiet -m "Initial project setup"

echo "Test directory setup complete at $TEST_DIR"
