import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, type Region } from 'react-native-maps'

import { MapStatusView } from '../../components/map/MapStatusView'
import { useAuth } from '../../src/auth/auth-context'
import { performSignOut, type SignOutStatus } from '../../src/auth/sign-out'
import { cosmicMapStyle } from '../../src/map/cosmic-map-style'
import type { MapCoordinates } from '../../src/map/map-location'
import { useMapLocation } from '../../src/map/use-map-location'

const MAP_DELTA = 0.012

function toPlayerRegion(coordinates: MapCoordinates): Region {
  return {
    ...coordinates,
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  }
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null)
  const { signOut } = useAuth()
  const { requestLocation, state: locationState } = useMapLocation()
  const [signOutStatus, setSignOutStatus] = useState<SignOutStatus>('idle')
  const isSigningOut = signOutStatus === 'pending'
  const signOutError = signOutStatus === 'failed'

  async function handleSignOut() {
    await performSignOut(signOut, setSignOutStatus)
  }

  function recenterMap() {
    if (locationState.status !== 'ready') return
    mapRef.current?.animateToRegion(
      toPlayerRegion(locationState.coordinates),
      350,
    )
  }

  return (
    <View style={styles.container}>
      {locationState.status === 'ready' ? (
        <MapView
          ref={mapRef}
          accessibilityLabel="Phantom territory map centered on your location"
          customMapStyle={cosmicMapStyle}
          initialRegion={toPlayerRegion(locationState.coordinates)}
          loadingBackgroundColor="#08080d"
          loadingEnabled
          loadingIndicatorColor="#c4b5fd"
          mapType="standard"
          rotateEnabled={false}
          showsCompass={false}
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          style={styles.map}
          toolbarEnabled={false}
          userInterfaceStyle="dark"
        >
          <Marker
            coordinate={locationState.coordinates}
            description="Your current location signal"
            pinColor="#a78bfa"
            title="Your position"
          />
        </MapView>
      ) : (
        <MapStatusView
          onRetry={() => void requestLocation()}
          status={locationState.status}
        />
      )}

      <View pointerEvents="box-none" style={styles.hud}>
        <View pointerEvents="none" style={styles.signalPanel}>
          <Text style={styles.eyebrow}>PHANTOM // MAP</Text>
          <Text accessibilityRole="header" style={styles.signalText}>
            {locationState.status === 'ready'
              ? 'SIGNAL LOCKED'
              : 'SEARCHING THE VEIL'}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
          disabled={isSigningOut}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text style={styles.signOutText}>
            {isSigningOut ? 'EXITING…' : 'EXIT'}
          </Text>
        </Pressable>
      </View>

      {locationState.status === 'ready' ? (
        <Pressable
          accessibilityLabel="Recenter map on your position"
          accessibilityRole="button"
          onPress={recenterMap}
          style={({ pressed }) => [
            styles.recenterButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text aria-hidden style={styles.recenterGlyph}>
            ◎
          </Text>
          <Text style={styles.recenterText}>LOCATE</Text>
        </Pressable>
      ) : null}

      {signOutError ? (
        <Text accessibilityRole="alert" style={styles.signOutError}>
          Sign out failed. Try again.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#08080d',
    flex: 1,
  },
  eyebrow: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pressedButton: { opacity: 0.72 },
  recenterButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 17, 27, 0.94)',
    borderColor: '#4c3f60',
    borderRadius: 8,
    borderWidth: 1,
    bottom: 20,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    position: 'absolute',
    right: 16,
  },
  recenterGlyph: {
    color: '#c4b5fd',
    fontSize: 21,
    lineHeight: 21,
  },
  recenterText: {
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  signalPanel: {
    backgroundColor: 'rgba(17, 17, 27, 0.94)',
    borderColor: '#342b43',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signalText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 3,
  },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(17, 17, 27, 0.94)',
    borderColor: '#3f3f46',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 62,
    paddingHorizontal: 12,
  },
  signOutError: {
    backgroundColor: '#3f1725',
    borderRadius: 6,
    color: '#fecdd3',
    fontSize: 13,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 16,
    top: 78,
  },
  signOutText: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
})
