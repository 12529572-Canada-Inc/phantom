import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AppState } from 'react-native'

import { stopPlayerLocationTracking } from '../location/native-location-tracking'
import { signOutWithLocationCleanup } from './sign-out'
import { supabase, supabaseConfig } from './supabase'

type AuthContextValue = {
  configurationError: string | null
  isLoading: boolean
  session: Session | null
  signOut: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    const client = supabase
    let isMounted = true
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setIsLoading(false)
      }
    })

    void client.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) setSession(data.session)
      })
      .catch(() => {
        if (isMounted) setSession(null)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    if (AppState.currentState === 'active') {
      client.auth.startAutoRefresh()
    }

    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          client.auth.startAutoRefresh()
        } else {
          client.auth.stopAutoRefresh()
        }
      },
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
      appStateSubscription.remove()
      client.auth.stopAutoRefresh()
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return false
    const client = supabase

    return signOutWithLocationCleanup(stopPlayerLocationTracking, async () => {
      try {
        const { error } = await client.auth.signOut()
        return !error
      } catch {
        return false
      }
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      configurationError: supabaseConfig.ok ? null : supabaseConfig.message,
      isLoading,
      session,
      signOut,
    }),
    [isLoading, session, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}
