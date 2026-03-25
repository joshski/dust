/**
 * Helper Token Module
 *
 * Pure functional module for generating and validating short-TTL helper tokens.
 * These tokens let containerized Claude Code authenticate with the host OAuth gateway.
 *
 * When running Claude Code in Docker containers, the real OAuth token should never
 * enter the container environment. Instead, the container fetches a synthetic
 * "helper token" from the host gateway. The gateway validates this helper token
 * before injecting the real OAuth token upstream.
 */

/**
 * Time-to-live for helper tokens in milliseconds.
 * Tokens expire after this duration and must be regenerated.
 */
export const HELPER_TOKEN_TTL_MS = 60_000 // 1 minute

/**
 * Represents a generated helper token with its issue time.
 */
export interface HelperToken {
  token: string
  issuedAt: number
}

/**
 * State object tracking the current helper token.
 */
export interface HelperTokenState {
  current: HelperToken | null
}

/**
 * Generate a random hex string of the specified length.
 * Uses cryptographically secure random values.
 */
function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2))
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

/**
 * Generate a synthetic helper token that mimics the Claude API key format.
 * The token is cryptographically random and follows the pattern: sk-ant-api03-...
 *
 * @param now - Current timestamp in milliseconds (defaults to Date.now())
 * @returns A HelperToken containing the token string and issue time
 */
export function generateHelperToken(now: number = Date.now()): HelperToken {
  // Generate random segments matching Claude API key format
  // Format: sk-ant-api03-{56 random hex chars}
  const randomPart = generateRandomHex(56)
  const token = `sk-ant-api03-${randomPart}`

  return {
    token,
    issuedAt: now,
  }
}

/**
 * Check if a token matches the issued token and is within its TTL.
 *
 * @param token - The token string to validate
 * @param issued - The HelperToken that was issued
 * @param now - Current timestamp in milliseconds (defaults to Date.now())
 * @param ttlMs - Time-to-live in milliseconds (defaults to HELPER_TOKEN_TTL_MS)
 * @returns true if the token is valid, false otherwise
 */
export function isHelperTokenValid(
  token: string,
  issued: HelperToken,
  now: number,
  ttlMs: number
): boolean {
  // Check if token matches
  if (token !== issued.token) {
    return false
  }

  // Check if token is within TTL
  const elapsed = now - issued.issuedAt
  return elapsed >= 0 && elapsed < ttlMs
}

/**
 * Create a new helper token state object.
 * The state starts with no current token.
 *
 * @returns A new HelperTokenState with null current token
 */
export function createHelperTokenState(): HelperTokenState {
  return {
    current: null,
  }
}

/**
 * Rotate the helper token state by generating a new token.
 * Returns a new state object with the new token (immutable).
 *
 * @param state - The current helper token state
 * @param now - Current timestamp in milliseconds (defaults to Date.now())
 * @returns A new HelperTokenState with a fresh token
 */
export function rotateHelperToken(
  state: HelperTokenState,
  now: number = Date.now()
): HelperTokenState {
  return {
    current: generateHelperToken(now),
  }
}

/**
 * Check if the current helper token in state is valid.
 * Returns false if there is no current token.
 *
 * @param state - The helper token state to check
 * @param now - Current timestamp in milliseconds (defaults to Date.now())
 * @param ttlMs - Time-to-live in milliseconds (defaults to HELPER_TOKEN_TTL_MS)
 * @returns true if the current token exists and is within TTL
 */
export function isCurrentTokenValid(
  state: HelperTokenState,
  now: number = Date.now(),
  ttlMs: number = HELPER_TOKEN_TTL_MS
): boolean {
  if (!state.current) {
    return false
  }
  return isHelperTokenValid(state.current.token, state.current, now, ttlMs)
}
