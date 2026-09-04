import { type PropsWithChildren, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../../src/auth/auth-context'
import { performSignOut, type SignOutStatus } from '../../src/auth/sign-out'

type MapHudProps = PropsWithChildren<{
  signalLocked: boolean
}>

export function MapHud({ children, signalLocked }: MapHudProps) {
  const { signOut } = useAuth()
  const [signOutStatus, setSignOutStatus] = useState<SignOutStatus>('idle')
  const isSigningOut = signOutStatus === 'pending'

  async function handleSignOut() {
    await performSignOut(signOut, setSignOutStatus)
  }

  return (
    <>
      <View pointerEvents="box-none" style={styles.hud}>
        <View style={styles.leftColumn}>
          <View pointerEvents="none" style={styles.signalPanel}>
            <Text style={styles.eyebrow}>PHANTOM // MAP</Text>
            <Text accessibilityRole="header" style={styles.signalText}>
              {signalLocked ? 'SIGNAL LOCKED' : 'SEARCHING THE VEIL'}
            </Text>
          </View>
          {children}
        </View>

        <Pressable
          accessibilityLabel="Sign out"
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
            {isSigningOut ? 'EXITING…' : 'EXIT'}
          </Text>
        </Pressable>
      </View>

      {signOutStatus === 'failed' ? (
        <Text accessibilityRole="alert" style={styles.signOutError}>
          Sign out failed. Try again.
        </Text>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  eyebrow: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  hud: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  leftColumn: { gap: 8 },
  pressedButton: { opacity: 0.72 },
  signalPanel: {
    backgroundColor: 'rgba(17, 17, 27, 0.94)',
    borderColor: '#342b43',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signalText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 3,
  },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(17, 17, 27, 0.94)',
    borderColor: '#3f3f46',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 62,
    paddingHorizontal: 12,
  },
  signOutError: {
    backgroundColor: '#3f1725',
    borderRadius: 6,
    bottom: 76,
    color: '#fecdd3',
    fontSize: 13,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 16,
  },
  signOutText: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
})
