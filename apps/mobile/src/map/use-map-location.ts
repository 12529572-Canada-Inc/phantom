import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  loadMapLocation,
  observeMapLocation,
  type MapLocationState,
  type MapLocationSubscription,
} from './map-location'

export type MapScreenLocationState = { status: 'loading' } | MapLocationState

export function useMapLocation() {
  const requestId = useRef(0)
  const locationSubscription = useRef<MapLocationSubscription | null>(null)
  const [state, setState] = useState<MapScreenLocationState>({
    status: 'loading',
  })

  const requestLocation = useCallback(async () => {
    const currentRequestId = ++requestId.current
    locationSubscription.current?.remove()
    locationSubscription.current = null
    setState({ status: 'loading' })

    const nextState = await loadMapLocation({
      requestForegroundPermission: async () => {
        const permission = await Location.requestForegroundPermissionsAsync()
        return permission.granted
      },
      hasLocationServices: Location.hasServicesEnabledAsync,
      getCurrentCoordinates: async () => {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
      },
    })

    if (requestId.current !== currentRequestId) return
    setState(nextState)
    if (nextState.status !== 'ready') return

    const nextSubscription = await observeMapLocation(
      {
        watchCoordinates: (onCoordinates) =>
          Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 0,
              timeInterval: 5_000,
            },
            (location) =>
              onCoordinates({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }),
          ),
      },
      (updatedState) => {
        if (requestId.current === currentRequestId) setState(updatedState)
      },
    )

    if (requestId.current === currentRequestId) {
      locationSubscription.current = nextSubscription
    } else {
      nextSubscription?.remove()
    }
  }, [])

  useEffect(() => {
    void requestLocation()

    return () => {
      requestId.current += 1
      locationSubscription.current?.remove()
      locationSubscription.current = null
    }
  }, [requestLocation])

  return { requestLocation, state }
}
