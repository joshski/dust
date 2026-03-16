import { describe, expect, it } from 'vitest'
import type { ToolDefinition } from './server-messages'
import { formatToolsSection } from './tool-prompt'

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

  it('formats a tool with required parameters', () => {
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
    expect(result).toContain('Parameters:')
    expect(result).toContain('- `file` (file, required): The file to upload')
    expect(result).toContain('Usage: `dust bucket tool asset-upload <file>`')
  })

  it('formats a tool with optional parameters', () => {
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

    expect(result).toContain(
      '- `key` (string, required): The configuration key'
    )
    expect(result).toContain(
      '- `value` (string, optional): The value to set (omit to get current value)'
    )
    expect(result).toContain('Usage: `dust bucket tool config <key> <value>`')
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
    expect(result).toContain('Usage: `dust bucket tool upload <file>`')
  })

  it('formats all parameter types correctly', () => {
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

    expect(result).toContain('- `str` (string, required): A string')
    expect(result).toContain('- `num` (number, required): A number')
    expect(result).toContain('- `flag` (boolean, optional): A boolean')
    expect(result).toContain('- `data` (file, optional): A file')
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

    // Regular tool with parameters
    expect(result).toContain('### upload')
    expect(result).toContain('Usage: `dust bucket tool upload <file>`')
  })
})
