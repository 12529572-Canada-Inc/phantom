import { supabase } from '../auth/supabase'
import type { LocationCoordinates } from './location-tracking'

export async function persistPlayerLocation(
  coordinates: LocationCoordinates,
): Promise<boolean> {
  if (!supabase) return false

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return false

    const { error } = await supabase.from('player_locations').upsert(
      {
        player_id: session.user.id,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      { onConflict: 'player_id' },
    )

    return !error
  } catch {
    return false
  }
}

export async function clearPlayerLocation(): Promise<boolean> {
  if (!supabase) return false

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return false

    const { error } = await supabase
      .from('player_locations')
      .delete()
      .eq('player_id', session.user.id)

    return !error
  } catch {
    return false
  }
}
