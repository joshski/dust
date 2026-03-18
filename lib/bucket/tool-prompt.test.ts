import { describe, expect, it } from 'vitest'
import type { ToolDefinition } from './server-messages'
import { formatToolFamilyHelp, formatToolsSection } from './tool-prompt'

describe('formatToolsSection', () => {
  it('returns empty string when no tools', () => {
    const result = formatToolsSection([])
    expect(result).toBe('')
  })

  it('formats a simple tool with no parameters', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'ping',
        description: 'Check server connectivity',
        endpoint: '/api/ping',
        method: 'GET',
        parameters: [],
      },
    ]

    const result = formatToolsSection(tools)

    expect(result).toMatch(/\n## Available Tools/)
    expect(result).toContain(
      'Use these tools where it makes sense in the execution of this task:'
    )
    expect(result).toContain('### ping')
    expect(result).toContain('Check server connectivity')
    expect(result).toContain('Usage: `dust bucket tool ping`')
    expect(result).not.toContain('Parameters:')
  })

  it('formats a tool with parameters without showing parameter details', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'asset-upload',
        description: 'Upload a file to dustbucket and get a public URL.',
        endpoint: '/api/assets/upload',
        method: 'POST',
        parameters: [
          {
            name: 'file',
            type: 'file',
            required: true,
            description: 'The file to upload',
          },
        ],
      },
    ]

    const result = formatToolsSection(tools)

    expect(result).toContain('### asset-upload')
    expect(result).toContain(
      'Upload a file to dustbucket and get a public URL.'
    )
    expect(result).toContain('Usage: `dust bucket tool asset-upload`')
    // Parameter details should NOT be in the prompt
    expect(result).not.toContain('Parameters:')
    expect(result).not.toContain('(file, required)')
  })

  it('formats a tool with multiple parameters without showing details', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'config',
        description: 'Get or set configuration.',
        endpoint: '/api/config',
        method: 'POST',
        parameters: [
          {
            name: 'key',
            type: 'string',
            required: true,
            description: 'The configuration key',
          },
          {
            name: 'value',
            type: 'string',
            required: false,
            description: 'The value to set (omit to get current value)',
          },
        ],
      },
    ]

    const result = formatToolsSection(tools)

    expect(result).toContain('Usage: `dust bucket tool config`')
    expect(result).not.toContain('Parameters:')
    expect(result).not.toContain('(string, required)')
  })

  it('formats multiple tools', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'ping',
        description: 'Check connectivity',
        endpoint: '/api/ping',
        method: 'GET',
        parameters: [],
      },
      {
        name: 'upload',
        description: 'Upload a file',
        endpoint: '/api/upload',
        method: 'POST',
        parameters: [
          {
            name: 'file',
            type: 'file',
            required: true,
            description: 'The file',
          },
        ],
      },
    ]

    const result = formatToolsSection(tools)

    expect(result).toContain('### ping')
    expect(result).toContain('### upload')
    expect(result).toContain('Usage: `dust bucket tool ping`')
    expect(result).toContain('Usage: `dust bucket tool upload`')
  })

  it('omits parameter details from tool prompt', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'test-tool',
        description: 'Test all parameter types',
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
            name: 'flag',
            type: 'boolean',
            required: false,
            description: 'A boolean',
          },
          {
            name: 'data',
            type: 'file',
            required: false,
            description: 'A file',
          },
        ],
      },
    ]

    const result = formatToolsSection(tools)

    expect(result).toContain('### test-tool')
    expect(result).toContain('Test all parameter types')
    expect(result).toContain('Usage: `dust bucket tool test-tool`')
    expect(result).not.toContain('Parameters:')
    expect(result).not.toContain('(string, required)')
  })

  it('formats tool family as summary without sub-tool details', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'sessions',
        description:
          'Access historic agent sessions (search, filter, view details)',
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
    ]

    const result = formatToolsSection(tools)

    expect(result).toContain('### sessions')
    expect(result).toContain(
      'Access historic agent sessions (search, filter, view details)'
    )
    expect(result).toContain(
      'Usage: `dust bucket tool sessions` (run to see available operations)'
    )
    // Sub-tools should NOT be rendered
    expect(result).not.toContain('### list')
    expect(result).not.toContain('### view')
    expect(result).not.toContain('List all sessions')
    expect(result).not.toContain('Session ID')
  })

  it('formats tool with empty children array as summary', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'empty-family',
        description: 'A family with no children yet',
        endpoint: '/api/empty',
        method: 'GET',
        parameters: [],
        children: [],
      },
    ]

    const result = formatToolsSection(tools)

    // Empty children array means it's not a family (no progressive disclosure needed)
    expect(result).toContain('### empty-family')
    expect(result).toContain('Usage: `dust bucket tool empty-family`')
    expect(result).not.toContain('(run to see available operations)')
  })

  it('mixes regular tools and tool families', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'ping',
        description: 'Check connectivity',
        endpoint: '/api/ping',
        method: 'GET',
        parameters: [],
      },
      {
        name: 'sessions',
        description: 'Access historic sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'list',
            description: 'List sessions',
            endpoint: '/api/sessions/list',
            method: 'GET',
            parameters: [],
          },
        ],
      },
      {
        name: 'upload',
        description: 'Upload a file',
        endpoint: '/api/upload',
        method: 'POST',
        parameters: [
          {
            name: 'file',
            type: 'file',
            required: true,
            description: 'The file',
          },
        ],
      },
    ]

    const result = formatToolsSection(tools)

    // Regular tool with full details
    expect(result).toContain('### ping')
    expect(result).toContain('Usage: `dust bucket tool ping`')
    expect(result).not.toMatch(/ping.*run to see available operations/)

    // Tool family as summary
    expect(result).toContain('### sessions')
    expect(result).toContain(
      'Usage: `dust bucket tool sessions` (run to see available operations)'
    )
    expect(result).not.toContain('### list')

    // Regular tool with parameters (no parameter details in prompt)
    expect(result).toContain('### upload')
    expect(result).toContain('Usage: `dust bucket tool upload`')
  })
})

