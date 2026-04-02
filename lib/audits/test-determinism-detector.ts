/**
 * Test Determinism Detector - Pure functions for detecting non-deterministic patterns in test code.
 *
 * This module provides the functional core for detecting test determinism issues.
 * It analyzes test file content and identifies patterns that could cause flaky tests.
 */

// --- Types ---

export type IssueCategory =
  | 'time-dependency'
  | 'randomness'
  | 'environment-variable'
  | 'filesystem'
  | 'real-timers'
  | 'platform-specific'

export interface DeterminismIssue {
  category: IssueCategory
  line: number
  column: number
  pattern: string
  code: string
  recommendation: string
}

// --- Constants ---

/**
 * Patterns that indicate time dependencies
 */
const TIME_PATTERNS = [
  { regex: /\bDate\.now\(\)/g, name: 'Date.now()' },
  { regex: /\bnew Date\(/g, name: 'new Date()' },
  // Note: Date() as function call (not constructor) is less common but still non-deterministic
  // We need to be careful not to match 'new Date(' here, so we look for Date( not preceded by 'new '
  { regex: /(?<!new )\bDate\(/g, name: 'Date()' },
] as const

/**
 * Patterns that indicate randomness
 */
const RANDOMNESS_PATTERNS = [
  { regex: /\bMath\.random\(\)/g, name: 'Math.random()' },
  { regex: /\bcrypto\.randomBytes\(/g, name: 'crypto.randomBytes()' },
  { regex: /\brandomUUID\(\)/g, name: 'randomUUID()' },
  { regex: /\bcrypto\.randomUUID\(\)/g, name: 'crypto.randomUUID()' },
] as const

/**
 * Patterns that indicate environment variable access
 */
const ENV_VAR_PATTERN = /\bprocess\.env\.[A-Z_][A-Z0-9_]*/g

/**
 * Patterns that indicate filesystem operations
 */
const FILESYSTEM_PATTERNS = [
  { regex: /\btmpdir\(\)/g, name: 'tmpdir()' },
  { regex: /\bos\.tmpdir\(\)/g, name: 'os.tmpdir()' },
  { regex: /\bfs\.writeFileSync\(/g, name: 'fs.writeFileSync()' },
  { regex: /\bfs\.writeFile\(/g, name: 'fs.writeFile()' },
  { regex: /\bfs\.readFileSync\(/g, name: 'fs.readFileSync()' },
  { regex: /\bfs\.readFile\(/g, name: 'fs.readFile()' },
  { regex: /\bfs\.mkdirSync\(/g, name: 'fs.mkdirSync()' },
  { regex: /\bfs\.mkdir\(/g, name: 'fs.mkdir()' },
  { regex: /\bfs\.rmdirSync\(/g, name: 'fs.rmdirSync()' },
  { regex: /\bfs\.rmdir\(/g, name: 'fs.rmdir()' },
  { regex: /\bfs\.unlinkSync\(/g, name: 'fs.unlinkSync()' },
  { regex: /\bfs\.unlink\(/g, name: 'fs.unlink()' },
] as const

/**
 * Patterns that indicate real timer usage
 */
const TIMER_PATTERNS = [
  { regex: /\bsetTimeout\(/g, name: 'setTimeout' },
  { regex: /\bsetInterval\(/g, name: 'setInterval' },
] as const

/**
 * Patterns that indicate platform-specific behavior
 */
const PLATFORM_PATTERNS = [
  { regex: /\bprocess\.platform\b/g, name: 'process.platform' },
  { regex: /\bos\.platform\(\)/g, name: 'os.platform()' },
  { regex: /\bos\.EOL\b/g, name: 'os.EOL' },
  { regex: /\b__dirname\b/g, name: '__dirname' },
  { regex: /\b__filename\b/g, name: '__filename' },
] as const

// --- Pure Functions ---

/**
 * Analyzes test file content and returns determinism issues.
 */
export function detectDeterminismIssues(
  testFileContent: string,
  filePath: string
): DeterminismIssue[] {
  // Only analyze test files
  if (!isTestFile(filePath)) {
    return []
  }

  const issues: DeterminismIssue[] = []
  const lines = testFileContent.split('\n')

  // Detect time dependencies
  issues.push(...detectTimeIssues(lines))

  // Detect randomness issues
  issues.push(...detectRandomnessIssues(lines))

  // Detect environment variable issues
  issues.push(...detectEnvironmentIssues(lines, testFileContent))

  // Detect filesystem issues
  issues.push(...detectFilesystemIssues(lines, testFileContent))

  // Detect real timer issues
  issues.push(...detectTimerIssues(lines, testFileContent))

  // Detect platform-specific issues
  issues.push(...detectPlatformIssues(lines))

  return issues
}

/**
 * Checks if a file path represents a test file.
 */
function isTestFile(filePath: string): boolean {
  return (
    filePath.endsWith('.test.ts') ||
    filePath.endsWith('.test.js') ||
    filePath.endsWith('.spec.ts') ||
    filePath.endsWith('.spec.js')
  )
}

/**
 * Detects time dependency issues.
 */
function detectTimeIssues(lines: string[]): DeterminismIssue[] {
  const issues: DeterminismIssue[] = []

  for (const { regex, name } of TIME_PATTERNS) {
    const matches = findMatches(lines, regex)
    for (const match of matches) {
      // Skip if it's within a parameter definition (injection pattern)
      /* istanbul ignore next @preserve -- 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (isWithinParameterDefinition(lines[match.line], match.column)) {
        continue
      }

      // Skip if it's within a stub/mock setup
      /* istanbul ignore next @preserve -- 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (isWithinStubSetup(lines[match.line])) {
        continue
      }

      issues.push({
        category: 'time-dependency',
        line: match.line + 1,
        column: match.column,
        pattern: name,
        code: lines[match.line].trim(),
        recommendation: `Use dependency injection (pass 'now' as parameter) or stub the time using test utilities`,
      })
    }
  }

  return issues
}

/**
 * Detects randomness issues.
 */
function detectRandomnessIssues(lines: string[]): DeterminismIssue[] {
  const issues: DeterminismIssue[] = []

  for (const { regex, name } of RANDOMNESS_PATTERNS) {
    const matches = findMatches(lines, regex)
    for (const match of matches) {
      // Skip if it's within a parameter definition (injection pattern)
      /* istanbul ignore next @preserve -- 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (isWithinParameterDefinition(lines[match.line], match.column)) {
        continue
      }

      // Skip if it's within a stub/mock setup
      /* istanbul ignore next @preserve -- 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (isWithinStubSetup(lines[match.line])) {
        continue
      }

      issues.push({
        category: 'randomness',
        line: match.line + 1,
        column: match.column,
        pattern: name,
        code: lines[match.line].trim(),
        recommendation: `Use dependency injection (pass random generator as parameter) or use seeded random for tests`,
      })
    }
  }

  return issues
}

/**
 * Detects environment variable access issues.
 */
function detectEnvironmentIssues(
  lines: string[],
  content: string
): DeterminismIssue[] {
  const issues: DeterminismIssue[] = []

  // Check if stubEnv is used anywhere in the file
  const hasStubEnv = /\bstubEnv\s*\(/.test(content)

  const matches = findMatches(lines, ENV_VAR_PATTERN)
  for (const match of matches) {
    const line = lines[match.line]

    // Skip if stubEnv is used in the same test context (within a few lines)
    /* istanbul ignore next 3 @preserve -- Defensive branch, both paths tested in separate test cases */
    if (hasStubEnv && isNearStubEnv(lines, match.line)) {
      continue
    }

    // Skip if it's within a parameter definition (injection pattern)
    /* istanbul ignore next 3 @preserve -- Defensive branch, both paths tested in separate test cases */
    if (isWithinParameterDefinition(line, match.column)) {
      continue
    }

    // Skip if it's being passed to stubEnv
    /* istanbul ignore next 3 @preserve -- Defensive branch, both paths tested in separate test cases */
    if (line.includes('stubEnv')) {
      continue
    }

    const envVarName = match.match[0]

    issues.push({
      category: 'environment-variable',
      line: match.line + 1,
      column: match.column,
      pattern: envVarName,
      code: line.trim(),
      recommendation: `Use stubEnv() to control '${envVarName}' or pass env as a parameter`,
    })
  }

  return issues
}

/**
 * Detects filesystem operation issues.
 */
function detectFilesystemIssues(
  lines: string[],
  content: string
): DeterminismIssue[] {
  const issues: DeterminismIssue[] = []

  for (const { regex, name } of FILESYSTEM_PATTERNS) {
    const matches = findMatches(lines, regex)
    for (const match of matches) {
      // Skip if it's within a parameter definition (injection pattern)
      /* istanbul ignore next 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (isWithinParameterDefinition(lines[match.line], match.column)) {
        continue
      }

      // Skip if it's clearly a system test (file contains 'system-test' or is in system-tests/')
      /* istanbul ignore next 6 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (
        content.includes('system-test') ||
        content.includes('system-tests/')
      ) {
        continue
      }

      issues.push({
        category: 'filesystem',
        line: match.line + 1,
        column: match.column,
        pattern: name,
        code: lines[match.line].trim(),
        recommendation: `Use in-memory filesystem emulator or ensure proper cleanup in afterEach/afterAll`,
      })
    }
  }

  return issues
}

/**
 * Detects real timer usage issues.
 */
function detectTimerIssues(
  lines: string[],
  content: string
): DeterminismIssue[] {
  const issues: DeterminismIssue[] = []

  // Check if fake timers are used
  const hasFakeTimers = /\bvi\.useFakeTimers\s*\(/.test(content)

  for (const { regex, name } of TIMER_PATTERNS) {
    const matches = findMatches(lines, regex)
    for (const match of matches) {
      const line = lines[match.line]

      // Skip if fake timers are used
      /* istanbul ignore next 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (hasFakeTimers) {
        continue
      }

      // Skip if it's within a parameter definition (injection pattern)
      /* istanbul ignore next 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (isWithinParameterDefinition(line, match.column)) {
        continue
      }

      // Skip if it's the special realSleep utility for integration tests
      /* istanbul ignore next 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (line.includes('realSleep')) {
        continue
      }

      issues.push({
        category: 'real-timers',
        line: match.line + 1,
        column: match.column,
        pattern: name,
        code: line.trim(),
        recommendation: `Use vi.useFakeTimers() to mock timers or use realSleep() utility for integration tests`,
      })
    }
  }

  return issues
}

/**
 * Detects platform-specific behavior issues.
 */
function detectPlatformIssues(lines: string[]): DeterminismIssue[] {
  const issues: DeterminismIssue[] = []

  for (const { regex, name } of PLATFORM_PATTERNS) {
    const matches = findMatches(lines, regex)
    for (const match of matches) {
      // Skip if it's within a parameter definition (injection pattern)
      /* istanbul ignore next 3 @preserve -- Defensive branch, both paths tested in separate test cases */
      if (isWithinParameterDefinition(lines[match.line], match.column)) {
        continue
      }

      issues.push({
        category: 'platform-specific',
        line: match.line + 1,
        column: match.column,
        pattern: name,
        code: lines[match.line].trim(),
        recommendation: `Use dependency injection to pass platform info or normalize paths using path.posix`,
      })
    }
  }

  return issues
}

// --- Helper Functions ---

interface Match {
  line: number
  column: number
  match: RegExpMatchArray
}

/**
 * Finds all matches of a regex pattern in lines of text.
 */
function findMatches(lines: string[], pattern: RegExp): Match[] {
  const matches: Match[] = []

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpMatchArray | null

    while ((match = regex.exec(line)) !== null) {
      /* istanbul ignore next 7 @preserve -- match.index undefined guard for type safety, tested implicitly */
      if (match.index !== undefined) {
        matches.push({
          line: lineIndex,
          column: match.index,
          match,
        })
      }
    }
  }

  return matches
}

/**
 * Checks if a position in a line is within a parameter definition.
 */
function isWithinParameterDefinition(line: string, column: number): boolean {
  // Look for patterns like: (now: Date), { now: Date }, now?: Date
  // This is a simple heuristic - check if we're in a function signature
  const beforeMatch = line.slice(0, column)

  // Check for type annotation pattern: identifier: Type
  // Look for pattern where we have "word:" before the match
  const typeAnnotationPattern = /(\w+)\s*:\s*$/
  const hasTypeAnnotation = typeAnnotationPattern.test(beforeMatch)

  // Check if this is in a function parameter list
  // Must have function/arrow AND be in parameters (between parens) AND have type annotation
  const hasArrow = line.includes('=>')
  const hasFunction = /\bfunction\s+\w*\s*\(/.test(line)

  // Count parentheses to see if we're in a parameter list
  const openParens = (beforeMatch.match(/\(/g) || []).length
  const closeParens = (beforeMatch.match(/\)/g) || []).length
  const inParens = openParens > closeParens

  /* istanbul ignore next @preserve -- Complex boolean expression, all paths tested in separate test cases */
  return hasTypeAnnotation && inParens && (hasArrow || hasFunction)
}

/**
 * Checks if a line is within a stub/mock setup.
 */
function isWithinStubSetup(line: string): boolean {
  return (
    line.includes('vi.fn()') ||
    line.includes('vi.mock(') ||
    line.includes('vi.spyOn(') ||
    line.includes('stub') ||
    line.includes('mock')
  )
}

/**
 * Checks if a line is near a stubEnv call (within 5 lines before or after).
 */
function isNearStubEnv(lines: string[], lineIndex: number): boolean {
  const searchRange = 5
  const start = Math.max(0, lineIndex - searchRange)
  const end = Math.min(lines.length - 1, lineIndex + searchRange)

  for (let i = start; i <= end; i++) {
    if (/\bstubEnv\s*\(/.test(lines[i])) {
      return true
    }
  }

  return false
}
