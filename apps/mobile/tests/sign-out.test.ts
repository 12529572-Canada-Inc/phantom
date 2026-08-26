import assert from 'node:assert/strict'
import test from 'node:test'

import { performSignOut, type SignOutStatus } from '../src/auth/sign-out'

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
