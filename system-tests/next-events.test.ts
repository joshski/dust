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

describe('next command event emission via DUST_EVENTS_FD', () => {
  test('writes tasks-listed event to file descriptor when DUST_EVENTS_FD is set', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dust-next-events-test-'))
    const eventsFile = join(tempDir, 'events.jsonl')

    try {
      // Set up project with tasks
      mkdirSync(join(tempDir, '.dust', 'tasks'), { recursive: true })
      writeFileSync(
        join(tempDir, '.dust', 'tasks', 'first-task.md'),
        '# First Task\n\nDo something.'
      )
      writeFileSync(
        join(tempDir, '.dust', 'tasks', 'second-task.md'),
        '# Second Task\n\nDo something else.'
      )

      // Run dust next with DUST_EVENTS_FD pointing to fd 3
      spawnSync(
        'bash',
        [
          '-c',
          `DUST_EVENTS_FD=3 ${process.cwd()}/bin/dust next 3>${eventsFile}`,
        ],
        {
          cwd: tempDir,
          timeout: 30000,
        }
      )

      // Read the events file
      const content = readFileSync(eventsFile, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)

      // Should have exactly one tasks-listed event
      expect(lines.length).toBe(1)

      const event = JSON.parse(lines[0]) as CommandEventMessage

      // Verify envelope structure
      expect(typeof event.sequence).toBe('number')
      expect(typeof event.timestamp).toBe('string')
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(event.event.type).toBe('tasks-listed')

      // Verify event content
      if (event.event.type === 'tasks-listed') {
        expect(event.event.tasks).toHaveLength(2)
        expect(event.event.tasks).toContainEqual({
          path: '.dust/tasks/first-task.md',
          title: 'First Task',
          blockedBy: [],
        })
        expect(event.event.tasks).toContainEqual({
          path: '.dust/tasks/second-task.md',
          title: 'Second Task',
          blockedBy: [],
        })
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  test('excludes blocked tasks from tasks-listed event', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dust-next-events-test-'))
    const eventsFile = join(tempDir, 'events.jsonl')

    try {
      // Set up project with blocked and unblocked tasks
      mkdirSync(join(tempDir, '.dust', 'tasks'), { recursive: true })
      writeFileSync(
        join(tempDir, '.dust', 'tasks', 'blocker-task.md'),
        '# Blocker Task\n\nDo this first.'
      )
      writeFileSync(
        join(tempDir, '.dust', 'tasks', 'blocked-task.md'),
        '# Blocked Task\n\nWait for blocker.\n\n## Blocked By\n\n- [Blocker](blocker-task.md)'
      )

      // Run dust next with DUST_EVENTS_FD pointing to fd 3
      spawnSync(
        'bash',
        [
          '-c',
          `DUST_EVENTS_FD=3 ${process.cwd()}/bin/dust next 3>${eventsFile}`,
        ],
        {
          cwd: tempDir,
          timeout: 30000,
        }
      )

      // Read the events file
      const content = readFileSync(eventsFile, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      const event = JSON.parse(lines[0]) as CommandEventMessage

      // Verify only unblocked task is included
      if (event.event.type === 'tasks-listed') {
        expect(event.event.tasks).toHaveLength(1)
        expect(event.event.tasks[0]).toEqual({
          path: '.dust/tasks/blocker-task.md',
          title: 'Blocker Task',
          blockedBy: [],
        })
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
