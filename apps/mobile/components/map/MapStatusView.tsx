import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

type MapStatus =
  'loading' | 'permission-denied' | 'services-disabled' | 'unavailable'

type MapStatusViewProps = {
  onRetry: () => void
  status: MapStatus
}

const statusContent: Record<
  Exclude<MapStatus, 'loading'>,
  { eyebrow: string; title: string; message: string }
> = {
  'permission-denied': {
    eyebrow: 'SIGNAL BLOCKED',
    title: 'Location access required',
    message:
      'Enable location access in device settings so Phantom can center the map and reveal your position.',
  },
  'services-disabled': {
    eyebrow: 'SIGNAL SILENT',
    title: 'Location services are off',
    message:
      'Turn on device location services, then try again to establish your position.',
  },
  unavailable: {
    eyebrow: 'SIGNAL LOST',
    title: 'Position unavailable',
    message:
      'Phantom could not establish your location. Move to an open area and try again.',
  },
}

export function MapStatusView({ onRetry, status }: MapStatusViewProps) {
  const isLoading = status === 'loading'

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.orbitLarge} />
      <View pointerEvents="none" style={styles.orbitSmall} />
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole={isLoading ? 'progressbar' : 'alert'}
        style={styles.panel}
      >
        {isLoading ? (
          <>
            <ActivityIndicator color="#c4b5fd" size="large" />
            <Text style={styles.eyebrow}>TRIANGULATING</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Finding your signal
            </Text>
            <Text style={styles.message}>
              Hold position while Phantom listens for your location.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.eyebrow}>{statusContent[status].eyebrow}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {statusContent[status].title}
            </Text>
            <Text style={styles.message}>{statusContent[status].message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#08080d',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 24,
  },
  eyebrow: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginTop: 20,
  },
  message: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  orbitLarge: {
    borderColor: '#2e2540',
    borderRadius: 210,
    borderWidth: 1,
    height: 420,
    position: 'absolute',
    right: -220,
    top: -130,
    width: 420,
  },
  orbitSmall: {
    borderColor: '#252235',
    borderRadius: 120,
    borderWidth: 1,
    bottom: -85,
    height: 240,
    left: -100,
    position: 'absolute',
    width: 240,
  },
  panel: {
    alignItems: 'center',
    maxWidth: 360,
  },
  pressedButton: { opacity: 0.75 },
  retryButton: {
    backgroundColor: '#c4b5fd',
    borderRadius: 8,
    marginTop: 24,
    minWidth: 148,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    color: '#17111f',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    color: '#f4f4f5',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
})
