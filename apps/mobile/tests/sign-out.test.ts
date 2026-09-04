import assert from 'node:assert/strict'
import test from 'node:test'

import {
  performSignOut,
  signOutWithLocationCleanup,
  type SignOutStatus,
} from '../src/auth/sign-out'

test('cleans up location tracking before clearing the auth session', async () => {
  const events: string[] = []

  const succeeded = await signOutWithLocationCleanup(
    async () => {
      events.push('location-cleanup')
    },
    async () => {
      events.push('auth-sign-out')
      return true
    },
  )

  assert.equal(succeeded, true)
  assert.deepEqual(events, ['location-cleanup', 'auth-sign-out'])
})

test('still clears the auth session when location cleanup fails', async () => {
  let didSignOut = false

  const succeeded = await signOutWithLocationCleanup(
    async () => {
      throw new Error('location cleanup detail')
    },
    async () => {
      didSignOut = true
      return true
    },
  )

  assert.equal(succeeded, true)
  assert.equal(didSignOut, true)
})

test('does not update UI state after a successful sign-out resolves', async () => {
  const statuses: SignOutStatus[] = []

  await performSignOut(
    async () => true,
    (status) => statuses.push(status),
  )

  assert.deepEqual(statuses, ['pending'])
})

test('restores the retry state after a failed sign-out', async () => {
  const statuses: SignOutStatus[] = []

  await performSignOut(
    async () => false,
    (status) => statuses.push(status),
  )

  assert.deepEqual(statuses, ['pending', 'failed'])
})
