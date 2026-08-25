import { View, Text, StyleSheet } from 'react-native'

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phantom</Text>
      <Text style={styles.subtitle}>The signal is near...</Text>
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
  title: { fontSize: 32, fontWeight: 'bold', color: '#c084fc' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 8 },
})
