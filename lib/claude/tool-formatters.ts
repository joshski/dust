/**
 * Human-friendly formatters for Claude tool invocations.
 *
 * Each formatter transforms a tool's input arguments into readable output lines.
 * Unknown tools fall back to JSON rendering.
 */

type FormatterResult = string[]

type ToolFormatter = (input: Record<string, unknown>) => FormatterResult

const DIVIDER = '────────────────────────────────'

function formatWrite(input: Record<string, unknown>): FormatterResult {
  const filePath = input.file_path as string | undefined
  const content = input.content as string | undefined
  const others = getUnrecognizedArgs(input, ['file_path', 'content'])

  const lines: string[] = []
  lines.push(`🔧 Write: ${filePath ?? '(unknown)'}`)
  lines.push(DIVIDER)
  if (content !== undefined) {
    for (const line of content.split('\n')) {
      lines.push(line)
    }
  }
  lines.push(DIVIDER)
  appendOtherArgs(lines, others)
  return lines
}

function formatEdit(input: Record<string, unknown>): FormatterResult {
  const filePath = input.file_path as string | undefined
  const oldString = input.old_string as string | undefined
  const newString = input.new_string as string | undefined
  const others = getUnrecognizedArgs(input, [
    'file_path',
    'old_string',
    'new_string',
    'replace_all',
  ])

  const lines: string[] = []
  lines.push(`🔧 Edit: ${filePath ?? '(unknown)'}`)
  lines.push('Replace:')
  lines.push(DIVIDER)
  if (oldString !== undefined) {
    for (const line of oldString.split('\n')) {
      lines.push(line)
    }
  }
  lines.push(DIVIDER)
  lines.push('With:')
  lines.push(DIVIDER)
  if (newString !== undefined) {
    for (const line of newString.split('\n')) {
      lines.push(line)
    }
  }
  lines.push(DIVIDER)
  appendOtherArgs(lines, others)
  return lines
}

function formatRead(input: Record<string, unknown>): FormatterResult {
  const filePath = input.file_path as string | undefined
  const offset = input.offset as number | undefined
  const limit = input.limit as number | undefined
  const others = getUnrecognizedArgs(input, ['file_path', 'offset', 'limit'])

  const lines: string[] = []
  let lineRange = ''
  if (offset !== undefined || limit !== undefined) {
    const start = offset ?? 1
    const end = limit !== undefined ? start + limit - 1 : undefined
    lineRange =
      end !== undefined ? ` (lines ${start}-${end})` : ` (from line ${start})`
  }
  lines.push(`🔧 Read: ${filePath ?? '(unknown)'}${lineRange}`)
  appendOtherArgs(lines, others)
  return lines
}

function formatBash(input: Record<string, unknown>): FormatterResult {
  const command = input.command as string | undefined
  const description = input.description as string | undefined
  const others = getUnrecognizedArgs(input, [
    'command',
    'description',
    'timeout',
    'run_in_background',
    'dangerouslyDisableSandbox',
    '_simulatedSedEdit',
  ])

  const lines: string[] = []
  const header = description ?? 'Run command'
  lines.push(`🔧 Bash: ${header}`)
  if (command !== undefined) {
    lines.push(`$ ${command}`)
  }
  appendOtherArgs(lines, others)
  return lines
}

function formatTodoWrite(input: Record<string, unknown>): FormatterResult {
  const todos = input.todos as
    | Array<{
        content: string
        status: string
        activeForm?: string
      }>
    | undefined
  const others = getUnrecognizedArgs(input, ['todos'])

  const lines: string[] = []
  const count = todos?.length ?? 0
  lines.push(`🔧 TodoWrite: ${count} item${count === 1 ? '' : 's'}`)
  if (todos) {
    for (const todo of todos) {
      const icon = todo.status === 'completed' ? '☑' : '☐'
      lines.push(`${icon} ${todo.content}`)
    }
  }
  appendOtherArgs(lines, others)
  return lines
}

function formatGrep(input: Record<string, unknown>): FormatterResult {
  const pattern = input.pattern as string | undefined
  const path = input.path as string | undefined
  const glob = input.glob as string | undefined
  const type = input.type as string | undefined
  const others = getUnrecognizedArgs(input, [
    'pattern',
    'path',
    'glob',
    'type',
    'output_mode',
    'context',
    '-A',
    '-B',
    '-C',
    '-i',
    '-n',
    'head_limit',
    'offset',
    'multiline',
  ])

  const lines: string[] = []
  const location = path ?? '.'
  let filter = ''
  if (glob) {
    filter = ` (${glob})`
  } else if (type) {
    filter = ` (type: ${type})`
  }
  lines.push(`🔧 Grep: "${pattern ?? ''}" in ${location}${filter}`)
  appendOtherArgs(lines, others)
  return lines
}

function formatGlob(input: Record<string, unknown>): FormatterResult {
  const pattern = input.pattern as string | undefined
  const path = input.path as string | undefined
  const others = getUnrecognizedArgs(input, ['pattern', 'path'])

  const lines: string[] = []
  const location = path ?? '.'
  lines.push(`🔧 Glob: ${pattern ?? ''} in ${location}`)
  appendOtherArgs(lines, others)
  return lines
}

function formatTask(input: Record<string, unknown>): FormatterResult {
  const description = input.description as string | undefined
  const subagentType = input.subagent_type as string | undefined
  const prompt = input.prompt as string | undefined
  const others = getUnrecognizedArgs(input, [
    'description',
    'subagent_type',
    'prompt',
    'model',
    'max_turns',
    'resume',
    'run_in_background',
  ])

  const lines: string[] = []
  const header = description ?? subagentType ?? 'task'
  lines.push(`🔧 Task: ${header}`)
  if (prompt !== undefined) {
    const truncated =
      prompt.length > 100 ? `${prompt.slice(0, 100)}...` : prompt
    lines.push(`"${truncated}"`)
  }
  appendOtherArgs(lines, others)
  return lines
}

function formatFallback(
  name: string,
  input: Record<string, unknown>
): FormatterResult {
  const lines: string[] = []
  lines.push(`🔧 Tool: ${name}`)
  lines.push(`Input: ${JSON.stringify(input, null, 2)}`)
  return lines
}

const formatters: Record<string, ToolFormatter> = {
  Write: formatWrite,
  Edit: formatEdit,
  Read: formatRead,
  Bash: formatBash,
  TodoWrite: formatTodoWrite,
  Grep: formatGrep,
  Glob: formatGlob,
  Task: formatTask,
}

/**
 * Format a tool invocation for human-readable output.
 * Returns an array of lines to display.
 */
export function formatToolUse(
  name: string,
  input: Record<string, unknown>
): FormatterResult {
  const formatter = formatters[name]
  if (formatter) {
    return formatter(input)
  }
  return formatFallback(name, input)
}

function getUnrecognizedArgs(
  input: Record<string, unknown>,
  knownKeys: string[]
): Record<string, unknown> {
  const others: Record<string, unknown> = {}
  for (const key of Object.keys(input)) {
    if (!knownKeys.includes(key)) {
      others[key] = input[key]
    }
  }
  return others
}

function appendOtherArgs(
  lines: string[],
  others: Record<string, unknown>
): void {
  if (Object.keys(others).length > 0) {
    lines.push('')
    lines.push(`(Other arguments: ${JSON.stringify(others)})`)
  }
}
