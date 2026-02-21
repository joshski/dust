import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { biomePath } from './index'

describe('biomePath', () => {
  it('returns a path to the biome directory', () => {
    expect(biomePath).toContain('biome')
  })

  it('returns an absolute path', () => {
    expect(biomePath).toMatch(/^\//)
  })

  it('points to the correct relative location from dist', () => {
    const expectedPath = join(import.meta.dirname, '..', 'biome')
    expect(biomePath).toBe(expectedPath)
  })
})
