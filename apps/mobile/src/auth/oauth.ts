import type { SupabaseClient } from '@supabase/supabase-js'

export const authCallbackUrl = 'phantom://auth/callback'

type OAuthCallbackResult =
  | {
      ok: true
      tokens: { accessToken: string; refreshToken: string }
    }
  | { ok: false; message: string }

function combinedParams(url: URL) {
  const params = new URLSearchParams(url.search)
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''))

  fragment.forEach((value, key) => params.set(key, value))
  return params
}

export function parseOAuthCallback(url: string): OAuthCallbackResult {
  let params: URLSearchParams

  try {
    params = combinedParams(new URL(url))
  } catch {
    return { ok: false, message: 'Authentication response was invalid.' }
  }

  if (params.has('error') || params.has('error_code')) {
    return { ok: false, message: 'Authentication was not completed.' }
  }

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken || !refreshToken) {
    return { ok: false, message: 'Authentication response was incomplete.' }
  }

  return { ok: true, tokens: { accessToken, refreshToken } }
}

export async function completeSessionFromUrl(
  supabase: SupabaseClient,
  url: string,
) {
  const callback = parseOAuthCallback(url)
  if (!callback.ok) return callback

  const { error } = await supabase.auth.setSession({
    access_token: callback.tokens.accessToken,
    refresh_token: callback.tokens.refreshToken,
  })

  return error
    ? { ok: false as const, message: 'Unable to establish a secure session.' }
    : callback
}

export async function signInWithGoogle(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authCallbackUrl,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    return { ok: false as const, message: 'Unable to start Google sign-in.' }
  }

  const WebBrowser = await import('expo-web-browser')
  const result = await WebBrowser.openAuthSessionAsync(data.url, authCallbackUrl)

  if (result.type !== 'success') {
    return { ok: false as const, cancelled: true }
  }

  return completeSessionFromUrl(supabase, result.url)
}
