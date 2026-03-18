import { describe, expect, test } from 'vitest'
import {
  detectTechStack,
  ECOSYSTEM_INDICATORS,
  PACKAGE_MANAGER_FILES,
} from './index'

describe('detectTechStack', () => {
  test('detects JavaScript ecosystem from package.json', () => {
    const files = ['package.json', 'src/index.ts']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('javascript')
    expect(result[0].indicators).toContain('package.json')
  })

  test('detects JavaScript ecosystem with bun package manager', () => {
    const files = ['package.json', 'bun.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('javascript')
    expect(result[0].packageManager).toBe('bun')
  })

  test('detects JavaScript ecosystem with pnpm package manager', () => {
    const files = ['package.json', 'pnpm-lock.yaml']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].packageManager).toBe('pnpm')
  })

  test('detects JavaScript ecosystem with npm package manager', () => {
    const files = ['package.json', 'package-lock.json']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].packageManager).toBe('npm')
  })

  test('detects JavaScript ecosystem with yarn package manager', () => {
    const files = ['package.json', 'yarn.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].packageManager).toBe('yarn')
  })

  test('detects TypeScript from tsconfig.json', () => {
    const files = ['tsconfig.json', 'src/index.ts']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('javascript')
    expect(result[0].indicators).toContain('tsconfig.json')
  })

  test('detects Python ecosystem from pyproject.toml', () => {
    const files = ['pyproject.toml', 'src/main.py']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('python')
    expect(result[0].indicators).toContain('pyproject.toml')
  })

  test('detects Python ecosystem from requirements.txt', () => {
    const files = ['requirements.txt']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('python')
  })

  test('detects Go ecosystem from go.mod', () => {
    const files = ['go.mod', 'go.sum', 'main.go']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('go')
    expect(result[0].indicators).toContain('go.mod')
    expect(result[0].indicators).toContain('go.sum')
  })

  test('detects Rust ecosystem from Cargo.toml', () => {
    const files = ['Cargo.toml', 'Cargo.lock', 'src/main.rs']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('rust')
    expect(result[0].indicators).toContain('Cargo.toml')
  })

  test('detects Ruby ecosystem from Gemfile', () => {
    const files = ['Gemfile', 'Gemfile.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('ruby')
  })

  test('detects PHP ecosystem from composer.json', () => {
    const files = ['composer.json', 'composer.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('php')
  })

  test('detects Elixir ecosystem from mix.exs', () => {
    const files = ['mix.exs', 'mix.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('elixir')
  })

  test('detects multiple ecosystems', () => {
    const files = ['package.json', 'bun.lock', 'requirements.txt']
    const result = detectTechStack(files)

    expect(result).toHaveLength(2)
    const ecosystems = result.map(r => r.ecosystem)
    expect(ecosystems).toContain('javascript')
    expect(ecosystems).toContain('python')
  })

  test('returns empty array when no ecosystem detected', () => {
    const files = ['README.md', 'LICENSE']
    const result = detectTechStack(files)

    expect(result).toHaveLength(0)
  })

  test('sorts results by ecosystem name', () => {
    const files = ['requirements.txt', 'go.mod', 'package.json']
    const result = detectTechStack(files)

    expect(result.map(r => r.ecosystem)).toEqual(['go', 'javascript', 'python'])
  })
})

describe('ECOSYSTEM_INDICATORS', () => {
  test('exports ecosystem indicators constant', () => {
    expect(ECOSYSTEM_INDICATORS).toBeDefined()
    expect(ECOSYSTEM_INDICATORS.javascript).toContain('package.json')
    expect(ECOSYSTEM_INDICATORS.python).toContain('pyproject.toml')
    expect(ECOSYSTEM_INDICATORS.go).toContain('go.mod')
    expect(ECOSYSTEM_INDICATORS.rust).toContain('Cargo.toml')
  })
})

describe('PACKAGE_MANAGER_FILES', () => {
  test('exports package manager files constant', () => {
    expect(PACKAGE_MANAGER_FILES).toBeDefined()
    expect(PACKAGE_MANAGER_FILES['bun.lock']).toEqual({
      ecosystem: 'javascript',
      manager: 'bun',
    })
    expect(PACKAGE_MANAGER_FILES['pnpm-lock.yaml']).toEqual({
      ecosystem: 'javascript',
      manager: 'pnpm',
    })
  })
})
