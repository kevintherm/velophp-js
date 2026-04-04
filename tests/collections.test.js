import { describe, it, expect } from 'bun:test'
import { Veloquent } from '../src/core/client.js'
import { MockHttpAdapter, MockStorageAdapter } from './mocks.js'

describe('Collections', () => {
  it('list collections endpoint is correct', async () => {
    const httpAdapter = new MockHttpAdapter()
    const storageAdapter = new MockStorageAdapter()

    httpAdapter.mockResponse(200, {
      message: 'OK',
      data: [{ id: 'col-1', name: 'users' }]
    })

    const sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })

    const collections = await sdk.collections.list({ filter: 'type = "auth"', sort: 'name' })

    expect(collections).toEqual([{ id: 'col-1', name: 'users' }])

    const req = httpAdapter.getLastRequest()
    expect(req.method).toBe('GET')
    expect(req.url).toContain('http://localhost:3000/api/collections?filter=type+%3D+%22auth%22')
    expect(req.url).toContain('sort=name')
  })

  it('create collection calls correct endpoint', async () => {
    const httpAdapter = new MockHttpAdapter()
    const storageAdapter = new MockStorageAdapter()

    httpAdapter.mockResponse(201, {
      message: 'Created',
      data: { id: 'col-2', name: 'posts' }
    })

    const sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })

    const collection = await sdk.collections.create({
      name: 'posts',
      type: 'base',
      fields: [{ name: 'title', type: 'text' }]
    })

    expect(collection.name).toBe('posts')
    expect(httpAdapter.getLastRequest().method).toBe('POST')
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/collections')
  })

  it('get, update, delete and truncate endpoints are correct', async () => {
    const httpAdapter = new MockHttpAdapter()
    const storageAdapter = new MockStorageAdapter()

    httpAdapter.mockResponse(200, { message: 'OK', data: { id: 'col-3', name: 'settings' } })
    httpAdapter.mockResponse(200, { message: 'OK', data: { id: 'col-3', name: 'settings', description: 'Updated' } })
    httpAdapter.mockResponse(200, { message: 'OK', data: [] })
    httpAdapter.mockResponse(200, { message: 'OK', data: { deleted: 42 } })

    const sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })

    await sdk.collections.get('settings')
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/collections/settings')

    await sdk.collections.update('settings', { description: 'Updated' })
    expect(httpAdapter.getLastRequest().method).toBe('PATCH')
    expect(httpAdapter.getLastRequest().body).toEqual({ description: 'Updated' })

    await sdk.collections.delete('settings')
    expect(httpAdapter.getLastRequest().method).toBe('DELETE')
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/collections/settings')

    await sdk.collections.truncate('settings')
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/collections/settings/truncate')
  })
})
