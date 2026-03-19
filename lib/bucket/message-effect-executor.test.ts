import { describe, expect, it } from 'vitest'
import type { Effect } from './bucket-state'
import {
  executeMessageEffect,
  executeMessageEffects,
  isMessageEffect,
  type MessageEffect,
  type MessageEffectDeps,
} from './message-effect-executor'
import type { RepositoryListItem, ToolDefinition } from './server-messages'

/**
 * Stub implementation of MessageEffectDeps that records all operations.
 */
interface MessageEffectDepsStub extends MessageEffectDeps {
  calls: string[]
  storedTools: ToolDefinition[]
  connectionReadyCalls: Array<{
    tools: ToolDefinition[]
    repositories: RepositoryListItem[]
  }>
  rejectedReasons: string[]
}

function createMessageEffectDepsStub(): MessageEffectDepsStub {
  const calls: string[] = []
  const storedTools: ToolDefinition[] = []
  const connectionReadyCalls: Array<{
    tools: ToolDefinition[]
    repositories: RepositoryListItem[]
  }> = []
  const rejectedReasons: string[] = []

  return {
    calls,
    storedTools,
    connectionReadyCalls,
    rejectedReasons,

    logMessage(message: string, stream: 'stdout' | 'stderr') {
      calls.push(`logMessage(${JSON.stringify(message)}, ${stream})`)
    },

    debugLog(message: string) {
      calls.push(`debugLog(${JSON.stringify(message)})`)
    },

    syncUIWithRepoList(repositories: RepositoryListItem[]) {
      calls.push(`syncUIWithRepoList(${repositories.length} repos)`)
    },

    handleRepositoryList(repositories: RepositoryListItem[]) {
      calls.push(`handleRepositoryList(${repositories.length} repos)`)
    },

    signalTaskAvailable(repositoryName: string) {
      calls.push(`signalTaskAvailable(${JSON.stringify(repositoryName)})`)
    },

    storeToolDefinitions(tools: ToolDefinition[]) {
      calls.push(`storeToolDefinitions(${tools.length} tools)`)
      storedTools.push(...tools)
    },

    handleConnectionReady(
      tools: ToolDefinition[],
      repositories: RepositoryListItem[]
    ) {
      calls.push(
        `handleConnectionReady(${tools.length} tools, ${repositories.length} repos)`
      )
      connectionReadyCalls.push({ tools, repositories })
    },

    handleConnectionRejected(reason: string) {
      calls.push(`handleConnectionRejected(${JSON.stringify(reason)})`)
      rejectedReasons.push(reason)
    },
  }
}

function createTestToolDefinition(name: string): ToolDefinition {
  return {
    name,
    description: `${name} description`,
    endpoint: `/api/${name}`,
    method: 'POST',
    parameters: [],
  }
}

describe('isMessageEffect', () => {
  it('returns true for log effect', () => {
    const effect: Effect = { type: 'log', message: 'test', stream: 'stdout' }
    expect(isMessageEffect(effect)).toBe(true)
  })

  it('returns true for debugLog effect', () => {
    const effect: Effect = { type: 'debugLog', message: 'test' }
    expect(isMessageEffect(effect)).toBe(true)
  })

  it('returns true for syncUI effect', () => {
    const effect: Effect = { type: 'syncUI', repositories: [] }
    expect(isMessageEffect(effect)).toBe(true)
  })

  it('returns true for handleRepositoryList effect', () => {
    const effect: Effect = { type: 'handleRepositoryList', repositories: [] }
    expect(isMessageEffect(effect)).toBe(true)
  })

  it('returns true for signalTaskAvailable effect', () => {
    const effect: Effect = {
      type: 'signalTaskAvailable',
      repositoryName: 'test',
    }
    expect(isMessageEffect(effect)).toBe(true)
  })

  it('returns true for storeToolDefinitions effect', () => {
    const effect: Effect = { type: 'storeToolDefinitions', tools: [] }
    expect(isMessageEffect(effect)).toBe(true)
  })

  it('returns true for connectionReady effect', () => {
    const effect: Effect = {
      type: 'connectionReady',
      tools: [],
      repositories: [],
    }
    expect(isMessageEffect(effect)).toBe(true)
  })

  it('returns true for connectionRejected effect', () => {
    const effect: Effect = { type: 'connectionRejected', reason: 'test' }
    expect(isMessageEffect(effect)).toBe(true)
  })

  it('returns false for quit effect', () => {
    const effect: Effect = { type: 'quit' }
    expect(isMessageEffect(effect)).toBe(false)
  })

  it('returns false for scheduleReconnect effect', () => {
    const effect: Effect = { type: 'scheduleReconnect', delayMs: 1000 }
    expect(isMessageEffect(effect)).toBe(false)
  })

  it('returns false for scroll effect', () => {
    const effect: Effect = { type: 'scroll', direction: 'up' }
    expect(isMessageEffect(effect)).toBe(false)
  })
})

