import { describe, expect, it } from 'vitest'
import { parseServerMessage } from './server-messages'

describe('parseServerMessage', () => {
  describe('repository-list messages', () => {
    it('parses a valid repository-list message', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'test-repo',
            gitUrl: 'git@github.com:user/test-repo.git',
            url: 'https://github.com/user/test-repo',
            id: 123,
            hasTask: true,
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'repository-list',
        repositories: [
          {
            name: 'test-repo',
            gitUrl: 'git@github.com:user/test-repo.git',
            url: 'https://github.com/user/test-repo',
            id: 123,
            hasTask: true,
          },
        ],
      })
    })

    it('returns null for repository missing id', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'minimal-repo',
            gitUrl: 'git@github.com:user/minimal.git',
            url: 'https://example.com/minimal',
            hasTask: false,
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for repository missing url', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'minimal-repo',
            gitUrl: 'git@github.com:user/minimal.git',
            id: 701,
            hasTask: false,
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for repository missing hasTask', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'minimal-repo',
            gitUrl: 'git@github.com:user/minimal.git',
            id: 701,
            url: 'https://example.com/minimal',
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('parses empty repository list', () => {
      const data = {
        type: 'repository-list',
        repositories: [],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'repository-list',
        repositories: [],
      })
    })

    it('parses gitSshUrl when present', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'ssh-repo',
            gitUrl: 'https://github.com/user/ssh-repo.git',
            gitSshUrl: 'git@github.com:user/ssh-repo.git',
            url: 'https://github.com/user/ssh-repo',
            id: 555,
            hasTask: false,
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'repository-list',
        repositories: [
          {
            name: 'ssh-repo',
            gitUrl: 'https://github.com/user/ssh-repo.git',
            gitSshUrl: 'git@github.com:user/ssh-repo.git',
            url: 'https://github.com/user/ssh-repo',
            id: 555,
            hasTask: false,
          },
        ],
      })
    })

    it('omits gitSshUrl when absent', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'https-only-repo',
            gitUrl: 'https://github.com/user/https-only.git',
            url: 'https://github.com/user/https-only',
            id: 556,
            hasTask: true,
          },
        ],
      }
      const result = parseServerMessage(data)
      // Verify the key is not present (not just undefined)
      const repo = (result as { repositories: { gitSshUrl?: string }[] })
        .repositories[0]
      expect('gitSshUrl' in repo).toBe(false)
    })

    it('parses agentProvider when present', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'codex-repo',
            gitUrl: 'git@github.com:user/codex-repo.git',
            url: 'https://github.com/user/codex-repo',
            id: 456,
            hasTask: false,
            agentProvider: 'codex',
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'repository-list',
        repositories: [
          {
            name: 'codex-repo',
            gitUrl: 'git@github.com:user/codex-repo.git',
            url: 'https://github.com/user/codex-repo',
            id: 456,
            hasTask: false,
            agentProvider: 'codex',
          },
        ],
      })
    })

    it('omits agentProvider when absent', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'claude-repo',
            gitUrl: 'git@github.com:user/claude-repo.git',
            url: 'https://github.com/user/claude-repo',
            id: 789,
            hasTask: true,
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'repository-list',
        repositories: [
          {
            name: 'claude-repo',
            gitUrl: 'git@github.com:user/claude-repo.git',
            url: 'https://github.com/user/claude-repo',
            id: 789,
            hasTask: true,
          },
        ],
      })
      // Verify the key is not present (not just undefined)
      const repo = (result as { repositories: { agentProvider?: string }[] })
        .repositories[0]
      expect('agentProvider' in repo).toBe(false)
    })

    it('returns null for repository-list with missing repositories array', () => {
      const data = {
        type: 'repository-list',
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for repository-list with non-array repositories', () => {
      const data = {
        type: 'repository-list',
        repositories: 'not-an-array',
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for repository missing name', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            gitUrl: 'git@github.com:user/test.git',
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for repository missing gitUrl', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'test-repo',
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for null repository in list', () => {
      const data = {
        type: 'repository-list',
        repositories: [null],
      }
      expect(parseServerMessage(data)).toBeNull()
    })
  })

  describe('task-available messages', () => {
    it('parses a valid task-available message', () => {
      const data = {
        type: 'task-available',
        repository: 'my-repo',
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'task-available',
        repository: 'my-repo',
      })
    })

    it('returns null for task-available with missing repository', () => {
      const data = {
        type: 'task-available',
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for task-available with non-string repository', () => {
      const data = {
        type: 'task-available',
        repository: 123,
      }
      expect(parseServerMessage(data)).toBeNull()
    })
  })

  describe('invalid messages', () => {
    it('returns null for null', () => {
      expect(parseServerMessage(null)).toBeNull()
    })

    it('returns null for undefined', () => {
      expect(parseServerMessage(undefined)).toBeNull()
    })

    it('returns null for string', () => {
      expect(parseServerMessage('not an object')).toBeNull()
    })

    it('returns null for number', () => {
      expect(parseServerMessage(42)).toBeNull()
    })

    it('returns null for array', () => {
      expect(parseServerMessage([])).toBeNull()
    })

    it('returns null for unknown message type', () => {
      const data = {
        type: 'unknown-type',
        data: 'some data',
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for message without type', () => {
      const data = {
        repositories: [],
      }
      expect(parseServerMessage(data)).toBeNull()
    })
  })
})
