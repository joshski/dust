import { describe, expect, it } from 'vitest'
import {
  type ConnectionLifecycleState,
  type Effect,
  handleClose,
  handleError,
  handleInvalidMessageFormat,
  handleKeypress,
  handleMessageParseError,
  handleOpen,
  handleServerMessage,
  INITIAL_RECONNECT_DELAY_MS,
  type KeypressHandlerState,
  MAX_RECONNECT_DELAY_MS,
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
              agentProvider: 'codex',
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
        expect(logMessages).toContain('    agentProvider=codex')
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

  describe('handleClose', () => {
    function createConnectionState(
      overrides: Partial<ConnectionLifecycleState> = {}
    ): ConnectionLifecycleState {
      return {
        reconnectDelay: INITIAL_RECONNECT_DELAY_MS,
        shuttingDown: false,
        ...overrides,
      }
    }

    it('logs disconnection with code and reason', () => {
      const state = createConnectionState()

      const result = handleClose(state, 1006, 'Connection lost')

      const logEffects = result.effects.filter(e => e.type === 'log')
      expect(logEffects[0]).toEqual({
        type: 'log',
        message: 'bucket.disconnected code=1006 reason=Connection lost',
        stream: 'stdout',
      })
    })

    it('logs "none" when reason is empty', () => {
      const state = createConnectionState()

      const result = handleClose(state, 1006, '')

      const logEffects = result.effects.filter(e => e.type === 'log')
      expect(logEffects[0]).toEqual({
        type: 'log',
        message: 'bucket.disconnected code=1006 reason=none',
        stream: 'stdout',
      })
    })

    describe('code 4000 (replaced by another connection)', () => {
      it('does not schedule reconnection', () => {
        const state = createConnectionState()

        const result = handleClose(state, 4000, 'Replaced')

        const reconnectEffect = result.effects.find(
          e => e.type === 'scheduleReconnect'
        )
        expect(reconnectEffect).toBeUndefined()
      })

      it('logs that another connection replaced this one', () => {
        const state = createConnectionState()

        const result = handleClose(state, 4000, 'Replaced')

        const logMessages = result.effects
          .filter(e => e.type === 'log')
          .map(e => (e.type === 'log' ? e.message : ''))
        expect(logMessages).toContain(
          'Another connection replaced this one. Not reconnecting.'
        )
      })

      it('does not modify state', () => {
        const state = createConnectionState({ reconnectDelay: 5000 })

        const result = handleClose(state, 4000, 'Replaced')

        expect(result.state.reconnectDelay).toBe(5000)
      })
    })

    describe('normal disconnection (not code 4000)', () => {
      it('schedules reconnection with current delay', () => {
        const state = createConnectionState({ reconnectDelay: 2000 })

        const result = handleClose(state, 1006, 'Lost')

        const reconnectEffect = result.effects.find(
          e => e.type === 'scheduleReconnect'
        )
        expect(reconnectEffect).toEqual({
          type: 'scheduleReconnect',
          delayMs: 2000,
        })
      })

      it('logs reconnection delay in seconds', () => {
        const state = createConnectionState({ reconnectDelay: 4000 })

        const result = handleClose(state, 1006, 'Lost')

        const logMessages = result.effects
          .filter(e => e.type === 'log')
          .map(e => (e.type === 'log' ? e.message : ''))
        expect(logMessages).toContain('Reconnecting in 4 seconds...')
      })

      it('doubles the reconnect delay for next attempt', () => {
        const state = createConnectionState({ reconnectDelay: 1000 })

        const result = handleClose(state, 1006, 'Lost')

        expect(result.state.reconnectDelay).toBe(2000)
      })

      it('caps reconnect delay at MAX_RECONNECT_DELAY_MS', () => {
        const state = createConnectionState({ reconnectDelay: 20000 })

        const result = handleClose(state, 1006, 'Lost')

        expect(result.state.reconnectDelay).toBe(MAX_RECONNECT_DELAY_MS)
      })

      it('stays at max when already at max', () => {
        const state = createConnectionState({
          reconnectDelay: MAX_RECONNECT_DELAY_MS,
        })

        const result = handleClose(state, 1006, 'Lost')

        expect(result.state.reconnectDelay).toBe(MAX_RECONNECT_DELAY_MS)
      })
    })

    describe('when shutting down', () => {
      it('does not schedule reconnection', () => {
        const state = createConnectionState({ shuttingDown: true })

        const result = handleClose(state, 1006, 'Lost')

        const reconnectEffect = result.effects.find(
          e => e.type === 'scheduleReconnect'
        )
        expect(reconnectEffect).toBeUndefined()
      })

      it('does not log reconnection message', () => {
        const state = createConnectionState({ shuttingDown: true })

        const result = handleClose(state, 1006, 'Lost')

        const logMessages = result.effects
          .filter(e => e.type === 'log')
          .map(e => (e.type === 'log' ? e.message : ''))
        expect(logMessages).not.toContain(
          expect.stringContaining('Reconnecting')
        )
      })
    })
  })

  describe('handleError', () => {
    it('returns log effect to stderr with error message', () => {
      const state: ConnectionLifecycleState = {
        reconnectDelay: 1000,
        shuttingDown: false,
      }

      const result = handleError(state, 'Connection refused')

      expect(result.effects).toEqual([
        {
          type: 'log',
          message: 'WebSocket error: Connection refused',
          stream: 'stderr',
        },
      ])
    })

    it('does not modify state', () => {
      const state: ConnectionLifecycleState = {
        reconnectDelay: 5000,
        shuttingDown: true,
      }

      const result = handleError(state, 'Error')

      expect(result.state).toEqual(state)
    })
  })

  describe('handleOpen', () => {
    it('resets reconnect delay to initial value', () => {
      const state: ConnectionLifecycleState = {
        reconnectDelay: 16000,
        shuttingDown: false,
      }

      const result = handleOpen(state)

      expect(result.state.reconnectDelay).toBe(INITIAL_RECONNECT_DELAY_MS)
    })

    it('logs connected status', () => {
      const state: ConnectionLifecycleState = {
        reconnectDelay: 1000,
        shuttingDown: false,
      }

      const result = handleOpen(state)

      expect(result.effects).toEqual([
        {
          type: 'log',
          message: 'bucket.connected',
          stream: 'stdout',
        },
      ])
    })

    it('preserves shuttingDown state', () => {
      const state: ConnectionLifecycleState = {
        reconnectDelay: 8000,
        shuttingDown: true,
      }

      const result = handleOpen(state)

      expect(result.state.shuttingDown).toBe(true)
    })
  })
})
