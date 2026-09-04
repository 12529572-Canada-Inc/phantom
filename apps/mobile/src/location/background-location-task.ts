import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

import { persistLatestLocation } from './location-tracking'
import { persistPlayerLocation } from './player-location-store'
import { PLAYER_LOCATION_TASK } from './location-task-config'

type BackgroundLocationTaskData = {
  locations: Location.LocationObject[]
}

// Expo loads the JS bundle without mounting React views for background events,
// so the task must be defined at module scope.
// Source: https://docs.expo.dev/versions/latest/sdk/task-manager/#taskmanagerdefinetasktaskname-taskexecutor
if (!TaskManager.isTaskDefined(PLAYER_LOCATION_TASK)) {
  TaskManager.defineTask<BackgroundLocationTaskData>(
    PLAYER_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations) return
      await persistLatestLocation(data.locations, persistPlayerLocation)
    },
  )
}
