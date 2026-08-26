import assert from 'node:assert/strict'
import test from 'node:test'

import { createSecureStoreAdapter } from '../src/auth/secure-store-adapter'

function createMemoryStore() {
  const values = new Map<string, string>()

  return {
    values,
    store: {
      deleteItemAsync: async (key: string) => {
        values.delete(key)
      },
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        values.set(key, value)
      },
    },
  }
}

test('round-trips values across bounded SecureStore chunks', async () => {
  const memory = createMemoryStore()
  const adapter = createSecureStoreAdapter(memory.store, 5)

  await adapter.setItem('session', 'abcdefghijkl')

  assert.equal(await adapter.getItem('session'), 'abcdefghijkl')
  assert.equal(memory.values.get('session.meta'), '3')
  assert.equal(memory.values.get('session.0'), 'abcde')
  assert.equal(memory.values.get('session.2'), 'kl')
})

test('removes stale chunks when a stored value shrinks', async () => {
  const memory = createMemoryStore()
  const adapter = createSecureStoreAdapter(memory.store, 5)

  await adapter.setItem('session', 'abcdefghijkl')
  await adapter.setItem('session', 'small')

  assert.equal(await adapter.getItem('session'), 'small')
  assert.equal(memory.values.has('session.1'), false)
  assert.equal(memory.values.has('session.2'), false)
})

test('removes all chunks and metadata', async () => {
  const memory = createMemoryStore()
  const adapter = createSecureStoreAdapter(memory.store, 5)

  await adapter.setItem('session', 'abcdefghijkl')
  await adapter.removeItem('session')

  assert.equal(await adapter.getItem('session'), null)
  assert.equal(memory.values.size, 0)
})

test('returns null when a stored chunk is missing', async () => {
  const memory = createMemoryStore()
  const adapter = createSecureStoreAdapter(memory.store, 5)

  await adapter.setItem('session', 'abcdefghijkl')
  memory.values.delete('session.1')

  assert.equal(await adapter.getItem('session'), null)
})
