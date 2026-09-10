import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { PlayerLocationTrackingStatus } from '../../src/location/use-player-location-tracking'

type LocationTrackingControlProps = {
  onDisable: () => void
  onEnable: () => void
  onOpenSettings: () => void
  status: PlayerLocationTrackingStatus
}

const statusContent: Record<
  PlayerLocationTrackingStatus,
  { action: string; message: string }
> = {
  checking: {
    action: 'CHECKING…',
    message: 'Checking your private tracking state.',
  },
  inactive: {
    action: 'ENABLE',
    message:
      'Opt in to sync only your latest position, including in the background.',
  },
  starting: {
    action: 'REQUESTING…',
    message: 'Waiting for foreground and background location permission.',
  },
  active: {
    action: 'STOP',
    message: 'Active · only your latest position is stored.',
  },
  stopping: {
    action: 'STOPPING…',
    message: 'Stopping updates and clearing your stored position.',
  },
  'foreground-permission-denied': {
    action: 'OPEN SETTINGS',
    message:
      'Foreground location access is required. Enable it in device settings.',
  },
  'background-permission-denied': {
    action: 'OPEN SETTINGS',
    message:
      'Background access was not granted. Choose Always in device settings.',
  },
  unavailable: {
    action: 'TRY AGAIN',
    message: 'Tracking is unavailable. No new position is being stored.',
  },
}

export function LocationTrackingControl({
  onDisable,
  onEnable,
  onOpenSettings,
  status,
}: LocationTrackingControlProps) {
  const isBusy =
    status === 'checking' || status === 'starting' || status === 'stopping'
  const isActive = status === 'active'
  const isPermissionDenied =
    status === 'foreground-permission-denied' ||
    status === 'background-permission-denied'
  const content = statusContent[status]

  const onPress = isActive
    ? onDisable
    : isPermissionDenied
      ? onOpenSettings
      : onEnable

  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>BACKGROUND SIGNAL</Text>
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {content.message}
      </Text>
      <Pressable
        accessibilityLabel={
          isActive
            ? 'Stop background location tracking'
            : isPermissionDenied
              ? 'Open device settings for location permission'
              : 'Enable background location tracking'
        }
        accessibilityRole="button"
        accessibilityState={{ busy: isBusy, disabled: isBusy }}
        disabled={isBusy}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          isActive && styles.stopButton,
          pressed && styles.pressedButton,
          isBusy && styles.disabledButton,
        ]}
      >
        <Text style={[styles.buttonText, isActive && styles.stopButtonText]}>
          {content.action}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#c4b5fd',
    borderRadius: 6,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  buttonText: {
    color: '#17111f',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  disabledButton: { opacity: 0.62 },
  eyebrow: {
    color: '#a78bfa',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  message: {
    color: '#d4d4d8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  panel: {
    backgroundColor: 'rgba(17, 17, 27, 0.96)',
    borderColor: '#342b43',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    width: 216,
  },
  pressedButton: { opacity: 0.75 },
  stopButton: {
    backgroundColor: '#2b202b',
    borderColor: '#fda4af',
    borderWidth: 1,
  },
  stopButtonText: { color: '#fecdd3' },
})
