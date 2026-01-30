#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseRawEvent } from '../lib/claude/event-parser'
import { spawnClaudeCode } from '../lib/claude/spawn-claude-code'
import type { ClaudeEvent, ToolUseEvent } from '../lib/claude/types'

interface EvalConfig {
  prompt: string
  expectation: string
}

interface EvalResult {
  passed: boolean
  reason: string
  transcript: ClaudeEvent[]
  testDir: string
}

async function runSetupScript(
  evalDir: string,
  dustBinPath: string
): Promise<string> {
  const setupScript = join(evalDir, 'setup.sh')
  if (!existsSync(setupScript)) {
    throw new Error(`setup.sh not found in ${evalDir}`)
  }

  const testDir = mkdtempSync(join(tmpdir(), 'dust-eval-'))

  const result = spawnSync('bash', [setupScript], {
    cwd: testDir,
    env: {
      ...process.env,
      DUST_BIN: dustBinPath,
      TEST_DIR: testDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.status !== 0) {
    const stderr = result.stderr?.toString() || ''
    throw new Error(`setup.sh failed: ${stderr}`)
  }

  return testDir
}

async function collectEvents(
  prompt: string,
  testDir: string,
  dustBinPath: string
): Promise<ClaudeEvent[]> {
  const events: ClaudeEvent[] = []

  const systemPrompt = `You are working in a dust project directory. The dust binary is available at: ${dustBinPath}`

  for await (const rawEvent of spawnClaudeCode(prompt, {
    cwd: testDir,
    dangerouslySkipPermissions: true,
    maxTurns: 5,
    systemPrompt,
  })) {
    for (const event of parseRawEvent(rawEvent)) {
      events.push(event)
    }
  }

  return events
}

async function evaluateWithHaiku(
  transcript: ClaudeEvent[],
  expectation: string
): Promise<{ passed: boolean; reason: string }> {
  const toolUses = transcript.filter(
    (e): e is ToolUseEvent => e.type === 'tool_use'
  )

  const transcriptSummary = toolUses
    .map(t => `Tool: ${t.name}, Input: ${JSON.stringify(t.input)}`)
    .join('\n')

  const evaluationPrompt = `You are evaluating whether an AI agent's behavior matched the expected outcome.

## Expectation
${expectation}

## Agent Actions (tools used)
${transcriptSummary || '(no tools were used)'}

## Task
Determine if the agent's behavior satisfied the expectation. Respond with a JSON object:
{"passed": true/false, "reason": "brief explanation"}

Only respond with the JSON object, nothing else.`

  const events: ClaudeEvent[] = []
  for await (const rawEvent of spawnClaudeCode(evaluationPrompt, {
    model: 'haiku',
    maxTurns: 1,
    dangerouslySkipPermissions: true,
  })) {
    for (const event of parseRawEvent(rawEvent)) {
      events.push(event)
    }
  }

  const resultEvent = events.find(e => e.type === 'result')
  if (resultEvent && resultEvent.type === 'result' && resultEvent.result) {
    try {
      const jsonMatch = resultEvent.result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // Fall through to default
    }
  }

  return { passed: false, reason: 'Failed to parse evaluation response' }
}

async function runEval(evalDir: string): Promise<EvalResult> {
  const configPath = join(evalDir, 'eval.json')
  if (!existsSync(configPath)) {
    throw new Error(`eval.json not found in ${evalDir}`)
  }

  const config: EvalConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
  const dustBinPath = resolve(process.cwd(), 'bin/dust')

  const testDir = await runSetupScript(evalDir, dustBinPath)

  try {
    const transcript = await collectEvents(config.prompt, testDir, dustBinPath)
    const evaluation = await evaluateWithHaiku(transcript, config.expectation)

    return {
      passed: evaluation.passed,
      reason: evaluation.reason,
      transcript,
      testDir,
    }
  } finally {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true })
  }
}

async function main() {
  const cliArguments = process.argv.slice(2)
  if (cliArguments.length === 0) {
    console.error('Usage: bun run eval <eval-name>')
    console.error('Example: bun run eval add-task-from-prompt')
    process.exit(1)
  }

  const evalName = cliArguments[0]
  const evalDir = join(process.cwd(), 'evals', evalName)

  if (!existsSync(evalDir)) {
    console.error(`Eval not found: ${evalDir}`)
    process.exit(1)
  }

  console.log(`Running eval: ${evalName}`)
  console.log('---')

  try {
    const result = await runEval(evalDir)

    if (result.passed) {
      console.log('✓ PASSED')
    } else {
      console.log('✗ FAILED')
    }
    console.log(`Reason: ${result.reason}`)

    process.exit(result.passed ? 0 : 1)
  } catch (error) {
    console.error('Error running eval:', error)
    process.exit(1)
  }
}

main()
