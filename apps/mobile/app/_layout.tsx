import { Stack } from 'expo-router'

import { AuthProvider } from '../src/auth/auth-context'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#08080d' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  )
}
