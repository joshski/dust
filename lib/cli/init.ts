/**
 * dust init - Initialize a new Dust repository
 */

import { detectDustCommand } from './settings'
import { loadTemplate } from './templates'
import type { CommandContext, CommandResult, FileSystem } from './types'

const DUST_DIRECTORIES = ['goals', 'ideas', 'tasks', 'facts']

const USE_DUST_FACT = `# Use dust for planning

This project uses [dust](https://github.com/joshski/dust) for planning and documentation.
`

export async function init(
  ctx: CommandContext,
  fs: FileSystem,
  _args: string[]
): Promise<CommandResult> {
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

    ctx.stdout('Initialized Dust repository in .dust/')
    ctx.stdout(`Created directories: ${DUST_DIRECTORIES.join(', ')}`)
    ctx.stdout('Created initial fact: .dust/facts/use-dust-for-planning.md')
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

  return { exitCode: 0 }
}
