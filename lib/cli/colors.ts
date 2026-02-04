/**
 * ANSI color utilities with support for NO_COLOR and TTY detection.
 *
 * Colors are disabled when:
 * - NO_COLOR environment variable is set (per no-color.org standard)
 * - TERM=dumb environment variable is set
 * - stdout is not a TTY (piped output, non-interactive environments)
 */

interface Colors {
  reset: string
  bold: string
  dim: string
  cyan: string
  green: string
  yellow: string
}

const ANSI_COLORS: Colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
}

const NO_COLORS: Colors = {
  reset: '',
  bold: '',
  dim: '',
  cyan: '',
  green: '',
  yellow: '',
}

/**
 * Determines whether colors should be disabled based on environment.
 */
export function shouldDisableColors(): boolean {
  // NO_COLOR standard (https://no-color.org)
  if (process.env.NO_COLOR !== undefined) {
    return true
  }

  // TERM=dumb indicates a dumb terminal without color support
  if (process.env.TERM === 'dumb') {
    return true
  }

  // Non-TTY environments (piped output, non-interactive agents)
  if (!process.stdout.isTTY) {
    return true
  }

  return false
}

/**
 * Returns the appropriate colors object based on environment detection.
 */
export function getColors(): Colors {
  return shouldDisableColors() ? NO_COLORS : ANSI_COLORS
}
