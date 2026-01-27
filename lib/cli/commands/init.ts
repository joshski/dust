/**
 * dust init - Initialize a new Dust repository
 */

import {
  type CheckConfig,
  type DustSettings,
  detectDustCommand,
} from '../settings'
import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult, FileSystem } from '../types'

const DUST_DIRECTORIES = ['goals', 'ideas', 'tasks', 'facts', 'config']

/**
 * Generates starter settings based on detected project type.
 * Returns settings with appropriate dustCommand and checks.
 */
function generateSettings(cwd: string, fs: FileSystem): DustSettings {
  const dustCommand = detectDustCommand(cwd, fs)
  const checks: CheckConfig[] = []

  // Detect project type and add appropriate test check
  if (fs.exists(`${cwd}/bun.lockb`)) {
    checks.push({ name: 'test', command: 'bun test' })
  } else if (fs.exists(`${cwd}/pnpm-lock.yaml`)) {
    checks.push({ name: 'test', command: 'pnpm test' })
  } else if (
    fs.exists(`${cwd}/package-lock.json`) ||
    fs.exists(`${cwd}/package.json`)
  ) {
    checks.push({ name: 'test', command: 'npm test' })
  }

  return { dustCommand, checks }
}

const USE_DUST_FACT = `# Use dust for planning

This project uses [dust](https://github.com/joshski/dust) for planning and documentation.
`

export async function init(deps: CommandDependencies): Promise<CommandResult> {
  const { context: ctx, fileSystem: fs } = deps
  const dustPath = `${ctx.cwd}/.dust`
  const dustCommand = detectDustCommand(ctx.cwd, fs)
  const agentInstruction = `Always immediately run \`${dustCommand} agent\` when you start working in this repository.`

  if (fs.exists(dustPath)) {
    ctx.stdout('Note: .dust directory already exists, skipping creation')
  } else {
    await fs.mkdir(dustPath, { recursive: true })

    for (const dir of DUST_DIRECTORIES) {
      await fs.mkdir(`${dustPath}/${dir}`, { recursive: true })
    }

    await fs.writeFile(
      `${dustPath}/facts/use-dust-for-planning.md`,
      USE_DUST_FACT
    )

    // Generate and write settings.json
    const settings = generateSettings(ctx.cwd, fs)
    await fs.writeFile(
      `${dustPath}/config/settings.json`,
      `${JSON.stringify(settings, null, 2)}\n`
    )

    ctx.stdout('Initialized Dust repository in .dust/')
    ctx.stdout(`Created directories: ${DUST_DIRECTORIES.join(', ')}`)
    ctx.stdout('Created initial fact: .dust/facts/use-dust-for-planning.md')
    ctx.stdout('Created settings: .dust/config/settings.json')
  }

  // Create CLAUDE.md if it doesn't exist
  const claudeMdPath = `${ctx.cwd}/CLAUDE.md`
  if (fs.exists(claudeMdPath)) {
    ctx.stdout(
      `Warning: CLAUDE.md already exists. Consider adding: "${agentInstruction}"`
    )
  } else {
    const claudeContent = loadTemplate('claude-md', { dustCommand })
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
    const agentsContent = loadTemplate('agents-md', { dustCommand })
    await fs.writeFile(agentsMdPath, agentsContent)
    ctx.stdout('Created AGENTS.md with agent instructions')
  }

  // Show helpful suggestions for next steps
  const runner = dustCommand.split(' ')[0]
  ctx.stdout('')
  ctx.stdout('Commit the changes if you are happy, then get planning!')
  ctx.stdout('')
  ctx.stdout(
    'If this is a new repository, you can start adding ideas or tasks right away:'
  )
  ctx.stdout(`> ${runner} claude "Idea: friendly UI for non-technical users"`)
  ctx.stdout(`> ${runner} codex "Task: set up code coverage"`)
  ctx.stdout('')
  ctx.stdout(
    'If this is an existing codebase, you might want to backfill goals and facts:'
  )
  ctx.stdout(
    `> ${runner} claude "Add goals and facts based on the code in this repository"`
  )

  return { exitCode: 0 }
}
