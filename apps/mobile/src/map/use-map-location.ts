import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'

import { loadMapLocation, type MapLocationState } from './map-location'

export type MapScreenLocationState =
  | { status: 'loading' }
  | MapLocationState

export function useMapLocation() {
  const requestId = useRef(0)
  const [state, setState] = useState<MapScreenLocationState>({
    status: 'loading',
  })

  const requestLocation = useCallback(async () => {
    const currentRequestId = ++requestId.current
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

    if (requestId.current === currentRequestId) setState(nextState)
  }, [])

  useEffect(() => {
    void requestLocation()

    return () => {
      requestId.current += 1
    }
  }, [requestLocation])

  return { requestLocation, state }
}
