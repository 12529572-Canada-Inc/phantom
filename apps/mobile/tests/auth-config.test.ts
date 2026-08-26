import assert from 'node:assert/strict'
import test from 'node:test'

import { readSupabaseConfig } from '../src/auth/config'

test('accepts a valid public Supabase URL and key', () => {
  const result = readSupabaseConfig({
    EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
  })

  assert.deepEqual(result, {
    ok: true,
    value: {
      url: 'https://project.supabase.co',
      publishableKey: 'public-key',
    },
  })
})

test('rejects missing or non-https hosted Supabase configuration', () => {
  assert.equal(readSupabaseConfig({}).ok, false)
  assert.equal(
    readSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'http://project.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
    }).ok,
    false,
  )
})

test('allows an http loopback URL for local Supabase development', () => {
  assert.equal(
    readSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-public-key',
    }).ok,
    true,
  )
})