describe('formatToolsSection with revealed families', () => {
  it('renders revealed family with full sub-tool details', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'sessions',
        description:
          'Access historic agent sessions (search, filter, view details)',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'search',
            description: 'Search through past sessions',
            endpoint: '/api/sessions/search',
            method: 'GET',
            parameters: [
              {
                name: 'query',
                type: 'string',
                required: true,
                description: 'Search term',
              },
              {
                name: 'since',
                type: 'string',
                required: false,
                description: 'Start date (ISO format)',
              },
            ],
          },
          {
            name: 'get',
            description: 'Retrieve a specific session by ID',
            endpoint: '/api/sessions/get',
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
    ]

    const revealedFamilies = new Set(['sessions'])
    const result = formatToolsSection(tools, revealedFamilies)

    // Header
    expect(result).toContain('### sessions')
    expect(result).toContain(
      'Access historic agent sessions (search, filter, view details)'
    )
    expect(result).toContain('**Sub-tools:**')

    // First sub-tool
    expect(result).toContain('#### search')
    expect(result).toContain('Search through past sessions')
    expect(result).toContain('- `query` (string, required): Search term')
    expect(result).toContain(
      '- `since` (string, optional): Start date (ISO format)'
    )
    expect(result).toContain(
      'Usage: `dust bucket tool sessions search <query> [--since <since>]`'
    )

    // Second sub-tool
    expect(result).toContain('#### get')
    expect(result).toContain('Retrieve a specific session by ID')
    expect(result).toContain('- `id` (string, required): Session ID')
    expect(result).toContain('Usage: `dust bucket tool sessions get <id>`')

    // Should NOT show the summary usage
    expect(result).not.toContain('(run to see available operations)')
  })

  it('renders unrevealed family as summary when other families are revealed', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'Access historic sessions',
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
        ],
      },
      {
        name: 'metrics',
        description: 'Access metrics data',
        endpoint: '/api/metrics',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'query',
            description: 'Query metrics',
            endpoint: '/api/metrics/query',
            method: 'GET',
            parameters: [],
          },
        ],
      },
    ]

    // Only 'sessions' is revealed
    const revealedFamilies = new Set(['sessions'])
    const result = formatToolsSection(tools, revealedFamilies)

    // Sessions should be revealed
    expect(result).toContain('**Sub-tools:**')
    expect(result).toContain('#### list')
    expect(result).toContain('List all sessions')

    // Metrics should still be a summary
    expect(result).toContain('### metrics')
    expect(result).toContain(
      'Usage: `dust bucket tool metrics` (run to see available operations)'
    )
    expect(result).not.toContain('#### query')
    expect(result).not.toContain('Query metrics')
  })

  it('renders all families as summaries when revealedFamilies is empty', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'Access historic sessions',
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
        ],
      },
    ]

    const revealedFamilies = new Set<string>()
    const result = formatToolsSection(tools, revealedFamilies)

    // Should render as summary
    expect(result).toContain('### sessions')
    expect(result).toContain(
      'Usage: `dust bucket tool sessions` (run to see available operations)'
    )
    expect(result).not.toContain('**Sub-tools:**')
    expect(result).not.toContain('#### list')
  })

  it('renders revealed family with no parameters on sub-tools', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'cache',
        description: 'Cache management operations',
        endpoint: '/api/cache',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'clear',
            description: 'Clear all cached data',
            endpoint: '/api/cache/clear',
            method: 'POST',
            parameters: [],
          },
        ],
      },
    ]

    const revealedFamilies = new Set(['cache'])
    const result = formatToolsSection(tools, revealedFamilies)

    expect(result).toContain('### cache')
    expect(result).toContain('**Sub-tools:**')
    expect(result).toContain('#### clear')
    expect(result).toContain('Clear all cached data')
    expect(result).toContain('Usage: `dust bucket tool cache clear`')
    expect(result).not.toContain('Parameters:')
  })

  it('mixes revealed families with regular tools', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'ping',
        description: 'Check connectivity',
        endpoint: '/api/ping',
        method: 'GET',
        parameters: [],
      },
      {
        name: 'sessions',
        description: 'Access historic sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'list',
            description: 'List sessions',
            endpoint: '/api/sessions/list',
            method: 'GET',
            parameters: [],
          },
        ],
      },
    ]

    const revealedFamilies = new Set(['sessions'])
    const result = formatToolsSection(tools, revealedFamilies)

    // Regular tool rendered normally
    expect(result).toContain('### ping')
    expect(result).toContain('Usage: `dust bucket tool ping`')

    // Revealed family with full details
    expect(result).toContain('### sessions')
    expect(result).toContain('**Sub-tools:**')
    expect(result).toContain('#### list')
  })
})

