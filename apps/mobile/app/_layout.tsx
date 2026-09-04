import { Stack } from 'expo-router'

import { AuthProvider } from '../src/auth/auth-context'
import '../src/location/background-location-task'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#08080d' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  )
}
