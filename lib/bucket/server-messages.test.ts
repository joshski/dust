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

  describe('tool-definitions messages', () => {
    it('parses a valid tool-definitions message', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'upload-asset',
            description: 'Upload an asset to the server',
            endpoint: '/api/assets/upload',
            method: 'POST',
            parameters: [
              {
                name: 'file',
                type: 'file',
                required: true,
                description: 'The file to upload',
              },
              {
                name: 'name',
                type: 'string',
                required: false,
                description: 'Optional display name',
              },
            ],
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'tool-definitions',
        tools: [
          {
            name: 'upload-asset',
            description: 'Upload an asset to the server',
            endpoint: '/api/assets/upload',
            method: 'POST',
            parameters: [
              {
                name: 'file',
                type: 'file',
                required: true,
                description: 'The file to upload',
              },
              {
                name: 'name',
                type: 'string',
                required: false,
                description: 'Optional display name',
              },
            ],
          },
        ],
      })
    })

    it('parses empty tools array', () => {
      const data = {
        type: 'tool-definitions',
        tools: [],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'tool-definitions',
        tools: [],
      })
    })

    it('parses tool with empty parameters array', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'ping',
            description: 'Simple ping endpoint',
            endpoint: '/api/ping',
            method: 'GET',
            parameters: [],
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'tool-definitions',
        tools: [
          {
            name: 'ping',
            description: 'Simple ping endpoint',
            endpoint: '/api/ping',
            method: 'GET',
            parameters: [],
          },
        ],
      })
    })

    it('parses all parameter types', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test-tool',
            description: 'Tests all parameter types',
            endpoint: '/api/test',
            method: 'POST',
            parameters: [
              {
                name: 'str',
                type: 'string',
                required: true,
                description: 'A string',
              },
              {
                name: 'num',
                type: 'number',
                required: true,
                description: 'A number',
              },
              {
                name: 'bool',
                type: 'boolean',
                required: false,
                description: 'A boolean',
              },
              {
                name: 'f',
                type: 'file',
                required: false,
                description: 'A file',
              },
            ],
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).not.toBeNull()
      const tools = (result as { tools: { parameters: { type: string }[] }[] })
        .tools
      expect(tools[0].parameters.map(p => p.type)).toEqual([
        'string',
        'number',
        'boolean',
        'file',
      ])
    })

    it('returns null for tool-definitions with missing tools array', () => {
      const data = {
        type: 'tool-definitions',
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for tool-definitions with non-array tools', () => {
      const data = {
        type: 'tool-definitions',
        tools: 'not-an-array',
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for tool missing name', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            description: 'Missing name',
            endpoint: '/api/test',
            method: 'GET',
            parameters: [],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for tool missing description', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            endpoint: '/api/test',
            method: 'GET',
            parameters: [],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for tool missing endpoint', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Missing endpoint',
            method: 'GET',
            parameters: [],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for tool with invalid method', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Invalid method',
            endpoint: '/api/test',
            method: 'DELETE',
            parameters: [],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for tool missing parameters array', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Missing parameters',
            endpoint: '/api/test',
            method: 'GET',
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for parameter missing name', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Test',
            endpoint: '/api/test',
            method: 'GET',
            parameters: [
              {
                type: 'string',
                required: true,
                description: 'Missing name',
              },
            ],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for parameter missing type', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Test',
            endpoint: '/api/test',
            method: 'GET',
            parameters: [
              {
                name: 'param',
                required: true,
                description: 'Missing type',
              },
            ],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for parameter with invalid type', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Test',
            endpoint: '/api/test',
            method: 'GET',
            parameters: [
              {
                name: 'param',
                type: 'invalid',
                required: true,
                description: 'Invalid type',
              },
            ],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for parameter missing required', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Test',
            endpoint: '/api/test',
            method: 'GET',
            parameters: [
              {
                name: 'param',
                type: 'string',
                description: 'Missing required',
              },
            ],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for parameter missing description', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Test',
            endpoint: '/api/test',
            method: 'GET',
            parameters: [
              {
                name: 'param',
                type: 'string',
                required: true,
              },
            ],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for null tool in list', () => {
      const data = {
        type: 'tool-definitions',
        tools: [null],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for null parameter in list', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'test',
            description: 'Test',
            endpoint: '/api/test',
            method: 'GET',
            parameters: [null],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('parses tool with children (tool family)', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'sessions',
            description: 'Access historic agent sessions',
            endpoint: '/api/sessions',
            method: 'GET',
            parameters: [],
            children: [
              {
                name: 'list',
                description: 'List all sessions',
                endpoint: '/api/sessions/list',
                method: 'GET',
                parameters: [],
              },
              {
                name: 'view',
                description: 'View a specific session',
                endpoint: '/api/sessions/view',
                method: 'GET',
                parameters: [
                  {
                    name: 'id',
                    type: 'string',
                    required: true,
                    description: 'Session ID',
                  },
                ],
              },
            ],
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'tool-definitions',
        tools: [
          {
            name: 'sessions',
            description: 'Access historic agent sessions',
            endpoint: '/api/sessions',
            method: 'GET',
            parameters: [],
            children: [
              {
                name: 'list',
                description: 'List all sessions',
                endpoint: '/api/sessions/list',
                method: 'GET',
                parameters: [],
              },
              {
                name: 'view',
                description: 'View a specific session',
                endpoint: '/api/sessions/view',
                method: 'GET',
                parameters: [
                  {
                    name: 'id',
                    type: 'string',
                    required: true,
                    description: 'Session ID',
                  },
                ],
              },
            ],
          },
        ],
      })
    })

    it('parses tool with empty children array', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'empty-family',
            description: 'A family with no children',
            endpoint: '/api/empty',
            method: 'GET',
            parameters: [],
            children: [],
          },
        ],
      }
      const result = parseServerMessage(data)
      expect(result).toEqual({
        type: 'tool-definitions',
        tools: [
          {
            name: 'empty-family',
            description: 'A family with no children',
            endpoint: '/api/empty',
            method: 'GET',
            parameters: [],
            children: [],
          },
        ],
      })
    })

    it('omits children when not present', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'simple',
            description: 'A simple tool',
            endpoint: '/api/simple',
            method: 'GET',
            parameters: [],
          },
        ],
      }
      const result = parseServerMessage(data)
      const tool = (result as { tools: { children?: unknown }[] }).tools[0]
      expect('children' in tool).toBe(false)
    })

    it('returns null for children with non-array value', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'invalid',
            description: 'Invalid children',
            endpoint: '/api/invalid',
            method: 'GET',
            parameters: [],
            children: 'not-an-array',
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for invalid child tool', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'parent',
            description: 'Parent tool',
            endpoint: '/api/parent',
            method: 'GET',
            parameters: [],
            children: [
              {
                name: 'invalid-child',
                // missing description
                endpoint: '/api/child',
                method: 'GET',
                parameters: [],
              },
            ],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for nested children (max one level deep)', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'grandparent',
            description: 'Grandparent tool',
            endpoint: '/api/grandparent',
            method: 'GET',
            parameters: [],
            children: [
              {
                name: 'parent',
                description: 'Parent tool',
                endpoint: '/api/parent',
                method: 'GET',
                parameters: [],
                children: [
                  {
                    name: 'child',
                    description: 'Child tool',
                    endpoint: '/api/child',
                    method: 'GET',
                    parameters: [],
                  },
                ],
              },
            ],
          },
        ],
      }
      expect(parseServerMessage(data)).toBeNull()
    })

    it('returns null for null child in children array', () => {
      const data = {
        type: 'tool-definitions',
        tools: [
          {
            name: 'parent',
            description: 'Parent tool',
            endpoint: '/api/parent',
            method: 'GET',
            parameters: [],
            children: [null],
          },
        ],
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
