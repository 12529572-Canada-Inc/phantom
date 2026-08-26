import { useState } from 'react'
import { Pressable, View, Text, StyleSheet } from 'react-native'

import { useAuth } from '../../src/auth/auth-context'

export default function MapScreen() {
  const { signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    setSignOutError(false)
    const succeeded = await signOut()
    setSignOutError(!succeeded)
    setIsSigningOut(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phantom</Text>
      <Text style={styles.subtitle}>The signal is near...</Text>
      {signOutError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Sign out failed. Try again.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
        disabled={isSigningOut}
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.pressedButton,
        ]}
      >
        <Text style={styles.signOutText}>
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0f',
  },
  error: { color: '#fda4af', marginTop: 16 },
  pressedButton: { opacity: 0.8 },
  signOutButton: {
    borderColor: '#52525b',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  signOutText: { color: '#e4e4e7', fontSize: 15, fontWeight: '700' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#c084fc' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 8 },
})
