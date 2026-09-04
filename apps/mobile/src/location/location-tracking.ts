export type LocationCoordinates = {
  latitude: number
  longitude: number
}

export type LocationSample = {
  coords: LocationCoordinates
}

type StartLocationTrackingGateway = {
  isBackgroundLocationAvailable: () => Promise<boolean>
  requestForegroundPermission: () => Promise<boolean>
  requestBackgroundPermission: () => Promise<boolean>
  startUpdates: () => Promise<void>
}

type StopLocationTrackingGateway = {
  hasStartedUpdates: () => Promise<boolean>
  stopUpdates: () => Promise<void>
  clearStoredLocation: () => Promise<boolean>
}

export type LocationTrackingStartResult =
  | 'active'
  | 'foreground-permission-denied'
  | 'background-permission-denied'
  | 'unavailable'

export type LocationTrackingStopResult = 'inactive' | 'unavailable'

export function isValidCoordinates(coordinates: LocationCoordinates) {
  return (
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  )
}

export async function persistLatestLocation(
  locations: readonly LocationSample[],
  persist: (coordinates: LocationCoordinates) => Promise<boolean>,
) {
  const latestLocation = locations.at(-1)
  if (!latestLocation || !isValidCoordinates(latestLocation.coords)) {
    return false
  }

  try {
    return await persist(latestLocation.coords)
  } catch {
    return false
  }
}

export async function startLocationTracking(
  gateway: StartLocationTrackingGateway,
): Promise<LocationTrackingStartResult> {
  try {
    if (!(await gateway.isBackgroundLocationAvailable())) return 'unavailable'
    if (!(await gateway.requestForegroundPermission())) {
      return 'foreground-permission-denied'
    }
    if (!(await gateway.requestBackgroundPermission())) {
      return 'background-permission-denied'
    }

    await gateway.startUpdates()
    return 'active'
  } catch {
    return 'unavailable'
  }
}

export async function stopLocationTracking(
  gateway: StopLocationTrackingGateway,
): Promise<LocationTrackingStopResult> {
  let didStopUpdates = true

  try {
    if (await gateway.hasStartedUpdates()) await gateway.stopUpdates()
  } catch {
    didStopUpdates = false
  }

  try {
    const didClearLocation = await gateway.clearStoredLocation()
    return didStopUpdates && didClearLocation ? 'inactive' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}
