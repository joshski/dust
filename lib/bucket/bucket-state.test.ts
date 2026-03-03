import { describe, expect, it } from 'vitest'
import {
  type Effect,
  handleInvalidMessageFormat,
  handleMessageParseError,
  handleServerMessage,
  type MessageHandlerResult,
  type MessageHandlerState,
} from './bucket-state'
import type {
  RepositoryListMessage,
  TaskAvailableMessage,
} from './server-messages'

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
})
