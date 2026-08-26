import assert from 'node:assert/strict'
import test from 'node:test'

import { loadMapLocation } from '../src/map/map-location'

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
