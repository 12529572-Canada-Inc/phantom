export interface Zone {
  id: string
  name: string
  lat: number
  lng: number
  radius: number // meters
  capturedBy: string | null // team id
  capturedAt: string | null
  createdAt: string
}

export interface Player {
  id: string
  username: string
  teamId: string | null
  lat: number | null
  lng: number | null
  lastSeenAt: string
  score: number
}

export interface Team {
  id: string
  name: string
  color: string
  score: number
  createdAt: string
}

export type CaptureEvent = {
  zoneId: string
  playerId: string
  teamId: string
  timestamp: string
}
