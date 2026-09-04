import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

import { persistLatestLocation } from './location-tracking'
import { persistPlayerLocation } from './player-location-store'
import { PLAYER_LOCATION_TASK } from './location-task-config'

type BackgroundLocationTaskData = {
  locations: Location.LocationObject[]
}

if (!TaskManager.isTaskDefined(PLAYER_LOCATION_TASK)) {
  TaskManager.defineTask<BackgroundLocationTaskData>(
    PLAYER_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations) return
      await persistLatestLocation(data.locations, persistPlayerLocation)
    },
  )
}
