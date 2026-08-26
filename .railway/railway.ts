import { defineRailway, github, project, service } from 'railway/iac'

export default defineRailway((ctx) => {
  const api = service('api', {
    source: github('12529572-Canada-Inc/phantom', { branch: 'main' }),
    build: 'pnpm --filter @phantom/api build',
    start: 'pnpm --filter @phantom/api start',
    healthcheck: '/health',
    healthcheckTimeout: 30,
    env: {
      NODE_ENV: 'production',
      SUPABASE_URL: ctx.shared.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: ctx.shared.SUPABASE_SERVICE_ROLE_KEY,
    },
  })

  return project('phantom', { resources: [api] })
})
