import assert from 'node:assert/strict'
import test from 'node:test'

import { parseOAuthCallback } from '../src/auth/oauth'
import {
  validateCredentials,
  validateSignUpCredentials,
} from '../src/auth/validation'

test('normalizes valid email credentials', () => {
  const result = validateCredentials('  player@example.com ', 'eldritch-signal')

  assert.equal(result.success, true)
  if (result.success) {
    assert.deepEqual(result.data, {
      email: 'player@example.com',
      password: 'eldritch-signal',
    })
  }
})

test('rejects malformed email and short passwords', () => {
  const result = validateCredentials('not-an-email', 'short')

  assert.equal(result.success, false)
})

test('requires matching password confirmation when signing up', () => {
  const result = validateSignUpCredentials(
    'player@example.com',
    'eldritch-signal',
    'different-signal',
  )

  assert.equal(result.success, false)
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, 'Passwords do not match.')
  }
})

test('extracts a complete session from an OAuth fragment', () => {
  assert.deepEqual(
    parseOAuthCallback(
      'phantom://auth/callback#access_token=access&refresh_token=refresh&expires_in=3600',
    ),
    {
      ok: true,
      tokens: { accessToken: 'access', refreshToken: 'refresh' },
    },
  )
})

test('returns a safe OAuth error without exposing callback details', () => {
  assert.deepEqual(
    parseOAuthCallback(
      'phantom://auth/callback?error=access_denied&error_description=provider-detail',
    ),
    { ok: false, message: 'Authentication was not completed.' },
  )
})

test('rejects incomplete OAuth session tokens', () => {
  assert.deepEqual(
    parseOAuthCallback('phantom://auth/callback#access_token=access'),
    { ok: false, message: 'Authentication response was incomplete.' },
  )
})
