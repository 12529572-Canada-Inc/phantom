import { isValidCoordinates } from '../location/location-tracking'

export type MapCoordinates = {
  latitude: number
  longitude: number
}

export type MapLocationState =
  | { status: 'permission-denied' }
  | { status: 'services-disabled' }
  | { status: 'unavailable' }
  | { status: 'ready'; coordinates: MapCoordinates }

type MapLocationGateway = {
  requestForegroundPermission: () => Promise<boolean>
  hasLocationServices: () => Promise<boolean>
  getCurrentCoordinates: () => Promise<MapCoordinates>
}

export type MapLocationSubscription = {
  remove: () => void
}

type MapLocationWatchGateway = {
  watchCoordinates: (
    onCoordinates: (coordinates: MapCoordinates) => void,
  ) => Promise<MapLocationSubscription>
}

export async function observeMapLocation(
  gateway: MapLocationWatchGateway,
  onState: (state: MapLocationState) => void,
) {
  try {
    return await gateway.watchCoordinates((coordinates) => {
      if (isValidCoordinates(coordinates)) {
        onState({ status: 'ready', coordinates })
      }
    })
  } catch {
    onState({ status: 'unavailable' })
    return null
  }
}

export async function loadMapLocation(
  gateway: MapLocationGateway,
): Promise<MapLocationState> {
  try {
    const permissionGranted = await gateway.requestForegroundPermission()
    if (!permissionGranted) return { status: 'permission-denied' }

    const servicesEnabled = await gateway.hasLocationServices()
    if (!servicesEnabled) return { status: 'services-disabled' }

    return {
      status: 'ready',
      coordinates: await gateway.getCurrentCoordinates(),
    }
  } catch {
    return { status: 'unavailable' }
  }
}
