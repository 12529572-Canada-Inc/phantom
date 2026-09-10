import * as Location from 'expo-location'

export const PLAYER_LOCATION_TASK = 'phantom-player-location'

export const playerLocationTaskOptions: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  activityType: Location.ActivityType.OtherNavigation,
  deferredUpdatesDistance: 0,
  deferredUpdatesInterval: 5_000,
  distanceInterval: 0,
  foregroundService: {
    notificationBody: 'Your latest position is being synced securely.',
    notificationColor: '#17111f',
    notificationTitle: 'Phantom location tracking is active',
  },
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  timeInterval: 5_000,
}
