/**
 * dust prompt <name> - Output a prompt by name
 */

import type { CommandContext, CommandResult, FileSystem } from './types'

export async function prompt(
  ctx: CommandContext,
  fs: FileSystem,
  args: string[]
): Promise<CommandResult> {
  const promptsDir = `${ctx.cwd}/prompts`

  if (args.length === 0) {
    ctx.stderr('Usage: dust prompt <name>')
    ctx.stderr('Example: dust prompt work')
    return { exitCode: 1 }
  }

  const promptName = args[0]
  const promptFile = `${promptsDir}/${promptName}.md`

  if (!fs.exists(promptFile)) {
    ctx.stderr(`Error: Prompt '${promptName}' not found`)
    ctx.stderr('Available prompts:')

    try {
      const files = await fs.readdir(promptsDir)
      const prompts = files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''))

      for (const p of prompts) {
        ctx.stderr(`  ${p}`)
      }
    } catch {
      ctx.stderr('  (no prompts directory found)')
    }

    return { exitCode: 1 }
  }

  const content = await fs.readFile(promptFile)
  ctx.stdout(content)

  return { exitCode: 0 }
}
