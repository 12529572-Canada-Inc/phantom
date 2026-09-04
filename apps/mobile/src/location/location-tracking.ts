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
  saveConsent: () => Promise<void>
  clearConsent: () => Promise<void>
  startUpdates: () => Promise<void>
}

type StopLocationTrackingGateway = {
  hasStartedUpdates: () => Promise<boolean>
  stopUpdates: () => Promise<void>
  clearStoredLocation: () => Promise<boolean>
  clearConsent: () => Promise<void>
}

type ReconcileLocationTrackingGateway = {
  hasStartedUpdates: () => Promise<boolean>
  readConsentingPlayerId: () => Promise<string | null>
  stopUpdates: () => Promise<void>
  clearStoredLocation: () => Promise<boolean>
  clearConsent: () => Promise<void>
}

export type LocationTrackingStartResult =
  | 'active'
  | 'foreground-permission-denied'
  | 'background-permission-denied'
  | 'unavailable'

export type LocationTrackingStopResult = 'inactive' | 'unavailable'

export function hasMatchingTrackingConsent(
  consentingPlayerId: string | null,
  currentPlayerId: string | null,
) {
  return consentingPlayerId !== null && consentingPlayerId === currentPlayerId
}

export async function reconcileLocationTracking(
  currentPlayerId: string,
  gateway: ReconcileLocationTrackingGateway,
): Promise<'active' | 'inactive' | 'unavailable'> {
  let hasStartedUpdates: boolean
  let consentingPlayerId: string | null

  try {
    const persistedState = await Promise.all([
      gateway.hasStartedUpdates(),
      gateway.readConsentingPlayerId(),
    ])
    hasStartedUpdates = persistedState[0]
    consentingPlayerId = persistedState[1]
  } catch {
    return 'unavailable'
  }

  if (
    hasStartedUpdates &&
    hasMatchingTrackingConsent(consentingPlayerId, currentPlayerId)
  ) {
    return 'active'
  }

  let reconciled = true
  if (consentingPlayerId !== null) {
    try {
      await gateway.clearConsent()
    } catch {
      reconciled = false
    }
  }

  if (hasStartedUpdates) {
    try {
      await gateway.stopUpdates()
    } catch {
      reconciled = false
    }
  }

  try {
    if (!(await gateway.clearStoredLocation())) reconciled = false
  } catch {
    reconciled = false
  }

  return reconciled ? 'inactive' : 'unavailable'
}

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
  let consentSaved = false

  try {
    if (!(await gateway.isBackgroundLocationAvailable())) return 'unavailable'
    if (!(await gateway.requestForegroundPermission())) {
      return 'foreground-permission-denied'
    }
    if (!(await gateway.requestBackgroundPermission())) {
      return 'background-permission-denied'
    }

    await gateway.saveConsent()
    consentSaved = true
    await gateway.startUpdates()
    return 'active'
  } catch {
    if (consentSaved) {
      try {
        await gateway.clearConsent()
      } catch {
        // The unavailable result covers both native and consent cleanup errors.
      }
    }
    return 'unavailable'
  }
}

export async function stopLocationTracking(
  gateway: StopLocationTrackingGateway,
): Promise<LocationTrackingStopResult> {
  let didStopUpdates = true
  let didClearLocation = false
  let didClearConsent = true

  try {
    await gateway.clearConsent()
  } catch {
    didClearConsent = false
  }

  try {
    if (await gateway.hasStartedUpdates()) await gateway.stopUpdates()
  } catch {
    didStopUpdates = false
  }

  try {
    didClearLocation = await gateway.clearStoredLocation()
  } catch {
    didClearLocation = false
  }

  return didStopUpdates && didClearLocation && didClearConsent
    ? 'inactive'
    : 'unavailable'
}
