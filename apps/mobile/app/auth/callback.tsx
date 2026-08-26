import { Link, Redirect } from 'expo-router'
import { useURL } from 'expo-linking'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../../src/auth/auth-context'
import { completeSessionFromUrl } from '../../src/auth/oauth'
import { supabase } from '../../src/auth/supabase'

export default function AuthCallbackScreen() {
  const url = useURL()
  const { configurationError, session } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url || session) return
    if (!supabase) {
      setError(configurationError ?? 'Authentication is not configured.')
      return
    }

    let isMounted = true
    void completeSessionFromUrl(supabase, url).then((result) => {
      if (isMounted && !result.ok) setError(result.message)
    })

    return () => {
      isMounted = false
    }
  }, [configurationError, session, url])

  if (session) return <Redirect href="/(tabs)" />

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            The signal was interrupted
          </Text>
          <Text accessibilityRole="alert" style={styles.message}>
            {error}
          </Text>
          <Link href="/sign-in" style={styles.link}>
            Return to sign in
          </Link>
        </>
      ) : (
        <>
          <ActivityIndicator color="#c4b5fd" size="large" />
          <Text accessibilityRole="header" style={styles.title}>
            Securing your session…
          </Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#08080d',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  link: { color: '#c4b5fd', fontSize: 16, fontWeight: '700', marginTop: 8 },
  message: {
    color: '#fda4af',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  title: {
    color: '#fafafa',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
})