describe('executeMessageEffect', () => {
  describe('log effect', () => {
    it('calls logMessage with stdout stream', () => {
      const dependencies = createMessageEffectDepsStub()
      const effect: MessageEffect = {
        type: 'log',
        message: 'Hello world',
        stream: 'stdout',
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual(['logMessage("Hello world", stdout)'])
    })

    it('calls logMessage with stderr stream', () => {
      const dependencies = createMessageEffectDepsStub()
      const effect: MessageEffect = {
        type: 'log',
        message: 'Error occurred',
        stream: 'stderr',
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual([
        'logMessage("Error occurred", stderr)',
      ])
    })
  })

  describe('debugLog effect', () => {
    it('calls debugLog with message', () => {
      const dependencies = createMessageEffectDepsStub()
      const effect: MessageEffect = {
        type: 'debugLog',
        message: 'Debug info',
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual(['debugLog("Debug info")'])
    })
  })

  describe('syncUI effect', () => {
    it('calls syncUIWithRepoList with repositories', () => {
      const dependencies = createMessageEffectDepsStub()
      const repositories: RepositoryListItem[] = [
        {
          id: 1,
          name: 'repo1',
          gitUrl: 'https://example.com/repo1.git',
          gitSshUrl: 'git@example.com:repo1.git',
          url: 'https://example.com/repo1',
          hasTask: false,
        },
        {
          id: 2,
          name: 'repo2',
          gitUrl: 'https://example.com/repo2.git',
          gitSshUrl: 'git@example.com:repo2.git',
          url: 'https://example.com/repo2',
          hasTask: true,
        },
      ]
      const effect: MessageEffect = {
        type: 'syncUI',
        repositories,
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual(['syncUIWithRepoList(2 repos)'])
    })
  })

  describe('handleRepositoryList effect', () => {
    it('calls handleRepositoryList with repositories', () => {
      const dependencies = createMessageEffectDepsStub()
      const repositories: RepositoryListItem[] = [
        {
          id: 1,
          name: 'repo1',
          gitUrl: 'https://example.com/repo1.git',
          gitSshUrl: 'git@example.com:repo1.git',
          url: 'https://example.com/repo1',
          hasTask: false,
        },
      ]
      const effect: MessageEffect = {
        type: 'handleRepositoryList',
        repositories,
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual(['handleRepositoryList(1 repos)'])
    })
  })

  describe('signalTaskAvailable effect', () => {
    it('calls signalTaskAvailable with repository name', () => {
      const dependencies = createMessageEffectDepsStub()
      const effect: MessageEffect = {
        type: 'signalTaskAvailable',
        repositoryName: 'my-repo',
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual(['signalTaskAvailable("my-repo")'])
    })
  })

  describe('storeToolDefinitions effect', () => {
    it('calls storeToolDefinitions with tools', () => {
      const dependencies = createMessageEffectDepsStub()
      const tools: ToolDefinition[] = [
        createTestToolDefinition('tool1'),
        createTestToolDefinition('tool2'),
      ]
      const effect: MessageEffect = {
        type: 'storeToolDefinitions',
        tools,
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual(['storeToolDefinitions(2 tools)'])
      expect(dependencies.storedTools).toEqual(tools)
    })
  })

  describe('connectionReady effect', () => {
    it('calls handleConnectionReady with tools and repositories', () => {
      const dependencies = createMessageEffectDepsStub()
      const tools: ToolDefinition[] = [createTestToolDefinition('tool1')]
      const repositories: RepositoryListItem[] = [
        {
          id: 1,
          name: 'repo1',
          gitUrl: 'https://example.com/repo1.git',
          gitSshUrl: 'git@example.com:repo1.git',
          url: 'https://example.com/repo1',
          hasTask: false,
        },
      ]
      const effect: MessageEffect = {
        type: 'connectionReady',
        tools,
        repositories,
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual([
        'handleConnectionReady(1 tools, 1 repos)',
      ])
      expect(dependencies.connectionReadyCalls).toEqual([
        { tools, repositories },
      ])
    })
  })

  describe('connectionRejected effect', () => {
    it('calls handleConnectionRejected with reason', () => {
      const dependencies = createMessageEffectDepsStub()
      const effect: MessageEffect = {
        type: 'connectionRejected',
        reason: 'Version too old',
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual([
        'handleConnectionRejected("Version too old")',
      ])
      expect(dependencies.rejectedReasons).toEqual(['Version too old'])
    })

    it('handles connectionRejected with minimumVersion', () => {
      const dependencies = createMessageEffectDepsStub()
      const effect: MessageEffect = {
        type: 'connectionRejected',
        reason: 'Version too old',
        minimumVersion: '1.0.0',
      }

      executeMessageEffect(effect, dependencies)

      expect(dependencies.calls).toEqual([
        'handleConnectionRejected("Version too old")',
      ])
    })
  })
})

describe('executeMessageEffects', () => {
  it('executes multiple message effects in order', () => {
    const dependencies = createMessageEffectDepsStub()
    const effects: Effect[] = [
      { type: 'log', message: 'First', stream: 'stdout' },
      { type: 'debugLog', message: 'Debug' },
      { type: 'log', message: 'Second', stream: 'stderr' },
    ]

    executeMessageEffects(effects, dependencies)

    expect(dependencies.calls).toEqual([
      'logMessage("First", stdout)',
      'debugLog("Debug")',
      'logMessage("Second", stderr)',
    ])
  })

  it('filters out non-message effects', () => {
    const dependencies = createMessageEffectDepsStub()
    const effects: Effect[] = [
      { type: 'log', message: 'Included', stream: 'stdout' },
      { type: 'quit' },
      { type: 'debugLog', message: 'Also included' },
      { type: 'scroll', direction: 'up' },
      { type: 'scheduleReconnect', delayMs: 1000 },
    ]

    executeMessageEffects(effects, dependencies)

    expect(dependencies.calls).toEqual([
      'logMessage("Included", stdout)',
      'debugLog("Also included")',
    ])
  })

  it('handles empty effect array', () => {
    const dependencies = createMessageEffectDepsStub()

    executeMessageEffects([], dependencies)

    expect(dependencies.calls).toEqual([])
  })
})
