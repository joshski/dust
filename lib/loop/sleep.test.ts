import { describe, expect, test } from 'vitest'
import { sleepWithProgress, SLEEP_INTERVAL_MS, SLEEP_STEP_MS } from './sleep'

describe('sleepWithProgress', () => {
  test('calls sleep in steps and writes dots', async () => {
    const sleepCalls: number[] = []
    const inlineWrites: string[] = []
    const lineWrites: string[] = []

    await sleepWithProgress(
      async ms => {
        sleepCalls.push(ms)
      },
      3000,
      msg => inlineWrites.push(msg),
      msg => lineWrites.push(msg)
    )

    expect(sleepCalls).toEqual([1000, 1000, 1000])
    expect(inlineWrites).toEqual(['.', '.', '.'])
    expect(lineWrites).toEqual([''])
  })

  test('handles totalMs not evenly divisible by step', async () => {
    const sleepCalls: number[] = []

    await sleepWithProgress(
      async ms => {
        sleepCalls.push(ms)
      },
      2500,
      () => {},
      () => {}
    )

    expect(sleepCalls).toEqual([1000, 1000, 500])
  })

  test('handles zero totalMs', async () => {
    const sleepCalls: number[] = []

    await sleepWithProgress(
      async ms => {
        sleepCalls.push(ms)
      },
      0,
      () => {},
      msg => {
        expect(msg).toBe('')
      }
    )

    expect(sleepCalls).toEqual([])
  })

  test('exports expected constants', () => {
    expect(SLEEP_INTERVAL_MS).toBe(30000)
    expect(SLEEP_STEP_MS).toBe(1000)
  })
})
