/**
 * Pure pattern-matching logic for debug logger names.
 *
 * Parses a DEBUG-style string (comma-separated, `*` wildcards)
 * and tests logger names against it. No side effects.
 */

/**
 * Parse a DEBUG expression string into an array of RegExp matchers.
 * Returns an empty array when the input is empty or undefined.
 */
export function parsePatterns(debug: string | undefined): RegExp[] {
  if (!debug) return []

  const expressions = debug
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return expressions.map(expr => {
    const escaped = expr.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    const pattern = escaped.replace(/\*/g, '.*')
    return new RegExp(`^${pattern}$`)
  })
}

/**
 * Test whether a logger name matches any of the compiled patterns.
 */
export function matchesAny(name: string, patterns: RegExp[]): boolean {
  return patterns.some(re => re.test(name))
}

/**
 * Format a log line with ISO timestamp and logger name.
 */
export function formatLine(name: string, messages: unknown[]): string {
  const text = messages
    .map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ')
  return `${new Date().toISOString()} [${name}] ${text}\n`
}