describe('formatToolFamilyHelp', () => {
  it('formats a tool family with sub-tools', () => {
    const family: ToolDefinition = {
      name: 'sessions',
      description: 'Access historic agent sessions',
      endpoint: '/api/sessions',
      method: 'GET',
      parameters: [],
      children: [
        {
          name: 'search',
          description: 'Search through past sessions',
          endpoint: '/api/sessions/search',
          method: 'GET',
          parameters: [
            {
              name: 'query',
              type: 'string',
              required: true,
              description: 'Search term',
            },
            {
              name: 'since',
              type: 'string',
              required: false,
              description: 'Start date (ISO format)',
            },
          ],
        },
        {
          name: 'get',
          description: 'Retrieve a specific session by ID',
          endpoint: '/api/sessions/get',
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
    }

    const result = formatToolFamilyHelp(family)

    // Header
    expect(result).toContain('## sessions')
    expect(result).toContain('Access historic agent sessions')
    expect(result).toContain('Available operations:')

    // First sub-tool
    expect(result).toContain('### search')
    expect(result).toContain('Search through past sessions')
    expect(result).toContain('- `query` (string, required): Search term')
    expect(result).toContain(
      '- `since` (string, optional): Start date (ISO format)'
    )
    expect(result).toContain(
      'Usage: `dust bucket tool sessions search <query> [--since <since>]`'
    )

    // Second sub-tool
    expect(result).toContain('### get')
    expect(result).toContain('Retrieve a specific session by ID')
    expect(result).toContain('- `id` (string, required): Session ID')
    expect(result).toContain('Usage: `dust bucket tool sessions get <id>`')
  })

  it('formats a tool family with no parameters on sub-tools', () => {
    const family: ToolDefinition = {
      name: 'cache',
      description: 'Cache management operations',
      endpoint: '/api/cache',
      method: 'GET',
      parameters: [],
      children: [
        {
          name: 'clear',
          description: 'Clear all cached data',
          endpoint: '/api/cache/clear',
          method: 'POST',
          parameters: [],
        },
      ],
    }

    const result = formatToolFamilyHelp(family)

    expect(result).toContain('## cache')
    expect(result).toContain('### clear')
    expect(result).toContain('Clear all cached data')
    expect(result).toContain('Usage: `dust bucket tool cache clear`')
    expect(result).not.toContain('Parameters:')
  })

  it('handles empty children array', () => {
    const family: ToolDefinition = {
      name: 'empty',
      description: 'Empty family',
      endpoint: '/api/empty',
      method: 'GET',
      parameters: [],
      children: [],
    }

    const result = formatToolFamilyHelp(family)

    expect(result).toContain('## empty')
    expect(result).toContain('Empty family')
    expect(result).toContain('Available operations:')
    // No sub-tool sections
    expect(result).not.toContain('###')
  })

  it('handles undefined children', () => {
    const family: ToolDefinition = {
      name: 'no-children',
      description: 'Family with no children defined',
      endpoint: '/api/no-children',
      method: 'GET',
      parameters: [],
    }

    const result = formatToolFamilyHelp(family)

    expect(result).toContain('## no-children')
    expect(result).toContain('Family with no children defined')
    expect(result).toContain('Available operations:')
    // No sub-tool sections
    expect(result).not.toContain('###')
  })
})
