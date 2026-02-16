/**
 * Ring buffer for capturing subprocess output in dust bucket.
 *
 * Each repository has its own log buffer with a fixed maximum size.
 * When the buffer exceeds the limit, it trims to the target size.
 */

export interface LogLine {
  text: string
  stream: 'stdout' | 'stderr'
  timestamp: number
}

const MAX_LINES = 5000 // Cap memory usage per repository while retaining enough context for debugging
const TRIM_TO_LINES = 3000 // Trim to 60% of max to avoid trimming on every append

export interface LogBuffer {
  lines: LogLine[]
  maxLines: number
  trimToLines: number
}

/**
 * Create a new log buffer with default settings.
 */
export function createLogBuffer(
  maxLines = MAX_LINES,
  trimToLines = TRIM_TO_LINES
): LogBuffer {
  return {
    lines: [],
    maxLines,
    trimToLines,
  }
}

/**
 * Append a log line to the buffer, trimming if necessary.
 */
export function appendLogLine(buffer: LogBuffer, line: LogLine): void {
  buffer.lines.push(line)

  if (buffer.lines.length > buffer.maxLines) {
    // Trim to target size, keeping most recent lines
    buffer.lines = buffer.lines.slice(-buffer.trimToLines)
  }
}

/**
 * Create a log line from raw output.
 */
export function createLogLine(
  text: string,
  stream: 'stdout' | 'stderr',
  timestamp = Date.now()
): LogLine {
  return { text, stream, timestamp }
}

/**
 * Get all lines from the buffer.
 */
export function getLogLines(buffer: LogBuffer): readonly LogLine[] {
  return buffer.lines
}

/**
 * Get the most recent N lines from the buffer.
 */
export function getRecentLines(buffer: LogBuffer, count: number): LogLine[] {
  return buffer.lines.slice(-count)
}

/**
 * Clear all lines from the buffer.
 */
export function clearLogBuffer(buffer: LogBuffer): void {
  buffer.lines = []
}
