export const localProjectId = 'phantom'

export const localSupabasePorts = Object.freeze({
  shadowDatabase: 55320,
  api: 55321,
  database: 55322,
  studio: 55323,
  mailpit: 55324,
  smtp: 55325,
  pop3: 55326,
  analytics: 55327,
  pooler: 55329,
})

export const localSupabaseEndpoints = Object.freeze({
  api: `http://127.0.0.1:${localSupabasePorts.api}`,
  studio: `http://127.0.0.1:${localSupabasePorts.studio}`,
  database: `127.0.0.1:${localSupabasePorts.database}`,
})

export const localDatabaseTarget = `local Supabase project "${localProjectId}" at ${localSupabaseEndpoints.database}`
export const localStackTarget = `local Docker Compose project "${localProjectId}" and local Supabase project "${localProjectId}"`
