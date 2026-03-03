import { describe, expect, it } from 'vitest'
import {
  type Effect,
  handleInvalidMessageFormat,
  handleKeypress,
  handleMessageParseError,
  handleServerMessage,
  type KeypressHandlerState,
  type MessageHandlerResult,
  type MessageHandlerState,
} from './bucket-state'
import type {
  RepositoryListMessage,
  TaskAvailableMessage,
} from './server-messages'

/** Key input constants for tests */
const KEYS = {
  UP: '\x1b[A',
  DOWN: '\x1b[B',
  RIGHT: '\x1b[C',
  LEFT: '\x1b[D',
  PAGE_UP: '\x1b[5~',
  PAGE_DOWN: '\x1b[6~',
  HOME: '\x1b[H',
  END: '\x1b[F',
  CTRL_C: '\x03',
} as const

describe('bucket-state', () => {
  describe('handleServerMessage', () => {
    describe('repository-list messages', () => {
      it('returns syncUI and handleRepositoryList effects', () => {
        const state: MessageHandlerState = { repositoryNames: [] }
        const message: RepositoryListMessage = {
          type: 'repository-list',
          repositories: [
            {
              name: 'test-repo',
              gitUrl: 'git@github.com:user/test-repo.git',
              url: 'https://github.com/user/test-repo',
              id: 123,
              hasTask: false,
            },
          ],
        }

        const result: MessageHandlerResult = handleServerMessage(state, message)

        const syncUIEffect = result.effects.find(e => e.type === 'syncUI')
        expect(syncUIEffect).toEqual({
          type: 'syncUI',
          repositories: message.repositories,
        })

        const handleRepoListEffect = result.effects.find(
          e => e.type === 'handleRepositoryList'
        )
        expect(handleRepoListEffect).toEqual({
          type: 'handleRepositoryList',
          repositories: message.repositories,
        })
      })

      it('logs repository details for each repository', () => {
        const state: MessageHandlerState = { repositoryNames: [] }
        const message: RepositoryListMessage = {
          type: 'repository-list',
          repositories: [
            {
              name: 'my-repo',
              gitUrl: 'git@github.com:user/my-repo.git',
              gitSshUrl: 'git@github.com:user/my-repo.git',
              url: 'https://github.com/user/my-repo',
              id: 456,
              hasTask: true,
            },
          ],
        }

        const result = handleServerMessage(state, message)

        const logEffects = result.effects.filter(
          e => e.type === 'log'
        ) as Effect[]
        const logMessages = logEffects.map(e =>
          e.type === 'log' ? e.message : ''
        )

        expect(logMessages).toContain(
          'Received repository list (1 repositories):'
        )
        expect(logMessages).toContain('  - name=my-repo')
        expect(logMessages).toContain('    id=456')
        expect(logMessages).toContain(
          '    gitUrl=git@github.com:user/my-repo.git'
        )
        expect(logMessages).toContain(
          '    gitSshUrl=git@github.com:user/my-repo.git'
        )
        expect(logMessages).toContain('    url=https://github.com/user/my-repo')
        expect(logMessages).toContain('    hasTask=true')
      })

      it('logs (none) for missing gitSshUrl', () => {
        const state: MessageHandlerState = { repositoryNames: [] }
        const message: RepositoryListMessage = {
          type: 'repository-list',
          repositories: [
            {
              name: 'https-only',
              gitUrl: 'https://github.com/user/https-only.git',
              url: 'https://github.com/user/https-only',
              id: 789,
              hasTask: false,
            },
          ],
        }

        const result = handleServerMessage(state, message)

        const logEffects = result.effects.filter(e => e.type === 'log')
        const logMessages = logEffects.map(e =>
          e.type === 'log' ? e.message : ''
        )

        expect(logMessages).toContain('    gitSshUrl=(none)')
      })

      it('logs (empty) for empty repository list', () => {
        const state: MessageHandlerState = { repositoryNames: [] }
        const message: RepositoryListMessage = {
          type: 'repository-list',
          repositories: [],
        }

        const result = handleServerMessage(state, message)

        const logEffects = result.effects.filter(e => e.type === 'log')
        const logMessages = logEffects.map(e =>
          e.type === 'log' ? e.message : ''
        )

        expect(logMessages).toContain(
          'Received repository list (0 repositories):'
        )
        expect(logMessages).toContain('  (empty)')
      })

      it('includes debug log effect', () => {
        const state: MessageHandlerState = { repositoryNames: [] }
        const message: RepositoryListMessage = {
          type: 'repository-list',
          repositories: [],
        }

        const result = handleServerMessage(state, message)

        const debugLogEffect = result.effects.find(e => e.type === 'debugLog')
        expect(debugLogEffect).toEqual({
          type: 'debugLog',
          message: 'ws message: repository-list',
        })
      })
    })

    describe('task-available messages', () => {
      it('returns signalTaskAvailable effect when repository exists', () => {
        const state: MessageHandlerState = {
          repositoryNames: ['my-repo', 'other-repo'],
        }
        const message: TaskAvailableMessage = {
          type: 'task-available',
          repository: 'my-repo',
        }

        const result = handleServerMessage(state, message)

        const signalEffect = result.effects.find(
          e => e.type === 'signalTaskAvailable'
        )
        expect(signalEffect).toEqual({
          type: 'signalTaskAvailable',
          repositoryName: 'my-repo',
        })
      })

      it('logs task-available message', () => {
        const state: MessageHandlerState = { repositoryNames: ['my-repo'] }
        const message: TaskAvailableMessage = {
          type: 'task-available',
          repository: 'my-repo',
        }

        const result = handleServerMessage(state, message)

        const logEffects = result.effects.filter(e => e.type === 'log')
        const logMessages = logEffects.map(e =>
          e.type === 'log' ? e.message : ''
        )

        expect(logMessages).toContain('Received task-available for my-repo')
      })

      it('logs error when repository not found', () => {
        const state: MessageHandlerState = { repositoryNames: ['other-repo'] }
        const message: TaskAvailableMessage = {
          type: 'task-available',
          repository: 'unknown-repo',
        }

        const result = handleServerMessage(state, message)

        const errorLogEffect = result.effects.find(
          e => e.type === 'log' && e.stream === 'stderr'
        )
        expect(errorLogEffect).toEqual({
          type: 'log',
          message: 'No repository state found for unknown-repo',
          stream: 'stderr',
        })

        const signalEffect = result.effects.find(
          e => e.type === 'signalTaskAvailable'
        )
        expect(signalEffect).toBeUndefined()
      })

      it('includes debug log effect', () => {
        const state: MessageHandlerState = { repositoryNames: [] }
        const message: TaskAvailableMessage = {
          type: 'task-available',
          repository: 'my-repo',
        }

        const result = handleServerMessage(state, message)

        const debugLogEffect = result.effects.find(e => e.type === 'debugLog')
        expect(debugLogEffect).toEqual({
          type: 'debugLog',
          message: 'ws message: task-available',
        })
      })
    })
  })

  describe('handleMessageParseError', () => {
    it('returns log effect to stderr', () => {
      const result = handleMessageParseError('invalid json {{{')

      expect(result.effects).toEqual([
        {
          type: 'log',
          message: 'Failed to parse WebSocket message: invalid json {{{',
          stream: 'stderr',
        },
      ])
    })
  })

  describe('handleInvalidMessageFormat', () => {
    it('returns log effect to stderr', () => {
      const result = handleInvalidMessageFormat('{"type": "unknown"}')

      expect(result.effects).toEqual([
        {
          type: 'log',
          message: 'Invalid WebSocket message format: {"type": "unknown"}',
          stream: 'stderr',
        },
      ])
    })
  })

  describe('handleKeypress', () => {
    function createKeypressState(
      overrides: Partial<KeypressHandlerState> = {}
    ): KeypressHandlerState {
      return {
        selectedIndex: -1,
        repositories: [],
        repositoryUrls: {},
        ...overrides,
      }
    }

    describe('quit keys', () => {
      it('returns quit effect for q key', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, 'q')

        expect(result.effects).toContainEqual({ type: 'quit' })
      })

      it('returns quit effect for Ctrl+C', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, KEYS.CTRL_C)

        expect(result.effects).toContainEqual({ type: 'quit' })
      })
    })

    describe('navigation keys', () => {
      it('returns selectNext effect for right arrow', () => {
        const state = createKeypressState({ repositories: ['repo1', 'repo2'] })

        const result = handleKeypress(state, KEYS.RIGHT)

        expect(result.effects).toContainEqual({ type: 'selectNext' })
      })

      it('returns selectPrevious effect for left arrow', () => {
        const state = createKeypressState({ repositories: ['repo1', 'repo2'] })

        const result = handleKeypress(state, KEYS.LEFT)

        expect(result.effects).toContainEqual({ type: 'selectPrevious' })
      })
    })

    describe('scroll keys', () => {
      it('returns scroll up effect for up arrow', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, KEYS.UP)

        expect(result.effects).toContainEqual({
          type: 'scroll',
          direction: 'up',
        })
      })

      it('returns scroll down effect for down arrow', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, KEYS.DOWN)

        expect(result.effects).toContainEqual({
          type: 'scroll',
          direction: 'down',
        })
      })

      it('returns scroll pageUp effect for Page Up', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, KEYS.PAGE_UP)

        expect(result.effects).toContainEqual({
          type: 'scroll',
          direction: 'pageUp',
        })
      })

      it('returns scroll pageDown effect for Page Down', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, KEYS.PAGE_DOWN)

        expect(result.effects).toContainEqual({
          type: 'scroll',
          direction: 'pageDown',
        })
      })

      it('returns scroll top effect for g key', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, 'g')

        expect(result.effects).toContainEqual({
          type: 'scroll',
          direction: 'top',
        })
      })

      it('returns scroll top effect for Home key', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, KEYS.HOME)

        expect(result.effects).toContainEqual({
          type: 'scroll',
          direction: 'top',
        })
      })

      it('returns scroll bottom effect for G key', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, 'G')

        expect(result.effects).toContainEqual({
          type: 'scroll',
          direction: 'bottom',
        })
      })

      it('returns scroll bottom effect for End key', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, KEYS.END)

        expect(result.effects).toContainEqual({
          type: 'scroll',
          direction: 'bottom',
        })
      })
    })

    describe('mouse scroll', () => {
      it('returns three scroll up effects for mouse wheel up', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, '\x1b[<64;10;5M')

        const scrollUpEffects = result.effects.filter(
          e => e.type === 'scroll' && e.direction === 'up'
        )
        expect(scrollUpEffects).toHaveLength(3)
      })

      it('returns three scroll down effects for mouse wheel down', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, '\x1b[<65;10;5M')

        const scrollDownEffects = result.effects.filter(
          e => e.type === 'scroll' && e.direction === 'down'
        )
        expect(scrollDownEffects).toHaveLength(3)
      })

      it('returns no effects for non-scroll mouse events', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, '\x1b[<0;10;5M')

        expect(result.effects).toHaveLength(0)
      })
    })

    describe('open browser key', () => {
      it('returns openBrowser effect when o pressed on repo with URL', () => {
        const state = createKeypressState({
          selectedIndex: 0,
          repositories: ['repo1'],
          repositoryUrls: { repo1: 'https://github.com/user/repo1' },
        })

        const result = handleKeypress(state, 'o')

        expect(result.effects).toContainEqual({
          type: 'openBrowser',
          url: 'https://github.com/user/repo1',
        })
      })

      it('returns no effect when o pressed on All tab', () => {
        const state = createKeypressState({
          selectedIndex: -1,
          repositories: ['repo1'],
          repositoryUrls: { repo1: 'https://github.com/user/repo1' },
        })

        const result = handleKeypress(state, 'o')

        expect(result.effects).toHaveLength(0)
      })

      it('returns no effect when o pressed on repo without URL', () => {
        const state = createKeypressState({
          selectedIndex: 0,
          repositories: ['repo1'],
          repositoryUrls: {},
        })

        const result = handleKeypress(state, 'o')

        expect(result.effects).toHaveLength(0)
      })

      it('returns no effect when selectedIndex is out of range', () => {
        const state = createKeypressState({
          selectedIndex: 5,
          repositories: ['repo1'],
          repositoryUrls: { repo1: 'https://github.com/user/repo1' },
        })

        const result = handleKeypress(state, 'o')

        expect(result.effects).toHaveLength(0)
      })
    })

    describe('unknown keys', () => {
      it('returns no effects for unknown keys', () => {
        const state = createKeypressState()

        const result = handleKeypress(state, 'x')

        expect(result.effects).toHaveLength(0)
      })
    })
  })
})
