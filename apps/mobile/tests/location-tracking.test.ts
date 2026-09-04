import assert from 'node:assert/strict'
import test from 'node:test'

import {
  hasMatchingTrackingConsent,
  isValidCoordinates,
  persistLatestLocation,
  reconcileLocationTracking,
  startLocationTracking,
  stopLocationTracking,
} from '../src/location/location-tracking'

test('matches tracking consent only to the same signed-in player', () => {
  assert.equal(hasMatchingTrackingConsent('player-a', 'player-a'), true)
  assert.equal(hasMatchingTrackingConsent('player-a', 'player-b'), false)
  assert.equal(hasMatchingTrackingConsent(null, 'player-a'), false)
  assert.equal(hasMatchingTrackingConsent('player-a', null), false)
})

test('reports an active task only for the player who consented', async () => {
  const result = await reconcileLocationTracking('player-a', {
    hasStartedUpdates: async () => true,
    readConsentingPlayerId: async () => 'player-a',
    stopUpdates: async () => assert.fail('matching task should remain active'),
    clearStoredLocation: async () => {
      assert.fail('matching active location should remain stored')
    },
    clearConsent: async () =>
      assert.fail('matching consent should remain stored'),
  })

  assert.equal(result, 'active')
})

test('stops a persisted task when a different player signs in', async () => {
  const events: string[] = []

  const result = await reconcileLocationTracking('player-b', {
    hasStartedUpdates: async () => true,
    readConsentingPlayerId: async () => 'player-a',
    stopUpdates: async () => {
      events.push('stop')
    },
    clearStoredLocation: async () => {
      events.push('clear-location')
      return true
    },
    clearConsent: async () => {
      events.push('clear-consent')
    },
  })

  assert.equal(result, 'inactive')
  assert.deepEqual(events, ['clear-consent', 'stop', 'clear-location'])
})

test('clears stale consent when no native task is active', async () => {
  let consentCleared = false

  const result = await reconcileLocationTracking('player-a', {
    hasStartedUpdates: async () => false,
    readConsentingPlayerId: async () => 'player-a',
    stopUpdates: async () => assert.fail('inactive task should not be stopped'),
    clearStoredLocation: async () => true,
    clearConsent: async () => {
      consentCleared = true
    },
  })

  assert.equal(result, 'inactive')
  assert.equal(consentCleared, true)
})

test('reports unavailable when persisted tracking state cannot be reconciled', async () => {
  const result = await reconcileLocationTracking('player-a', {
    hasStartedUpdates: async () => {
      throw new Error('native provider detail')
    },
    readConsentingPlayerId: async () => 'player-a',
    stopUpdates: async () => undefined,
    clearStoredLocation: async () => true,
    clearConsent: async () => undefined,
  })

  assert.equal(result, 'unavailable')
})

test('accepts finite coordinates inside geographic bounds', () => {
  assert.equal(isValidCoordinates({ latitude: -90, longitude: -180 }), true)
  assert.equal(isValidCoordinates({ latitude: 90, longitude: 180 }), true)
})

test('rejects non-finite and out-of-range coordinates', () => {
  assert.equal(
    isValidCoordinates({ latitude: Number.NaN, longitude: 0 }),
    false,
  )
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
    saveConsent: async () => undefined,
    clearConsent: async () => undefined,
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
    saveConsent: async () => undefined,
    clearConsent: async () => undefined,
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
    saveConsent: async () => undefined,
    clearConsent: async () => undefined,
    startUpdates: async () => {
      started = true
    },
  })

  assert.equal(result, 'background-permission-denied')
  assert.equal(started, false)
})

test('records consent before starting updates after permissions are granted', async () => {
  const events: string[] = []

  const result = await startLocationTracking({
    isBackgroundLocationAvailable: async () => true,
    requestForegroundPermission: async () => true,
    requestBackgroundPermission: async () => true,
    saveConsent: async () => {
      events.push('consent')
    },
    clearConsent: async () => {
      events.push('clear-consent')
    },
    startUpdates: async () => {
      events.push('start')
    },
  })

  assert.equal(result, 'active')
  assert.deepEqual(events, ['consent', 'start'])
})

test('clears recorded consent when the native tracking start fails', async () => {
  let consentCleared = false

  const result = await startLocationTracking({
    isBackgroundLocationAvailable: async () => true,
    requestForegroundPermission: async () => true,
    requestBackgroundPermission: async () => true,
    saveConsent: async () => undefined,
    clearConsent: async () => {
      consentCleared = true
    },
    startUpdates: async () => {
      throw new Error('native provider detail')
    },
  })

  assert.equal(result, 'unavailable')
  assert.equal(consentCleared, true)
})

test('revokes consent before stopping updates and clearing storage', async () => {
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
    clearConsent: async () => {
      events.push('clear-consent')
    },
  })

  assert.equal(result, 'inactive')
  assert.deepEqual(events, ['clear-consent', 'stop', 'clear'])
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
    clearConsent: async () => undefined,
  })

  assert.equal(result, 'inactive')
  assert.equal(cleared, true)
})

test('still attempts storage cleanup after a native stop failure', async () => {
  let cleared = false
  let consentCleared = false

  const result = await stopLocationTracking({
    hasStartedUpdates: async () => true,
    stopUpdates: async () => {
      throw new Error('native provider detail')
    },
    clearStoredLocation: async () => {
      cleared = true
      return true
    },
    clearConsent: async () => {
      consentCleared = true
    },
  })

  assert.equal(result, 'unavailable')
  assert.equal(cleared, true)
  assert.equal(consentCleared, true)
})
