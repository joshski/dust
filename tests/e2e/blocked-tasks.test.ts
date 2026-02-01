import { expect, test } from 'vitest'
import { runSession } from '../run-session'

test('agent sees only unblocked tasks when some are blocked', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {},
          ideas: {},
          tasks: {
            'setup-database.md': `# Setup Database

Create the database schema.

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Schema created
`,
            'add-user-model.md': `# Add User Model

Add the user model with authentication.

## Goals

(none)

## Blocked by

- [Setup Database](setup-database.md)

## Definition of done

- [ ] User model created
`,
          },
          facts: {},
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust next',
      },
      { pattern: /Setup Database/, getCommand: () => null },
    ],
  })

  // Only the unblocked task should be shown
  const nextOutput = session.turns[1].result.stdout
  expect(nextOutput).toContain('Setup Database')
  expect(nextOutput).not.toContain('Add User Model')
})

test('blocked task becomes available when blocker is completed', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {},
          ideas: {},
          tasks: {
            // Only the dependent task exists - blocker was deleted
            'add-user-model.md': `# Add User Model

Add the user model with authentication.

## Goals

(none)

## Blocked by

- [Setup Database](setup-database.md)

## Definition of done

- [ ] User model created
`,
          },
          facts: {},
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust next',
      },
      { pattern: /Add User Model/, getCommand: () => null },
    ],
  })

  // Task should now be available since blocker file doesn't exist
  expect(session.turns[1].result.stdout).toContain('Add User Model')
})

test('task with multiple blockers waits for all to complete', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {},
          ideas: {},
          tasks: {
            'setup-database.md': `# Setup Database

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Done
`,
            'setup-auth.md': `# Setup Auth

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Done
`,
            'add-user-api.md': `# Add User API

## Goals

(none)

## Blocked by

- [Setup Database](setup-database.md)
- [Setup Auth](setup-auth.md)

## Definition of done

- [ ] Done
`,
          },
          facts: {},
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust next',
      },
      { pattern: /Setup Auth/, getCommand: () => null },
    ],
  })

  const nextOutput = session.turns[1].result.stdout
  // Only unblocked tasks should appear
  expect(nextOutput).toContain('Setup Database')
  expect(nextOutput).toContain('Setup Auth')
  expect(nextOutput).not.toContain('Add User API')
})

test('chain of blocked tasks shows only the first available', async () => {
  const session = await runSession({
    fileSystemTree: {
      project: {
        '.dust': {
          goals: {},
          ideas: {},
          tasks: {
            'step-one.md': `# Step One

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Done
`,
            'step-two.md': `# Step Two

## Goals

(none)

## Blocked by

- [Step One](step-one.md)

## Definition of done

- [ ] Done
`,
            'step-three.md': `# Step Three

## Goals

(none)

## Blocked by

- [Step Two](step-two.md)

## Definition of done

- [ ] Done
`,
          },
          facts: {},
        },
      },
    },
    handlers: [
      {
        pattern: /Pick up work.*pick task/s,
        getCommand: () => 'bin/dust next',
      },
      { pattern: /Step One/, getCommand: () => null },
    ],
  })

  const nextOutput = session.turns[1].result.stdout
  expect(nextOutput).toContain('Step One')
  expect(nextOutput).not.toContain('Step Two')
  expect(nextOutput).not.toContain('Step Three')
})
