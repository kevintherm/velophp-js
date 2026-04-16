# Veloquent JavaScript SDK

Lightweight, adapter-first SDK for Veloquent backend. Choose your own HTTP client and storage implementation.

## Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Custom Adapters](#custom-adapters)
- [API Reference](#api-reference)
  - [Auth Module](#auth-module)
  - [Records Module](#records-module)
    - [File Uploads](#file-uploads)
  - [Realtime Module](#realtime-module)
- [Custom HTTP Adapter](#custom-http-adapter)
- [Custom Storage Adapter](#custom-storage-adapter)
- [Error Handling](#error-handling)
- [Important Notes](#important-notes)
- [Testing](#testing)

## Features

- **Pluggable adapters**: Use default web adapters or bring your own HTTP and storage implementations
- **Minimal core**: Only ~3KB gzipped for core SDK
- **No Typescript**: JSDoc types for editor IntelliSense
- **Consumer-facing helpers**: Records, auth, and realtime built for application consumers

## Quick Start

```javascript
import { Veloquent, createFetchAdapter, createLocalStorageAdapter } from '@veloquent/sdk'

const sdk = new Veloquent({
  apiUrl: 'https://api.example.com',
  http: createFetchAdapter(),
  storage: createLocalStorageAdapter()
})

// Login to auth collection
const { token } = await sdk.auth.login('users', 'user@example.com', 'password')

// Records CRUD
const records = await sdk.records.list('users')
console.log(records.meta) // { current_page: 1, total: 100, ... }

const newRecord = await sdk.records.create('users', { name: 'John' })
const updated = await sdk.records.update('users', newRecord.id, { name: 'Jane' })
await sdk.records.delete('users', newRecord.id)

// Logout
await sdk.auth.logout('users')
```

## Custom Adapters

### Node.js Example

```javascript
import { Veloquent } from '@veloquent/sdk'
import { createNodeFetchAdapter } from './adapters/node-fetch-adapter.js'

const memoryStorage = {
  isAsync: false,
  data: {},
  getItem(key) { return this.data[key] ?? null },
  setItem(key, value) { this.data[key] = value },
  removeItem(key) { delete this.data[key] },
  clear() { this.data = {} }
}

const sdk = new Veloquent({
  apiUrl: 'https://api.example.com',
  http: createNodeFetchAdapter(),
  storage: memoryStorage
})
```

### React Native Example

```javascript
import { Veloquent, createFetchAdapter } from '@veloquent/sdk'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStorageAdapter } from './adapters/async-storage-adapter.js'

const sdk = new Veloquent({
  apiUrl: 'https://api.example.com',
  http: createFetchAdapter(),
  storage: createAsyncStorageAdapter(AsyncStorage)
})
```

## API Reference

### Auth Module

```javascript
// Login and store bearer token
const { token, expires_in, collection_name } = await sdk.auth.login(
  'users',                    // auth collection name
  'user@example.com',
  'password'
)

// Get current authenticated user
const user = await sdk.auth.me('users')

// Logout and revoke token
await sdk.auth.logout('users')

// Revoke all tokens for user (e.g., password change)
await sdk.auth.logoutAll('users')
```

> Note: Superuser-only auth operations such as impersonation require a valid superuser token.

### Records Module

```javascript
// List records with options
const records = await sdk.records.list('posts', {
  filter: 'status = "published"',
  sort: '-created_at,title',
  per_page: 25,
  expand: 'userId,categoryId'
})

console.log(records)      // [ {...}, {...} ]
console.log(records.meta) // { per_page: 25, current_page: 1, ... }

// Create record
const post = await sdk.records.create('posts', {
  title: 'Hello World',
  content: 'This is my first post',
  status: 'draft'
})

// Get single record
const post = await sdk.records.get('posts', recordId, {
  expand: 'userId'
})

// Update record
const updated = await sdk.records.update('posts', recordId, {
  status: 'published'
})

// Delete record
await sdk.records.delete('posts', recordId)
```

### File Uploads

File fields in collections accept `File`, `Blob`, `FileList`, or arrays of those. When any file value is
detected the SDK automatically sends the request as `multipart/form-data` — no extra setup needed.

#### Create a record with a file

```javascript
// From a browser file input
const file = document.querySelector('#avatar').files[0]

const user = await sdk.records.create('users', {
  name: 'Kevin',
  avatar: file          // File object — SDK handles multipart automatically
})
```

#### Create with multiple files

```javascript
const files = [...document.querySelector('#gallery').files]  // FileList → array

const post = await sdk.records.create('posts', {
  title: 'My Trip',
  gallery: files        // Array of File objects
})
```

#### Update — replace files on a field

```javascript
const newAvatar = document.querySelector('#new-avatar').files[0]

await sdk.records.update('users', userId, {
  avatar: newAvatar    // Replaces any existing avatar
})
```

#### Update — append files to a multi-file field

Suffix the field name with `+` to add files **without** replacing existing ones:

```javascript
await sdk.records.update('posts', postId, {
  'gallery+': [file1, file2]
})
```

#### Update — remove specific files

Suffix the field name with `-` and pass a path or metadata selector:

```javascript
// Path comes from the file metadata returned by the API (see response shape below)
await sdk.records.update('posts', postId, {
  'gallery-': [{ path: 'collections/posts/abc123.jpg' }]
})
```

#### File field response shape

File fields are returned as an array of metadata objects:

```json
{
  "id": "01JAB...",
  "avatar": [
    {
      "name": "photo.jpg",
      "path": "collections/users/01JAB-photo.jpg",
      "size": 204800,
      "extension": "jpg",
      "mime": "image/jpeg"
    }
  ]
}
```

The `path` value is what you pass to `field-` selectors when removing files.

#### React

```jsx
function AvatarUpload({ userId }) {
  const [uploading, setUploading] = useState(false)

  async function handleChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await sdk.records.update('users', userId, { avatar: file })
    } finally {
      setUploading(false)
    }
  }

  return <input type="file" accept="image/*" onChange={handleChange} disabled={uploading} />
}
```

#### Vue 3

```vue
<script setup>
async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  await sdk.records.create('photos', { title: 'Sunset', image: file })
}
</script>

<template>
  <input type="file" accept="image/*" @change="handleFileChange" />
</template>
```

#### Angular

```typescript
private selectedFile: File | null = null

onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  this.selectedFile = input.files?.[0] ?? null
}

async uploadAvatar() {
  if (!this.selectedFile) return
  await sdk.records.update('users', this.userId, { avatar: this.selectedFile })
}
```

## Superuser / Admin Features

Administrative SDK usage is documented separately in [SUPERUSER.md](SUPERUSER.md).

> These operations require a valid superuser token and are not intended for regular application consumers.

## Custom HTTP Adapter

Implement the `HttpAdapter` interface to provide your own HTTP client:

```javascript
class CustomHttpAdapter {
  async request(req) {
    // Determine headers
    const headers = {
      'content-type': 'application/json',
      ...(req.headers || {})
    }

    const response = await fetch(req.url, {
      method: req.method,
      headers: headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
      signal: req.signal
    })

    // Parse response data safely
    const contentType = response.headers.get('content-type') || ''
    let data = null
    
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data
    }
  }
}
```

## Realtime Module

Veloquent SDK supports realtime subscriptions via Laravel Echo.

```javascript
import { Veloquent, createFetchAdapter, createEchoAdapter } from '@veloquent/sdk'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// 1. Initialize Echo
window.Pusher = Pusher
const echo = new Echo({
  broadcaster: 'reverb',
  key: 'your-app-key',
  wsHost: 'ws.example.com',
  wsPort: 80,
  forceTLS: false,
  enabledTransports: ['ws', 'wss'],
})

// 2. Wrap Echo in SDK adapter
const realtimeAdapter = createEchoAdapter(echo)

// 3. Initialize SDK with realtime adapter
const sdk = new Veloquent({
  apiUrl: 'https://api.example.com',
  http: createFetchAdapter(),
  storage: localStorage,
  realtime: realtimeAdapter
})

// 4. Subscribe to collection changes
const channel = await sdk.realtime.subscribe('posts', { 
  filter: 'status = "published"' 
}, (event, payload) => {
  console.log('Event:', event)     // 'record.created', 'record.updated', 'record.deleted'
  console.log('Record:', payload)  // The modified record data
})

// 5. Unsubscribe when done
await sdk.realtime.unsubscribe('posts')
```

## Custom Storage Adapter

Implement the `StorageAdapter` interface for sync or async storage:

```javascript
// Sync (localStorage-like)
class SyncStorageAdapter {
  isAsync = false

  getItem(key) {
    return localStorage.getItem(key)
  }

  setItem(key, value) {
    localStorage.setItem(key, value)
  }

  removeItem(key) {
    localStorage.removeItem(key)
  }

  clear() {
    localStorage.clear()
  }
}

// Async (React Native AsyncStorage-like)
class AsyncStorageAdapter {
  isAsync = true

  // Sync methods not used in async mode
  getItem() { throw new Error('Use async methods') }
  setItem() { throw new Error('Use async methods') }
  removeItem() { throw new Error('Use async methods') }
  clear() { throw new Error('Use async methods') }

  // Async methods
  async getItemAsync(key) {
    return await AsyncStorage.getItem(key)
  }

  async setItemAsync(key, value) {
    await AsyncStorage.setItem(key, value)
  }

  async removeItemAsync(key) {
    await AsyncStorage.removeItem(key)
  }

  async clearAsync() {
    await AsyncStorage.clear()
  }
}
```

## Error Handling

```javascript
import { SdkError } from '@veloquent/sdk'

try {
  await sdk.records.create('posts', {})
} catch (error) {
  if (error instanceof SdkError) {
    console.error('Code:', error.code)         // 'VALIDATION_ERROR', 'UNAUTHORIZED', etc.
    console.error('Status:', error.statusCode) // 422, 401, 404, etc.
    console.error('Details:', error.details)   // Raw API errors
    console.error('Retryable:', error.isRetryable()) // Server errors only
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` (401) - No token or invalid token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists
- `VALIDATION_ERROR` (422) - Input validation failed
- `SERVER_ERROR` (5xx) - Server error (retryable)

## Important Notes

### Auth Collection Scoping
- Tokens are scoped to a specific auth collection
- `auth.me('users')` only works if your token was issued from the `users` collection
  - If you want to check what collection the users is authenticated from do `auth.me()` without any parameters
  - Mixing collections will result in a 401 error

### Token Persistence
- SDK automatically stores tokens in the provided storage adapter on login
- Tokens are automatically cleared on logout
- If you manually clear storage, subsequent requests will fail with 401

### Token Expiration
- The SDK does NOT auto-refresh expired tokens
- Implement re-authentication logic in your app or set token auth TTL to your preferences
- On 401, prompt user to login again

## Testing

Run tests with Bun:
```bash
bun test
```

## License

MIT
