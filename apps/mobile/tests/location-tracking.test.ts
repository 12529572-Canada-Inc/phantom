import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isValidCoordinates,
  persistLatestLocation,
  startLocationTracking,
  stopLocationTracking,
} from '../src/location/location-tracking'

test('accepts finite coordinates inside geographic bounds', () => {
  assert.equal(isValidCoordinates({ latitude: -90, longitude: -180 }), true)
  assert.equal(isValidCoordinates({ latitude: 90, longitude: 180 }), true)
})

test('rejects non-finite and out-of-range coordinates', () => {
  assert.equal(isValidCoordinates({ latitude: Number.NaN, longitude: 0 }), false)
  assert.equal(isValidCoordinates({ latitude: 91, longitude: 0 }), false)
  assert.equal(isValidCoordinates({ latitude: 0, longitude: -181 }), false)
})

test('persists only the newest delivered location', async () => {
  const persisted: Array<{ latitude: number; longitude: number }> = []

  const didPersist = await persistLatestLocation(
    [
      { coords: { latitude: 43.64, longitude: -79.39 } },
      { coords: { latitude: 43.65, longitude: -79.38 } },
    ],
    async (coordinates) => {
      persisted.push(coordinates)
      return true
    },
  )

  assert.equal(didPersist, true)
  assert.deepEqual(persisted, [{ latitude: 43.65, longitude: -79.38 }])
})

test('does not persist an empty or invalid delivery', async () => {
  let persistCount = 0
  const persist = async () => {
    persistCount += 1
    return true
  }

  assert.equal(await persistLatestLocation([], persist), false)
  assert.equal(
    await persistLatestLocation(
      [{ coords: { latitude: 43.65, longitude: 181 } }],
      persist,
    ),
    false,
  )
  assert.equal(persistCount, 0)
})

test('reports unavailable without requesting permission on unsupported devices', async () => {
  let permissionRequestCount = 0

  const result = await startLocationTracking({
    isBackgroundLocationAvailable: async () => false,
    requestForegroundPermission: async () => {
      permissionRequestCount += 1
      return true
    },
    requestBackgroundPermission: async () => true,
    startUpdates: async () => undefined,
  })

  assert.equal(result, 'unavailable')
  assert.equal(permissionRequestCount, 0)
})

test('stops when foreground location permission is denied', async () => {
  let backgroundPermissionRequested = false

  const result = await startLocationTracking({
    isBackgroundLocationAvailable: async () => true,
    requestForegroundPermission: async () => false,
    requestBackgroundPermission: async () => {
      backgroundPermissionRequested = true
      return true
    },
    startUpdates: async () => undefined,
  })

  assert.equal(result, 'foreground-permission-denied')
  assert.equal(backgroundPermissionRequested, false)
})

test('does not start updates when background permission is denied', async () => {
  let started = false

  const result = await startLocationTracking({
    isBackgroundLocationAvailable: async () => true,
    requestForegroundPermission: async () => true,
    requestBackgroundPermission: async () => false,
    startUpdates: async () => {
      started = true
    },
  })

  assert.equal(result, 'background-permission-denied')
  assert.equal(started, false)
})

test('starts updates after both permissions are granted', async () => {
  let started = false

  const result = await startLocationTracking({
    isBackgroundLocationAvailable: async () => true,
    requestForegroundPermission: async () => true,
    requestBackgroundPermission: async () => true,
    startUpdates: async () => {
      started = true
    },
  })

  assert.equal(result, 'active')
  assert.equal(started, true)
})

test('reports unavailable when the native tracking start fails', async () => {
  const result = await startLocationTracking({
    isBackgroundLocationAvailable: async () => true,
    requestForegroundPermission: async () => true,
    requestBackgroundPermission: async () => true,
    startUpdates: async () => {
      throw new Error('native provider detail')
    },
  })

  assert.equal(result, 'unavailable')
})

test('stops native updates before clearing the stored location', async () => {
  const events: string[] = []

  const result = await stopLocationTracking({
    hasStartedUpdates: async () => true,
    stopUpdates: async () => {
      events.push('stop')
    },
    clearStoredLocation: async () => {
      events.push('clear')
      return true
    },
  })

  assert.equal(result, 'inactive')
  assert.deepEqual(events, ['stop', 'clear'])
})

test('clears stale storage even when native updates are already stopped', async () => {
  let cleared = false

  const result = await stopLocationTracking({
    hasStartedUpdates: async () => false,
    stopUpdates: async () => assert.fail('should not stop an inactive task'),
    clearStoredLocation: async () => {
      cleared = true
      return true
    },
  })

  assert.equal(result, 'inactive')
  assert.equal(cleared, true)
})

test('still attempts storage cleanup after a native stop failure', async () => {
  let cleared = false

  const result = await stopLocationTracking({
    hasStartedUpdates: async () => true,
    stopUpdates: async () => {
      throw new Error('native provider detail')
    },
    clearStoredLocation: async () => {
      cleared = true
      return true
    },
  })

  assert.equal(result, 'unavailable')
  assert.equal(cleared, true)
})
