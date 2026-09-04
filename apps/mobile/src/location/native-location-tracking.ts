import * as Location from 'expo-location'

import {
  clearPlayerLocationConsent,
  readPlayerLocationConsent,
  savePlayerLocationConsent,
} from './location-consent'
import {
  reconcileLocationTracking,
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

export function reconcilePlayerLocationTracking(playerId: string) {
  return reconcileLocationTracking(playerId, {
    clearConsent: clearPlayerLocationConsent,
    clearStoredLocation: clearPlayerLocation,
    hasStartedUpdates: isPlayerLocationTrackingActive,
    readConsentingPlayerId: readPlayerLocationConsent,
    stopUpdates: () => Location.stopLocationUpdatesAsync(PLAYER_LOCATION_TASK),
  })
}

export function startPlayerLocationTracking(playerId: string) {
  return startLocationTracking({
    isBackgroundLocationAvailable: Location.isBackgroundLocationAvailableAsync,
    requestForegroundPermission: async () => {
      const permission = await Location.requestForegroundPermissionsAsync()
      return permission.granted
    },
    // Expo requires foreground permission before background permission.
    // Source: https://docs.expo.dev/versions/latest/sdk/location/#locationrequestbackgroundpermissionsasync
    requestBackgroundPermission: async () => {
      const permission = await Location.requestBackgroundPermissionsAsync()
      return permission.granted
    },
    saveConsent: () => savePlayerLocationConsent(playerId),
    clearConsent: clearPlayerLocationConsent,
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
    clearConsent: clearPlayerLocationConsent,
    hasStartedUpdates: isPlayerLocationTrackingActive,
    stopUpdates: () => Location.stopLocationUpdatesAsync(PLAYER_LOCATION_TASK),
  })
}
