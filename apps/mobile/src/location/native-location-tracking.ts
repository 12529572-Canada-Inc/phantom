import * as Location from 'expo-location'

import {
  startLocationTracking,
  stopLocationTracking,
} from './location-tracking'
import {
  PLAYER_LOCATION_TASK,
  playerLocationTaskOptions,
} from './location-task-config'
import { clearPlayerLocation } from './player-location-store'

export function isPlayerLocationTrackingActive() {
  return Location.hasStartedLocationUpdatesAsync(PLAYER_LOCATION_TASK)
}

export function startPlayerLocationTracking() {
  return startLocationTracking({
    isBackgroundLocationAvailable:
      Location.isBackgroundLocationAvailableAsync,
    requestForegroundPermission: async () => {
      const permission = await Location.requestForegroundPermissionsAsync()
      return permission.granted
    },
    requestBackgroundPermission: async () => {
      const permission = await Location.requestBackgroundPermissionsAsync()
      return permission.granted
    },
    startUpdates: () =>
      Location.startLocationUpdatesAsync(
        PLAYER_LOCATION_TASK,
        playerLocationTaskOptions,
      ),
  })
}

export function stopPlayerLocationTracking() {
  return stopLocationTracking({
    clearStoredLocation: clearPlayerLocation,
    hasStartedUpdates: isPlayerLocationTrackingActive,
    stopUpdates: () =>
      Location.stopLocationUpdatesAsync(PLAYER_LOCATION_TASK),
  })
}
