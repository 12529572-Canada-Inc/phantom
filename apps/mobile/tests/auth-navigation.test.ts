import assert from 'node:assert/strict'
import test from 'node:test'

import { getAuthDestination } from '../src/auth/navigation'

test('waits for session restoration before choosing a route', () => {
  assert.equal(
    getAuthDestination({ isAuthenticated: false, isLoading: true }),
    null,
  )
})

test('routes signed-out players to sign in', () => {
  assert.equal(
    getAuthDestination({ isAuthenticated: false, isLoading: false }),
    '/sign-in',
  )
})

test('routes signed-in players to the game tabs', () => {
  assert.equal(
    getAuthDestination({ isAuthenticated: true, isLoading: false }),
    '/(tabs)',
  )
})
