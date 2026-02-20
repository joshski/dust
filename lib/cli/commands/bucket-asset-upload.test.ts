import { afterEach, describe, expect, test } from 'vitest'
import type { AuthDependencies } from '../../bucket/auth'
import {
  createContextEmulator,
  createFileSystemEmulator,
  restoreEnv,
  stubEnv,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import {
  bucketAssetUpload,
  formatFileSize,
  getContentType,
  isAllowedExtension,
  type UploadDependencies,
} from './bucket-asset-upload'

function createMockAuthDeps(
  overrides: Partial<AuthDependencies> = {}
): AuthDependencies {
  return {
    createServer: () => ({ port: 9999, stop: () => {} }),
    openBrowser: () => {},
    getHomeDir: () => '/home',
    fileSystem: createFileSystemEmulator(),
    exchangeCode: async () => 'browser-tok',
    ...overrides,
  }
}

function createDependencies(
  commandArguments: string[] = []
): CommandDependencies {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator()
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

function createMockUploadDeps(
  overrides: Partial<UploadDependencies> = {}
): UploadDependencies {
  return {
    auth: createMockAuthDeps(),
    readFileBytes: async () => new Uint8Array([1, 2, 3]),
    getFileSize: async () => 1000,
    fileExists: async () => true,
    uploadFile: async () => ({ url: 'https://dustbucket.com/assets/abc123' }),
    ...overrides,
  }
}

describe('getContentType', () => {
  test('returns correct MIME type for images', () => {
    expect(getContentType('/path/to/image.png')).toBe('image/png')
    expect(getContentType('/path/to/image.jpg')).toBe('image/jpeg')
    expect(getContentType('/path/to/image.jpeg')).toBe('image/jpeg')
    expect(getContentType('/path/to/image.gif')).toBe('image/gif')
    expect(getContentType('/path/to/image.webp')).toBe('image/webp')
    expect(getContentType('/path/to/image.svg')).toBe('image/svg+xml')
  })

  test('returns correct MIME type for documents', () => {
    expect(getContentType('/path/to/doc.pdf')).toBe('application/pdf')
    expect(getContentType('/path/to/doc.txt')).toBe('text/plain')
    expect(getContentType('/path/to/doc.json')).toBe('application/json')
    expect(getContentType('/path/to/doc.csv')).toBe('text/csv')
    expect(getContentType('/path/to/doc.md')).toBe('text/markdown')
    expect(getContentType('/path/to/doc.html')).toBe('text/html')
    expect(getContentType('/path/to/doc.xml')).toBe('application/xml')
  })

  test('returns octet-stream for unknown extensions', () => {
    expect(getContentType('/path/to/file.xyz')).toBe('application/octet-stream')
    expect(getContentType('/path/to/file')).toBe('application/octet-stream')
  })

  test('handles uppercase extensions', () => {
    expect(getContentType('/path/to/image.PNG')).toBe('image/png')
    expect(getContentType('/path/to/doc.PDF')).toBe('application/pdf')
  })
})

describe('isAllowedExtension', () => {
  test('allows supported image formats', () => {
    expect(isAllowedExtension('/path/to/image.png')).toBe(true)
    expect(isAllowedExtension('/path/to/image.jpg')).toBe(true)
    expect(isAllowedExtension('/path/to/image.jpeg')).toBe(true)
    expect(isAllowedExtension('/path/to/image.gif')).toBe(true)
    expect(isAllowedExtension('/path/to/image.webp')).toBe(true)
    expect(isAllowedExtension('/path/to/image.svg')).toBe(true)
  })

  test('allows supported document formats', () => {
    expect(isAllowedExtension('/path/to/doc.pdf')).toBe(true)
    expect(isAllowedExtension('/path/to/doc.txt')).toBe(true)
    expect(isAllowedExtension('/path/to/doc.json')).toBe(true)
    expect(isAllowedExtension('/path/to/doc.csv')).toBe(true)
    expect(isAllowedExtension('/path/to/doc.md')).toBe(true)
    expect(isAllowedExtension('/path/to/doc.html')).toBe(true)
    expect(isAllowedExtension('/path/to/doc.xml')).toBe(true)
  })

  test('rejects unsupported extensions', () => {
    expect(isAllowedExtension('/path/to/script.exe')).toBe(false)
    expect(isAllowedExtension('/path/to/archive.zip')).toBe(false)
    expect(isAllowedExtension('/path/to/binary.bin')).toBe(false)
  })

  test('rejects files without extension', () => {
    expect(isAllowedExtension('/path/to/file')).toBe(false)
  })

  test('handles uppercase extensions', () => {
    expect(isAllowedExtension('/path/to/IMAGE.PNG')).toBe(true)
    expect(isAllowedExtension('/path/to/DOC.PDF')).toBe(true)
  })
})

describe('formatFileSize', () => {
  test('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 bytes')
    expect(formatFileSize(500)).toBe('500 bytes')
    expect(formatFileSize(1023)).toBe('1023 bytes')
  })

  test('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(1024 * 1023)).toBe('1023.0 KB')
  })

  test('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
    expect(formatFileSize(1024 * 1024 * 5)).toBe('5.0 MB')
    expect(formatFileSize(1024 * 1024 * 10.5)).toBe('10.5 MB')
  })
})

