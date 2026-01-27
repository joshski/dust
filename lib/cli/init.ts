/**
 * dust init - Initialize a new Dust repository
 */

import { loadTemplate } from './templates'
import type { CommandContext, CommandResult, FileSystem } from './types'

const DUST_DIRECTORIES = ['goals', 'ideas', 'tasks', 'facts']

const DEFAULT_GOAL = `# Project Goal

Describe the high-level mission of this project.
`

function detectPackageRunner(cwd: string, fs: FileSystem): string {
  // Check runtime first
  if (process.versions.bun) {
    return 'bunx'
  }

  // Fall back to lockfile detection
  if (fs.exists(`${cwd}/bun.lockb`)) {
    return 'bunx'
  }
  if (fs.exists(`${cwd}/pnpm-lock.yaml`)) {
    return 'pnpx'
  }

  // Default to npx
  return 'npx'
}

export async function init(
  ctx: CommandContext,
  fs: FileSystem,
  _args: string[]
): Promise<CommandResult> {
  const dustPath = `${ctx.cwd}/.dust`
  const runner = detectPackageRunner(ctx.cwd, fs)
  const agentInstruction = `Always immediately run \`${runner} dust agent\` when you start working in this repository.`

  if (fs.exists(dustPath)) {
    ctx.stdout('Note: .dust directory already exists, skipping creation')
  } else {
    await fs.mkdir(dustPath, { recursive: true })

    for (const dir of DUST_DIRECTORIES) {
      await fs.mkdir(`${dustPath}/${dir}`, { recursive: true })
    }

    await fs.writeFile(`${dustPath}/goals/project-goal.md`, DEFAULT_GOAL)

    ctx.stdout('Initialized Dust repository in .dust/')
    ctx.stdout(`Created directories: ${DUST_DIRECTORIES.join(', ')}`)
    ctx.stdout('Created initial goal: .dust/goals/project-goal.md')
  }

  // Create CLAUDE.md if it doesn't exist
  const claudeMdPath = `${ctx.cwd}/CLAUDE.md`
  if (fs.exists(claudeMdPath)) {
    ctx.stdout(
      `Warning: CLAUDE.md already exists. Consider adding: "${agentInstruction}"`
    )
  } else {
    const claudeContent = loadTemplate('claude-md', { runner })
    await fs.writeFile(claudeMdPath, claudeContent)
    ctx.stdout('Created CLAUDE.md with agent instructions')
  }

  // Create AGENTS.md if it doesn't exist
  const agentsMdPath = `${ctx.cwd}/AGENTS.md`
  if (fs.exists(agentsMdPath)) {
    ctx.stdout(
      `Warning: AGENTS.md already exists. Consider adding: "${agentInstruction}"`
    )
  } else {
    const agentsContent = loadTemplate('agents-md', { runner })
    await fs.writeFile(agentsMdPath, agentsContent)
    ctx.stdout('Created AGENTS.md with agent instructions')
  }

  return { exitCode: 0 }
}
