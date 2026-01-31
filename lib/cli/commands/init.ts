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

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
}

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
    context.stdout(
      `${colors.yellow}📦 Note:${colors.reset} ${colors.cyan}.dust${colors.reset} directory already exists, skipping creation`
    )
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

    context.stdout(
      `${colors.green}✨ Initialized${colors.reset} Dust repository in ${colors.cyan}.dust/${colors.reset}`
    )
    context.stdout(
      `${colors.green}📁 Created directories:${colors.reset} ${colors.dim}${DUST_DIRECTORIES.join(', ')}${colors.reset}`
    )
    context.stdout(
      `${colors.green}📄 Created initial fact:${colors.reset} ${colors.cyan}.dust/facts/use-dust-for-planning.md${colors.reset}`
    )
    context.stdout(
      `${colors.green}⚙️  Created settings:${colors.reset} ${colors.cyan}.dust/config/settings.json${colors.reset}`
    )
  }

  // Create CLAUDE.md if it doesn't exist
  const claudeMdPath = `${context.cwd}/CLAUDE.md`
  if (fileSystem.exists(claudeMdPath)) {
    context.stdout(
      `${colors.yellow}⚠️  Warning:${colors.reset} ${colors.cyan}CLAUDE.md${colors.reset} already exists. Consider adding: ${colors.dim}"${agentInstruction}"${colors.reset}`
    )
  } else {
    const claudeContent = loadTemplate('claude-md', { dustCommand })
    await fileSystem.writeFile(claudeMdPath, claudeContent)
    context.stdout(
      `${colors.green}📄 Created${colors.reset} ${colors.cyan}CLAUDE.md${colors.reset} with agent instructions`
    )
  }

  // Create AGENTS.md if it doesn't exist
  const agentsMdPath = `${context.cwd}/AGENTS.md`
  if (fileSystem.exists(agentsMdPath)) {
    context.stdout(
      `${colors.yellow}⚠️  Warning:${colors.reset} ${colors.cyan}AGENTS.md${colors.reset} already exists. Consider adding: ${colors.dim}"${agentInstruction}"${colors.reset}`
    )
  } else {
    const agentsContent = loadTemplate('agents-md', { dustCommand })
    await fileSystem.writeFile(agentsMdPath, agentsContent)
    context.stdout(
      `${colors.green}📄 Created${colors.reset} ${colors.cyan}AGENTS.md${colors.reset} with agent instructions`
    )
  }

  // Show helpful suggestions for next steps
  const runner = dustCommand.split(' ')[0]
  context.stdout('')
  context.stdout(
    `${colors.bold}🚀 Next steps:${colors.reset} Commit the changes if you are happy, then get planning!`
  )
  context.stdout('')
  context.stdout(
    `${colors.dim}If this is a new repository, you can start adding ideas or tasks right away:${colors.reset}`
  )
  context.stdout(
    `   ${colors.cyan}>${colors.reset} ${runner} claude "Idea: friendly UI for non-technical users"`
  )
  context.stdout(
    `   ${colors.cyan}>${colors.reset} ${runner} codex "Task: set up code coverage"`
  )
  context.stdout('')
  context.stdout(
    `${colors.dim}If this is an existing codebase, you might want to backfill goals and facts:${colors.reset}`
  )
  context.stdout(
    `   ${colors.cyan}>${colors.reset} ${runner} claude "Add goals and facts based on the code in this repository"`
  )

  return { exitCode: 0 }
}
