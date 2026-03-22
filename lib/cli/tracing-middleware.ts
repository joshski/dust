/**
 * Tracing middleware for command execution
 *
 * Generates and logs trace IDs for debugging and cross-system correlation.
 */

import type { CommandMiddleware } from './middleware'

function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export interface TracingOptions {
  getTraceId: () => string | undefined
  setTraceId: (traceId: string) => void
  isVerbose: () => boolean
}

/**
 * Creates a tracing middleware that adds trace ID correlation
 *
 * - Sets trace ID if not already present
 * - Logs trace ID for debugging when verbose mode is enabled
 *
 * Options allow injection of environment access for testability.
 */
export function createTracingMiddleware(
  options: TracingOptions
): CommandMiddleware {
  return {
    async before(command, dependencies) {
      const existingTraceId = options.getTraceId()
      const traceId = existingTraceId || generateTraceId()

      if (!existingTraceId) {
        options.setTraceId(traceId)
      }

      if (options.isVerbose()) {
        dependencies.context.stderr(`[trace:${traceId}] ${command}`)
      }

      return undefined
    },
  }
}

/**
 * Default tracing options using process.env
 */
export function createDefaultTracingOptions(): TracingOptions {
  return {
    getTraceId: () => process.env.DUST_TRACE_ID,
    setTraceId: (traceId: string) => {
      process.env.DUST_TRACE_ID = traceId
    },
    isVerbose: () => process.env.DUST_VERBOSE === '1',
  }
}
