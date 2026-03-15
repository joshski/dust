/**
 * dust init - Initialize a new Dust repository
 */

import {
  type CheckConfig,
  type DustSettings,
  detectDustCommand,
  detectTestCommand,
} from '../../config/settings'
import type { RuntimeConfig } from '../../env-config'
import { getColors } from '../colors'
import { dedent } from '../dedent'
import type { CommandDependencies, CommandResult, FileSystem } from '../types'

const DUST_DIRECTORIES = ['principles', 'ideas', 'tasks', 'facts', 'config']

/**
 * Generates starter settings based on detected project type.
 * Returns settings with appropriate dustCommand and checks.
 */
function generateSettings(
  cwd: string,
  fileSystem: FileSystem,
  runtime: RuntimeConfig
): DustSettings {
  const dustCommand = detectDustCommand(cwd, fileSystem, runtime)
  const testCommand = detectTestCommand(cwd, fileSystem, runtime)
  const checks: CheckConfig[] = []

  if (testCommand) {
    checks.push({ name: 'test', command: testCommand })
  }

  return { dustCommand, checks }
}

const USE_DUST_FACT = `# Use dust for planning

This project uses [dust](https://github.com/joshski/dust) for planning and documentation.
`

function claudeMdContent(dustCommand: string): string {
  return dedent`
    # Claude Code Instructions

    This project uses [dust](https://github.com/joshski/dust) for planning and documentation.

    Always immediately run \`${dustCommand} agent\` when you start working in this repository.
  `
}

function agentsMdContent(dustCommand: string): string {
  return dedent`
    # Agent Instructions

    This project uses [dust](https://github.com/joshski/dust) for planning and documentation.

    Always immediately run \`${dustCommand} agent\` when you start working in this repository.
  `
}

export async function init(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, runtime } = dependencies
  const colors = getColors()
  const dustPath = `${context.cwd}/.dust`
  const dustCommand = detectDustCommand(context.cwd, fileSystem, runtime)
  const agentInstruction = `Always immediately run \`${dustCommand} agent\` when you start working in this repository.`

  // Try to create .dust directory atomically
  // mkdir with recursive:true is idempotent - safe even if directory exists
  await fileSystem.mkdir(dustPath, { recursive: true })

  for (const dir of DUST_DIRECTORIES) {
    await fileSystem.mkdir(`${dustPath}/${dir}`, { recursive: true })
  }

  // Use exclusive write (wx flag) to atomically check-and-create files
  // This prevents TOCTOU race conditions where another process could create the file
  // between our exists() check and writeFile() call
  let dustDirCreated = false

  try {
    await fileSystem.writeFile(
      `${dustPath}/facts/use-dust-for-planning.md`,
      USE_DUST_FACT,
      { flag: 'wx' }
    )
    dustDirCreated = true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }
    // File already exists - .dust was previously initialized
  }

  try {
    // Generate and write settings.json
    const settings = generateSettings(context.cwd, fileSystem, runtime)
    await fileSystem.writeFile(
      `${dustPath}/config/settings.json`,
      `${JSON.stringify(settings, null, 2)}\n`,
      { flag: 'wx' }
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }
    // File already exists - settings were previously created
  }

  if (dustDirCreated) {
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
  } else {
    context.stdout(
      `${colors.yellow}📦 Note:${colors.reset} ${colors.cyan}.dust${colors.reset} directory already exists, skipping creation`
    )
  }

  // Create CLAUDE.md atomically if it doesn't exist
  const claudeMdPath = `${context.cwd}/CLAUDE.md`
  try {
    await fileSystem.writeFile(claudeMdPath, claudeMdContent(dustCommand), {
      flag: 'wx',
    })
    context.stdout(
      `${colors.green}📄 Created${colors.reset} ${colors.cyan}CLAUDE.md${colors.reset} with agent instructions`
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      context.stdout(
        `${colors.yellow}⚠️  Warning:${colors.reset} ${colors.cyan}CLAUDE.md${colors.reset} already exists. Consider adding: ${colors.dim}"${agentInstruction}"${colors.reset}`
      )
    } else {
      throw error
    }
  }

  // Create AGENTS.md atomically if it doesn't exist
  const agentsMdPath = `${context.cwd}/AGENTS.md`
  try {
    await fileSystem.writeFile(agentsMdPath, agentsMdContent(dustCommand), {
      flag: 'wx',
    })
    context.stdout(
      `${colors.green}📄 Created${colors.reset} ${colors.cyan}AGENTS.md${colors.reset} with agent instructions`
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      context.stdout(
        `${colors.yellow}⚠️  Warning:${colors.reset} ${colors.cyan}AGENTS.md${colors.reset} already exists. Consider adding: ${colors.dim}"${agentInstruction}"${colors.reset}`
      )
    } else {
      throw error
    }
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
    `${colors.dim}If this is an existing codebase, you might want to backfill principles and facts:${colors.reset}`
  )
  context.stdout(
    `   ${colors.cyan}>${colors.reset} ${runner} claude "Add principles and facts based on the code in this repository"`
  )

  return { exitCode: 0 }
}
