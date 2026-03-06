import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../test/test-utilities'
import type { ToolDefinition } from './server-messages'
import { findToolByName, loadStoredTools, storeTools } from './tool-storage'

const sampleTools: ToolDefinition[] = [
  {
    name: 'asset-upload',
    description: 'Upload a file',
    endpoint: '/api/assets',
    method: 'POST',
    parameters: [
      {
        name: 'file',
        type: 'file',
        required: true,
        description: 'File to upload',
      },
    ],
  },
  {
    name: 'status',
    description: 'Check status',
    endpoint: '/api/status',
    method: 'GET',
    parameters: [],
  },
]

describe('loadStoredTools', () => {
  test('returns empty array when file does not exist', async () => {
    const fileSystem = createFileSystemEmulator()
    const tools = await loadStoredTools(fileSystem, '/home')
    expect(tools).toEqual([])
  })

  test('returns empty array when file is invalid JSON', async () => {
    const fileSystem = createFileSystemEmulator({
      home: { '.dust': { 'tools.json': 'not json' } },
    })
    const tools = await loadStoredTools(fileSystem, '/home')
    expect(tools).toEqual([])
  })

  test('returns empty array when tools is not an array', async () => {
    const fileSystem = createFileSystemEmulator({
      home: { '.dust': { 'tools.json': '{"tools":"not-array"}' } },
    })
    const tools = await loadStoredTools(fileSystem, '/home')
    expect(tools).toEqual([])
  })

  test('returns stored tools', async () => {
    const fileSystem = createFileSystemEmulator({
      home: {
        '.dust': { 'tools.json': JSON.stringify({ tools: sampleTools }) },
      },
    })
    const tools = await loadStoredTools(fileSystem, '/home')
    expect(tools).toEqual(sampleTools)
  })
})

describe('storeTools', () => {
  test('stores tools to disk', async () => {
    const fileSystem = createFileSystemEmulator()
    await storeTools(fileSystem, '/home', sampleTools)
    expect(fileSystem.writtenFiles.get('/home/.dust/tools.json')).toBe(
      JSON.stringify({ tools: sampleTools })
    )
  })

  test('creates .dust directory if needed', async () => {
    const fileSystem = createFileSystemEmulator()
    await storeTools(fileSystem, '/home', sampleTools)
    expect(fileSystem.createdDirs).toContain('/home/.dust')
  })
})

describe('findToolByName', () => {
  test('finds tool by name', () => {
    const tool = findToolByName(sampleTools, 'asset-upload')
    expect(tool?.name).toBe('asset-upload')
  })

  test('returns undefined for unknown tool', () => {
    const tool = findToolByName(sampleTools, 'unknown')
    expect(tool).toBeUndefined()
  })
})
