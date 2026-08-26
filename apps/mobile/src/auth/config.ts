import { z } from 'zod'

type Environment = Record<string, string | undefined>

type SupabaseConfigResult =
  | {
      ok: true
      value: { publishableKey: string; url: string }
    }
  | { ok: false; message: string }

function isPrivateDevelopmentHost(hostname: string) {
  if (hostname === 'localhost' || hostname.startsWith('127.')) return true
  if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) return true

  const [first, second] = hostname.split('.').map(Number)
  return first === 172 && second !== undefined && second >= 16 && second <= 31
}

const supabaseUrlSchema = z.string().url().superRefine((value, context) => {
  const url = new URL(value)
  const isSecure = url.protocol === 'https:'
  const isLocalHttp = url.protocol === 'http:' && isPrivateDevelopmentHost(url.hostname)

  if (!isSecure && !isLocalHttp) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Supabase URL must use HTTPS outside local development.',
    })
  }
})

export function readSupabaseConfig(environment: Environment): SupabaseConfigResult {
  const result = z
    .object({
      publishableKey: z.string().trim().min(1),
      url: supabaseUrlSchema,
    })
    .safeParse({
      publishableKey:
        environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        environment.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      url: environment.EXPO_PUBLIC_SUPABASE_URL,
    })

  if (!result.success) {
    return {
      ok: false,
      message: 'Supabase public configuration is missing or invalid.',
    }
  }

  return { ok: true, value: result.data }
}
