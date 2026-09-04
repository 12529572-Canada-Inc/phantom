import * as SecureStore from 'expo-secure-store'

const PLAYER_LOCATION_CONSENT_KEY = 'phantom.player-location-consent'

export function readPlayerLocationConsent() {
  return SecureStore.getItemAsync(PLAYER_LOCATION_CONSENT_KEY)
}

export function savePlayerLocationConsent(playerId: string) {
  return SecureStore.setItemAsync(PLAYER_LOCATION_CONSENT_KEY, playerId)
}

export function clearPlayerLocationConsent() {
  return SecureStore.deleteItemAsync(PLAYER_LOCATION_CONSENT_KEY)
}