describe('bucketAssetUpload', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('shows usage when no file path provided', async () => {
    const dependencies = createDependencies([])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const uploadDeps = createMockUploadDeps()

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Usage:')
    expect(context.stderrLines.join('\n')).toContain(
      'dust bucket asset upload <file-path>'
    )
  })

  test('returns error when file does not exist', async () => {
    const dependencies = createDependencies(['/path/to/missing.png'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const uploadDeps = createMockUploadDeps({
      fileExists: async () => false,
    })

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('File not found')
    expect(context.stderrLines.join('\n')).toContain('/path/to/missing.png')
  })

  test('returns error when file type is not allowed', async () => {
    const dependencies = createDependencies(['/path/to/script.exe'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const uploadDeps = createMockUploadDeps()

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Unsupported file type')
    expect(context.stderrLines.join('\n')).toContain('.exe')
    expect(context.stderrLines.join('\n')).toContain('Allowed types:')
  })

  test('returns error when file has no extension', async () => {
    const dependencies = createDependencies(['/path/to/noextension'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const uploadDeps = createMockUploadDeps()

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Unsupported file type')
    expect(context.stderrLines.join('\n')).toContain('(no extension)')
  })

  test('returns error when file exceeds size limit', async () => {
    const dependencies = createDependencies(['/path/to/large.png'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const uploadDeps = createMockUploadDeps({
      getFileSize: async () => 11 * 1024 * 1024, // 11 MB
    })

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('File too large')
    expect(context.stderrLines.join('\n')).toContain('11.0 MB')
    expect(context.stderrLines.join('\n')).toContain('max 10.0 MB')
  })

  test('uses DUST_BUCKET_TOKEN from environment', async () => {
    stubEnv('DUST_BUCKET_TOKEN', 'env-token')
    const dependencies = createDependencies(['/path/to/image.png'])
    let capturedToken: string | undefined

    const uploadDeps = createMockUploadDeps({
      uploadFile: async (_url, token) => {
        capturedToken = token
        return { url: 'https://dustbucket.com/assets/abc123' }
      },
    })

    await bucketAssetUpload(dependencies, uploadDeps)

    expect(capturedToken).toBe('env-token')
  })

  test('uses stored credential when no env token', async () => {
    const dependencies = createDependencies(['/path/to/image.png'])
    let capturedToken: string | undefined

    const authFs = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{"token":"stored-token"}' } },
    })

    const uploadDeps = createMockUploadDeps({
      auth: createMockAuthDeps({ fileSystem: authFs }),
      uploadFile: async (_url, token) => {
        capturedToken = token
        return { url: 'https://dustbucket.com/assets/abc123' }
      },
    })

    await bucketAssetUpload(dependencies, uploadDeps)

    expect(capturedToken).toBe('stored-token')
  })

  test('triggers browser auth when no token available', async () => {
    const dependencies = createDependencies(['/path/to/image.png'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    let capturedToken: string | undefined

    const uploadDeps = createMockUploadDeps({
      auth: createMockAuthDeps({
        createServer: handler => {
          setTimeout(() => {
            handler(
              new Request('http://localhost:9999/callback?code=test-code')
            )
          }, 0)
          return { port: 9999, stop: () => {} }
        },
      }),
      uploadFile: async (_url, token) => {
        capturedToken = token
        return { url: 'https://dustbucket.com/assets/abc123' }
      },
    })

    await bucketAssetUpload(dependencies, uploadDeps)

    expect(capturedToken).toBe('browser-tok')
    expect(context.stdoutLines.join('\n')).toContain('Opening browser')
    expect(context.stdoutLines.join('\n')).toContain(
      'Authenticated successfully'
    )
  })

  test('returns error when authentication fails', async () => {
    const dependencies = createDependencies(['/path/to/image.png'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const uploadDeps = createMockUploadDeps({
      auth: createMockAuthDeps({
        createServer: () => {
          throw new Error('Cannot start auth server')
        },
      }),
    })

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Authentication failed')
  })

  test('uploads file and outputs URL on success', async () => {
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    const dependencies = createDependencies(['/path/to/image.png'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let capturedUrl: string | undefined
    let capturedContentType: string | undefined
    let capturedBytes: Uint8Array | undefined

    const uploadDeps = createMockUploadDeps({
      readFileBytes: async () => new Uint8Array([1, 2, 3, 4]),
      uploadFile: async (url, _token, bytes, contentType) => {
        capturedUrl = url
        capturedBytes = bytes
        capturedContentType = contentType
        return { url: 'https://dustbucket.com/assets/uploaded123' }
      },
    })

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(0)
    expect(capturedUrl).toBe('https://dustbucket.com/api/assets')
    expect(capturedContentType).toBe('image/png')
    expect(capturedBytes).toEqual(new Uint8Array([1, 2, 3, 4]))
    expect(context.stdoutLines).toContain(
      'https://dustbucket.com/assets/uploaded123'
    )
  })

  test('uses correct content type for different file types', async () => {
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    let capturedContentType: string | undefined

    const uploadDeps = createMockUploadDeps({
      uploadFile: async (_url, _token, _bytes, contentType) => {
        capturedContentType = contentType
        return { url: 'https://dustbucket.com/assets/abc' }
      },
    })

    const jpegDeps = createDependencies(['/path/to/photo.jpeg'])
    await bucketAssetUpload(jpegDeps, uploadDeps)
    expect(capturedContentType).toBe('image/jpeg')

    const pdfDeps = createDependencies(['/path/to/doc.pdf'])
    await bucketAssetUpload(pdfDeps, uploadDeps)
    expect(capturedContentType).toBe('application/pdf')

    const svgDeps = createDependencies(['/path/to/icon.svg'])
    await bucketAssetUpload(svgDeps, uploadDeps)
    expect(capturedContentType).toBe('image/svg+xml')
  })

  test('returns error when upload fails', async () => {
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    const dependencies = createDependencies(['/path/to/image.png'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const uploadDeps = createMockUploadDeps({
      uploadFile: async () => {
        throw new Error('Upload failed (500): Internal server error')
      },
    })

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Upload failed')
    expect(context.stderrLines.join('\n')).toContain('Internal server error')
  })

  test('respects DUST_BUCKET_HOST for upload URL', async () => {
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    stubEnv('DUST_BUCKET_HOST', 'https://custom-bucket.example.com')
    const dependencies = createDependencies(['/path/to/image.png'])
    let capturedUrl: string | undefined

    const uploadDeps = createMockUploadDeps({
      uploadFile: async url => {
        capturedUrl = url
        return { url: 'https://custom-bucket.example.com/assets/abc' }
      },
    })

    await bucketAssetUpload(dependencies, uploadDeps)

    expect(capturedUrl).toBe('https://custom-bucket.example.com/api/assets')
  })

  test('accepts file at maximum allowed size', async () => {
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    const dependencies = createDependencies(['/path/to/image.png'])
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const uploadDeps = createMockUploadDeps({
      getFileSize: async () => 10 * 1024 * 1024, // Exactly 10 MB
      uploadFile: async () => ({ url: 'https://dustbucket.com/assets/abc' }),
    })

    const result = await bucketAssetUpload(dependencies, uploadDeps)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toContain('https://dustbucket.com/assets/abc')
  })
})
