import assert from 'node:assert/strict'
import test from 'node:test'

import {
  loadMapLocation,
  observeMapLocation,
  type MapCoordinates,
  type MapLocationState,
} from '../src/map/map-location'

test('publishes valid foreground location updates to the map', async () => {
  let publishCoordinates: ((coordinates: MapCoordinates) => void) | null = null
  const states: MapLocationState[] = []
  const subscription = { remove: () => undefined }

  const result = await observeMapLocation(
    {
      watchCoordinates: async (onCoordinates) => {
        publishCoordinates = onCoordinates
        return subscription
      },
    },
    (state) => states.push(state),
  )

  assert.equal(result, subscription)
  assert.ok(publishCoordinates)
  publishCoordinates({ latitude: 43.6533, longitude: -79.3833 })
  assert.deepEqual(states, [
    {
      status: 'ready',
      coordinates: { latitude: 43.6533, longitude: -79.3833 },
    },
  ])
})

test('keeps the last map position when a foreground update is invalid', async () => {
  let publishCoordinates: ((coordinates: MapCoordinates) => void) | null = null
  const states: MapLocationState[] = []

  await observeMapLocation(
    {
      watchCoordinates: async (onCoordinates) => {
        publishCoordinates = onCoordinates
        return { remove: () => undefined }
      },
    },
    (state) => states.push(state),
  )

  assert.ok(publishCoordinates)
  publishCoordinates({ latitude: 91, longitude: -79.3833 })
  assert.deepEqual(states, [])
})

test('reports unavailable when the foreground watcher cannot start', async () => {
  const states: MapLocationState[] = []

  const result = await observeMapLocation(
    {
      watchCoordinates: async () => {
        throw new Error('native provider detail')
      },
    },
    (state) => states.push(state),
  )

  assert.equal(result, null)
  assert.deepEqual(states, [{ status: 'unavailable' }])
})

test('returns coordinates after foreground location access is granted', async () => {
  const result = await loadMapLocation({
    requestForegroundPermission: async () => true,
    hasLocationServices: async () => true,
    getCurrentCoordinates: async () => ({
      latitude: 43.6532,
      longitude: -79.3832,
    }),
  })

  assert.deepEqual(result, {
    status: 'ready',
    coordinates: { latitude: 43.6532, longitude: -79.3832 },
  })
})

test('reports denied foreground location access', async () => {
  const result = await loadMapLocation({
    requestForegroundPermission: async () => false,
    hasLocationServices: async () => true,
    getCurrentCoordinates: async () => ({ latitude: 0, longitude: 0 }),
  })

  assert.deepEqual(result, { status: 'permission-denied' })
})

test('reports disabled device location services', async () => {
  const result = await loadMapLocation({
    requestForegroundPermission: async () => true,
    hasLocationServices: async () => false,
    getCurrentCoordinates: async () => ({ latitude: 0, longitude: 0 }),
  })

  assert.deepEqual(result, { status: 'services-disabled' })
})

test('returns a safe unavailable state when location lookup fails', async () => {
  const result = await loadMapLocation({
    requestForegroundPermission: async () => true,
    hasLocationServices: async () => true,
    getCurrentCoordinates: async () => {
      throw new Error('native provider detail')
    },
  })

  assert.deepEqual(result, { status: 'unavailable' })
})
