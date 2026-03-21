import { describe, expect, test } from 'vitest'
import { formatLoopEvent } from './events'

describe('formatLoopEvent', () => {
  test('returns null for loop.checking_tasks', () => {
    const result = formatLoopEvent({ type: 'loop.checking_tasks' })
    expect(result).toBeNull()
  })

  test('returns string for other event types', () => {
    expect(formatLoopEvent({ type: 'loop.syncing' })).toBe(
      'Syncing with remote'
    )
    expect(formatLoopEvent({ type: 'loop.started', maxIterations: 5 })).toBe(
      'Starting dust loop claude (max 5 iterations)...'
    )
  })

  test('returns no_tasks message without trailing newline', () => {
    const result = formatLoopEvent({ type: 'loop.no_tasks' })
    expect(result).toBe('No tasks available. Sleeping...')
  })

  test('formats Docker events correctly', () => {
    expect(
      formatLoopEvent({
        type: 'loop.docker_detected',
        imageTag: 'dust-agent-test',
      })
    ).toBe(
      'Docker mode: found .dust/config/container/Dockerfile (image: dust-agent-test)'
    )

    expect(
      formatLoopEvent({
        type: 'loop.docker_building',
        imageTag: 'dust-agent-test',
      })
    ).toBe('Building Docker image dust-agent-test...')

    expect(
      formatLoopEvent({
        type: 'loop.docker_built',
        imageTag: 'dust-agent-test',
      })
    ).toBe('Docker image dust-agent-test ready')

    expect(
      formatLoopEvent({ type: 'loop.docker_error', error: 'Build failed' })
    ).toBe('Docker error: Build failed')
  })

  test('formats pre-flight check events correctly', () => {
    expect(formatLoopEvent({ type: 'loop.installing' })).toBe(
      'Installing dependencies'
    )
    expect(
      formatLoopEvent({ type: 'loop.install_failed', output: 'error' })
    ).toBe('Dependency install failed')
    expect(formatLoopEvent({ type: 'loop.running_checks' })).toBe(
      'Running checks'
    )
    expect(formatLoopEvent({ type: 'loop.checks_passed' })).toBe(
      'Checks passed'
    )
    expect(
      formatLoopEvent({ type: 'loop.checks_failed', output: 'lint error' })
    ).toBe('Checks failed')
  })
})
