import { describe, it, expect } from 'bun:test'
import { Veloquent } from '../src/core/client.js'
import { MockHttpAdapter, MockStorageAdapter } from './mocks.js'

describe('Schema', () => {
  it('corrupt endpoint is correct', async () => {
    const httpAdapter = new MockHttpAdapter()
    const storageAdapter = new MockStorageAdapter()

    httpAdapter.mockResponse(200, {
      message: 'OK',
      data: [{ collection: 'users', error: 'mismatch' }]
    })

    const sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })

    const result = await sdk.schema.corrupt()

    expect(result).toEqual([{ collection: 'users', error: 'mismatch' }])
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/schema/corrupt')
  })

  it('orphans and drop endpoints are correct', async () => {
    const httpAdapter = new MockHttpAdapter()
    const storageAdapter = new MockStorageAdapter()

    httpAdapter.mockResponse(200, { message: 'OK', data: ['orphan_table'] })
    httpAdapter.mockResponse(200, { message: 'OK', data: [] })
    httpAdapter.mockResponse(200, { message: 'OK', data: [] })

    const sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })

    const orphans = await sdk.schema.orphans()
    expect(orphans).toEqual(['orphan_table'])

    await sdk.schema.dropOrphans()
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/schema/orphans')

    await sdk.schema.dropOrphan('orphan_table')
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/schema/orphans/orphan_table')
  })

  it('transfer export, import and options endpoints are correct', async () => {
    const httpAdapter = new MockHttpAdapter()
    const storageAdapter = new MockStorageAdapter()

    httpAdapter.mockResponse(200, { message: 'OK', data: { schema: [] } })
    httpAdapter.mockResponse(200, { message: 'OK', data: { imported: true } })
    httpAdapter.mockResponse(200, { message: 'OK', data: { options: ['json'] } })

    const sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })

    const exportResult = await sdk.schema.transferExport({ includeSystem: true })
    expect(exportResult).toEqual({ schema: [] })
    expect(httpAdapter.getLastRequest().path).toBeUndefined()
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/schema/transfer/export')

    const importResult = await sdk.schema.transferImport({ schema: [] })
    expect(importResult).toEqual({ imported: true })
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/schema/transfer/import')

    const options = await sdk.schema.transferOptions()
    expect(options).toEqual({ options: ['json'] })
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/schema/transfer/options')
  })
})
