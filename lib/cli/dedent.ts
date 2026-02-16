/**
 * Dedent tagged template literal helper
 *
 * Strips common leading whitespace from multi-line template literals,
 * making it possible to write properly indented code while producing
 * clean output.
 */

export function dedent(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  const result = strings.reduce(
    (acc, part, index) => acc + part + (values[index] ?? ''),
    ''
  )
  const lines = result.split('\n')
  const indent = lines
    .filter(line => line.trim())
    .reduce(
      (min, line) =>
        Math.min(min, (line.match(/^\s*/) as RegExpMatchArray)[0].length),
      Number.POSITIVE_INFINITY
    )
  return lines
    .map(line => line.slice(indent))
    .join('\n')
    .trim()
}
