import { describe, it, expect, beforeEach } from 'bun:test'
import { Veloquent } from '../src/core/client.js'
import { MockHttpAdapter, MockStorageAdapter } from './mocks.js'

/**
 * Minimal File polyfill for Bun/Node test environments.
 * Real browser File inherits from Blob.
 */
class MockFile extends Blob {
  constructor(parts, name, options = {}) {
    super(parts, options)
    this.name = name
    this.lastModified = options.lastModified ?? Date.now()
  }
}

if (typeof globalThis.File === 'undefined') {
  globalThis.File = MockFile
}

describe('Records — file uploads', () => {
  let httpAdapter
  let storageAdapter
  let sdk

  beforeEach(() => {
    httpAdapter = new MockHttpAdapter()
    storageAdapter = new MockStorageAdapter()
    storageAdapter.setItem('vp:token', 'test-token')
    sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })
  })

  it('create with a File sends FormData (not JSON)', async () => {
    httpAdapter.mockResponse(201, {
      message: 'Created',
      data: { id: 'rec-1', name: 'Kevin' }
    })

    const file = new File([new Uint8Array([1, 2, 3])], 'avatar.jpg', { type: 'image/jpeg' })

    await sdk.records.create('users', {
      name: 'Kevin',
      avatar: file
    })

    const req = httpAdapter.getLastRequest()
    expect(req.method).toBe('POST')
    expect(req.url).toBe('http://localhost:3000/api/collections/users/records')
    // Body must be FormData, not a plain object
    expect(req.body).toBeInstanceOf(FormData)
    // FormData should contain both the text field and the file field
    expect(req.body.get('name')).toBe('Kevin')
    expect(req.body.get('avatar')).toBeInstanceOf(Blob)
  })

  it('create with an array of Files sends FormData with multiple entries', async () => {
    httpAdapter.mockResponse(201, { message: 'Created', data: { id: 'rec-2' } })

    const file1 = new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' })
    const file2 = new File([new Uint8Array([2])], 'b.jpg', { type: 'image/jpeg' })

    await sdk.records.create('posts', {
      title: 'My Trip',
      gallery: [file1, file2]
    })

    const req = httpAdapter.getLastRequest()
    expect(req.body).toBeInstanceOf(FormData)
    // getAll returns multiple entries for the same key
    const galleryEntries = req.body.getAll('gallery')
    expect(galleryEntries.length).toBe(2)
  })

  it('create with plain data still sends JSON (no FormData)', async () => {
    httpAdapter.mockResponse(201, { message: 'Created', data: { id: 'rec-3', title: 'Hello' } })

    await sdk.records.create('posts', { title: 'Hello', status: 'draft' })

    const req = httpAdapter.getLastRequest()
    expect(req.body).not.toBeInstanceOf(FormData)
    expect(req.body).toEqual({ title: 'Hello', status: 'draft' })
  })

  it('update with a File sends FormData', async () => {
    httpAdapter.mockResponse(200, { message: 'OK', data: { id: 'rec-1', avatar: [] } })

    const file = new File([new Uint8Array([9])], 'new-avatar.png', { type: 'image/png' })

    await sdk.records.update('users', 'rec-1', { avatar: file })

    const req = httpAdapter.getLastRequest()
    expect(req.method).toBe('PATCH')
    expect(req.body).toBeInstanceOf(FormData)
    expect(req.body.get('avatar')).toBeInstanceOf(Blob)
  })

  it('update with "fieldName+" key appends files in FormData', async () => {
    httpAdapter.mockResponse(200, { message: 'OK', data: { id: 'rec-1' } })

    const file = new File([new Uint8Array([5])], 'extra.jpg', { type: 'image/jpeg' })

    await sdk.records.update('posts', 'rec-1', { 'gallery+': [file] })

    const req = httpAdapter.getLastRequest()
    expect(req.body).toBeInstanceOf(FormData)
    const entries = req.body.getAll('gallery+')
    expect(entries.length).toBe(1)
    expect(entries[0]).toBeInstanceOf(Blob)
  })

  it('update with "fieldName-" remove selector sends JSON (no files)', async () => {
    httpAdapter.mockResponse(200, { message: 'OK', data: { id: 'rec-1' } })

    await sdk.records.update('posts', 'rec-1', {
      'gallery-': [{ path: 'collections/posts/abc.jpg' }]
    })

    const req = httpAdapter.getLastRequest()
    // No files — should still send as plain JSON
    expect(req.body).not.toBeInstanceOf(FormData)
    expect(req.body['gallery-']).toEqual([{ path: 'collections/posts/abc.jpg' }])
  })

  it('update with plain data sends JSON', async () => {
    httpAdapter.mockResponse(200, { message: 'OK', data: { id: 'rec-1', status: 'published' } })

    await sdk.records.update('posts', 'rec-1', { status: 'published' })

    const req = httpAdapter.getLastRequest()
    expect(req.body).not.toBeInstanceOf(FormData)
    expect(req.body).toEqual({ status: 'published' })
  })
})
