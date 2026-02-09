/**
 * dust ci check - Run quality checks with CI failure capture
 *
 * Wraps `dust check` to automatically capture failures as tasks:
 * 1. Runs all quality checks
 * 2. On failure, creates/updates .dust/tasks/fix-ci-failure.md with the output
 * 3. Tracks attempt count for circuit-breaker behavior
 * 4. After max attempts, self-blocks the task (human intervention required)
 * 5. On success, cleans up any existing failure task
 *
 * Circuit breaker: After ciMaxAttempts (default 3) failed attempts, the task's
 * "Blocked By" section references itself. This prevents `dust next` from showing
 * it to agents, breaking the fix-fail-retry loop. A human can unblock by editing
 * the task or deleting it.
 */

import { defaultShellRunner, type ShellRunner } from '../process-runner'
import type { CommandDependencies, CommandResult } from '../types'
import { check } from './check'

const TASK_FILENAME = 'fix-ci-failure.md'
const DEFAULT_MAX_ATTEMPTS = 3

export function parseAttempts(content: string): number {
  const match = content.match(/^## Attempts\s*\n\s*(\d+)/m)
  return match ? Number.parseInt(match[1], 10) : 0
}

function isSelfBlocked(content: string): boolean {
  const blockedByMatch = content.match(
    /^## Blocked By\s*\n([\s\S]*?)(?=\n## |\n*$)/m
  )
  if (!blockedByMatch) return false
  return blockedByMatch[1].includes(TASK_FILENAME)
}

export function renderFailureTask(
  checkOutput: string,
  attempts: number,
  selfBlocked: boolean
): string {
  const blockedBy = selfBlocked
    ? `- [fix-ci-failure](${TASK_FILENAME})`
    : '(none)'

  return `# Fix CI Failure

Fix the CI quality gate failures described below and ensure all checks pass.

## Failure Log

\`\`\`
${checkOutput.trimEnd()}
\`\`\`

## Attempts

${attempts}

## Goals

(none)

## Blocked By

${blockedBy}

## Definition of Done

- [ ] All checks in \`dust check\` pass
`
}

export async function ciCheck(
  dependencies: CommandDependencies,
  shellRunner: ShellRunner = defaultShellRunner
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies
  const dustPath = `${context.cwd}/.dust`
  const taskPath = `${dustPath}/tasks/${TASK_FILENAME}`
  const maxAttempts = settings.ciMaxAttempts ?? DEFAULT_MAX_ATTEMPTS

  // Capture check output while still displaying it
  const outputLines: string[] = []
  const captureContext = {
    ...context,
    stdout: (msg: string) => {
      outputLines.push(msg)
      context.stdout(msg)
    },
    stderr: (msg: string) => {
      outputLines.push(msg)
      context.stderr(msg)
    },
  }

  const checkResult = await check(
    { ...dependencies, context: captureContext },
    shellRunner
  )

  const tasksPath = `${dustPath}/tasks`

  if (checkResult.exitCode === 0) {
    // Success - clean up any existing failure task
    if (fileSystem.exists(taskPath)) {
      await fileSystem.unlink(taskPath)
      context.stdout('')
      context.stdout(
        `Removed .dust/tasks/${TASK_FILENAME} (checks now passing)`
      )
    }
    return checkResult
  }

  // Failure - create or update task
  const checkOutput = outputLines.join('\n')
  let attempts = 1

  if (fileSystem.exists(taskPath)) {
    const existingContent = await fileSystem.readFile(taskPath)

    // If already self-blocked, don't update further
    if (isSelfBlocked(existingContent)) {
      context.stdout('')
      context.stdout(
        `Task .dust/tasks/${TASK_FILENAME} is self-blocked (circuit breaker active). Human intervention required.`
      )
      return checkResult
    }

    attempts = parseAttempts(existingContent) + 1
  }

  // Ensure tasks directory exists
  if (!fileSystem.exists(tasksPath)) {
    await fileSystem.mkdir(tasksPath, { recursive: true })
  }

  const shouldSelfBlock = attempts > maxAttempts
  const taskContent = renderFailureTask(checkOutput, attempts, shouldSelfBlock)
  await fileSystem.writeFile(taskPath, taskContent)

  context.stdout('')
  if (shouldSelfBlock) {
    context.stdout(
      `Circuit breaker: ${maxAttempts} attempts exhausted. Task .dust/tasks/${TASK_FILENAME} is now self-blocked.`
    )
    context.stdout('   Human intervention required to fix this CI failure.')
    context.stdout(
      `   To re-enable agent attempts, edit the task's "Blocked By" section to "(none)".`
    )
  } else if (attempts === 1) {
    context.stdout(
      `Created .dust/tasks/${TASK_FILENAME} (attempt ${attempts}/${maxAttempts})`
    )
  } else {
    context.stdout(
      `Updated .dust/tasks/${TASK_FILENAME} (attempt ${attempts}/${maxAttempts})`
    )
  }

  return checkResult
}
