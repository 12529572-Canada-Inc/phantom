import { Redirect, Tabs } from 'expo-router'

import { AuthLoadingScreen } from '../../components/auth/AuthLoadingScreen'
import { useAuth } from '../../src/auth/auth-context'

export default function TabsLayout() {
  const { isLoading, session } = useAuth()

  if (isLoading) return <AuthLoadingScreen />
  if (!session) return <Redirect href="/sign-in" />

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0f0f17' },
        headerTintColor: '#f4f4f5',
        tabBarActiveTintColor: '#c4b5fd',
        tabBarInactiveTintColor: '#71717a',
        tabBarStyle: { backgroundColor: '#0f0f17', borderTopColor: '#27272a' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Map' }} />
    </Tabs>
  )
}
