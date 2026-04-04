import { describe, it, expect } from 'bun:test'
import { Veloquent } from '../src/core/client.js'
import { MockHttpAdapter, MockStorageAdapter } from './mocks.js'

describe('Onboarding', () => {
  it('initialized endpoint is correct', async () => {
    const httpAdapter = new MockHttpAdapter()
    const storageAdapter = new MockStorageAdapter()

    httpAdapter.mockResponse(200, {
      message: 'OK',
      data: true
    })

    const sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })

    const initialized = await sdk.onboarding.initialized()

    expect(initialized).toBe(true)
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/onboarding/initialized')
  })

  it('createSuperuser endpoint is correct', async () => {
    const httpAdapter = new MockHttpAdapter()
    const storageAdapter = new MockStorageAdapter()

    const payload = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123'
    }

    httpAdapter.mockResponse(201, {
      message: 'Created',
      data: {
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@example.com'
      }
    })

    const sdk = new Veloquent({
      apiUrl: 'http://localhost:3000',
      http: httpAdapter,
      storage: storageAdapter
    })

    const result = await sdk.onboarding.createSuperuser(payload)

    expect(result).toEqual({
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@example.com'
    })
    expect(httpAdapter.getLastRequest().url).toBe('http://localhost:3000/api/onboarding/superuser')
    expect(httpAdapter.getLastRequest().body).toEqual(payload)
  })
})
