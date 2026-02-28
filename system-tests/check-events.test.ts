import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import type { CommandEventMessage } from '../lib/command-events'

describe('check command event emission via DUST_EVENTS_FD', () => {
  test('writes valid JSON lines to file descriptor when DUST_EVENTS_FD is set', () => {
    // Create a minimal project with a fast check
    const tempDir = mkdtempSync(join(tmpdir(), 'dust-events-test-'))
    const eventsFile = join(tempDir, 'events.jsonl')

    try {
      // Set up minimal project structure
      mkdirSync(join(tempDir, '.dust', 'config'), { recursive: true })
      writeFileSync(
        join(tempDir, '.dust', 'config', 'settings.json'),
        JSON.stringify({
          dustCommand: 'dust',
          checks: [{ name: 'echo', command: 'echo ok' }],
        })
      )

      // Run dust check with DUST_EVENTS_FD pointing to fd 3, which redirects to eventsFile
      // This mirrors the example from the task: DUST_EVENTS_FD=3 dust check 3>events.jsonl
      spawnSync(
        'bash',
        [
          '-c',
          `DUST_EVENTS_FD=3 ${process.cwd()}/bin/dust check 3>${eventsFile}`,
        ],
        {
          cwd: tempDir,
          timeout: 30000,
        }
      )

      // Read the events file
      const content = readFileSync(eventsFile, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)

      // Should have events (check-started and check-passed for the echo check)
      expect(lines.length).toBeGreaterThan(0)

      // Each line should be valid JSON with the CommandEventMessage structure
      const events = lines.map(line => JSON.parse(line) as CommandEventMessage)

      // Verify envelope structure
      for (const event of events) {
        expect(typeof event.sequence).toBe('number')
        expect(typeof event.timestamp).toBe('string')
        expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        expect(event.event).toBeDefined()
        expect(event.event.type).toMatch(/^check-(started|passed|failed)$/)
        expect(typeof event.event.name).toBe('string')
      }

      // Sequence numbers should be sequential starting from 0
      const sequences = events.map(e => e.sequence)
      expect(sequences[0]).toBe(0)
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBe(sequences[i - 1] + 1)
      }

      // Should have check-started and check-passed for the 'echo' check
      expect(events).toContainEqual(
        expect.objectContaining({
          event: { type: 'check-started', name: 'echo' },
        })
      )
      expect(events).toContainEqual(
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'check-passed',
            name: 'echo',
          }),
        })
      )
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  test('does not write events when DUST_EVENTS_FD is not set', () => {
    // Create a minimal project with a fast check
    const tempDir = mkdtempSync(join(tmpdir(), 'dust-events-test-'))
    const eventsFile = join(tempDir, 'events.jsonl')

    try {
      // Set up minimal project structure
      mkdirSync(join(tempDir, '.dust', 'config'), { recursive: true })
      writeFileSync(
        join(tempDir, '.dust', 'config', 'settings.json'),
        JSON.stringify({
          dustCommand: 'dust',
          checks: [{ name: 'echo', command: 'echo ok' }],
        })
      )

      // Create an empty events file first
      writeFileSync(eventsFile, '')

      // Run dust check without DUST_EVENTS_FD
      spawnSync(
        'bash',
        ['-c', `${process.cwd()}/bin/dust check 3>${eventsFile}`],
        {
          cwd: tempDir,
          timeout: 30000,
        }
      )

      // Events file should be empty
      const content = readFileSync(eventsFile, 'utf-8')
      expect(content.trim()).toBe('')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
