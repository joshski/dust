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
            id: 'abc123',
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
            id: 'abc123',
            hasTask: true,
          },
        ],
      })
    })

    it('parses repository-list with minimal repository data', () => {
      const data = {
        type: 'repository-list',
        repositories: [
          {
            name: 'minimal-repo',
            gitUrl: 'git@github.com:user/minimal.git',
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'repository-list',
        repositories: [
          {
            name: 'minimal-repo',
            gitUrl: 'git@github.com:user/minimal.git',
          },
        ],
      })
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
