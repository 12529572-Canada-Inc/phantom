import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export function AuthLoadingScreen() {
  return (
    <View
      accessibilityLabel="Restoring your session"
      accessibilityRole="progressbar"
      style={styles.container}
    >
      <ActivityIndicator color="#c4b5fd" size="large" />
      <Text style={styles.message}>Listening for your signal…</Text>
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
  message: {
    color: '#a1a1aa',
    fontSize: 15,
  },
})
