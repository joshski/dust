/**
 * dust init - Initialize a new Dust repository
 */

import {
  type CheckConfig,
  type DustSettings,
  detectDustCommand,
  detectInstallDependenciesHint,
  detectTestCommand,
} from '../../config/settings'
import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult, FileSystem } from '../types'

const DUST_DIRECTORIES = ['goals', 'ideas', 'tasks', 'facts', 'config']

/**
 * Generates starter settings based on detected project type.
 * Returns settings with appropriate dustCommand and checks.
 */
function generateSettings(cwd: string, fileSystem: FileSystem): DustSettings {
  const dustCommand = detectDustCommand(cwd, fileSystem)
  const installDependenciesHint = detectInstallDependenciesHint(cwd, fileSystem)
  const testCommand = detectTestCommand(cwd, fileSystem)
  const checks: CheckConfig[] = []

  if (testCommand) {
    checks.push({ name: 'test', command: testCommand })
  }

  return { dustCommand, checks, installDependenciesHint }
}

const USE_DUST_FACT = `# Use dust for planning

This project uses [dust](https://github.com/joshski/dust) for planning and documentation.
`

export async function init(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies
  const dustPath = `${context.cwd}/.dust`
  const dustCommand = detectDustCommand(context.cwd, fileSystem)
  const agentInstruction = `Always immediately run \`${dustCommand} agent\` when you start working in this repository.`

  if (fileSystem.exists(dustPath)) {
    context.stdout('Note: .dust directory already exists, skipping creation')
  } else {
    await fileSystem.mkdir(dustPath, { recursive: true })

    for (const dir of DUST_DIRECTORIES) {
      await fileSystem.mkdir(`${dustPath}/${dir}`, { recursive: true })
    }

    await fileSystem.writeFile(
      `${dustPath}/facts/use-dust-for-planning.md`,
      USE_DUST_FACT
    )

    // Generate and write settings.json
    const settings = generateSettings(context.cwd, fileSystem)
    await fileSystem.writeFile(
      `${dustPath}/config/settings.json`,
      `${JSON.stringify(settings, null, 2)}\n`
    )

    context.stdout('Initialized Dust repository in .dust/')
    context.stdout(`Created directories: ${DUST_DIRECTORIES.join(', ')}`)
    context.stdout('Created initial fact: .dust/facts/use-dust-for-planning.md')
    context.stdout('Created settings: .dust/config/settings.json')
  }

  // Create CLAUDE.md if it doesn't exist
  const claudeMdPath = `${context.cwd}/CLAUDE.md`
  if (fileSystem.exists(claudeMdPath)) {
    context.stdout(
      `Warning: CLAUDE.md already exists. Consider adding: "${agentInstruction}"`
    )
  } else {
    const claudeContent = loadTemplate('claude-md', { dustCommand })
    await fileSystem.writeFile(claudeMdPath, claudeContent)
    context.stdout('Created CLAUDE.md with agent instructions')
  }

  // Create AGENTS.md if it doesn't exist
  const agentsMdPath = `${context.cwd}/AGENTS.md`
  if (fileSystem.exists(agentsMdPath)) {
    context.stdout(
      `Warning: AGENTS.md already exists. Consider adding: "${agentInstruction}"`
    )
  } else {
    const agentsContent = loadTemplate('agents-md', { dustCommand })
    await fileSystem.writeFile(agentsMdPath, agentsContent)
    context.stdout('Created AGENTS.md with agent instructions')
  }

  // Show helpful suggestions for next steps
  const runner = dustCommand.split(' ')[0]
  context.stdout('')
  context.stdout('Commit the changes if you are happy, then get planning!')
  context.stdout('')
  context.stdout(
    'If this is a new repository, you can start adding ideas or tasks right away:'
  )
  context.stdout(
    `> ${runner} claude "Idea: friendly UI for non-technical users"`
  )
  context.stdout(`> ${runner} codex "Task: set up code coverage"`)
  context.stdout('')
  context.stdout(
    'If this is an existing codebase, you might want to backfill goals and facts:'
  )
  context.stdout(
    `> ${runner} claude "Add goals and facts based on the code in this repository"`
  )

  return { exitCode: 0 }
}
