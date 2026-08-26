import { useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, type Region } from 'react-native-maps'

import { MapHud } from '../../components/map/MapHud'
import { MapStatusView } from '../../components/map/MapStatusView'
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
  const { requestLocation, state: locationState } = useMapLocation()

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

      <MapHud signalLocked={locationState.status === 'ready'} />

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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#08080d',
    flex: 1,
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
})
