import { Redirect } from 'expo-router'

import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen'
import { useAuth } from '../src/auth/auth-context'
import { getAuthDestination } from '../src/auth/navigation'

export default function IndexScreen() {
  const { isLoading, session } = useAuth()
  const destination = getAuthDestination({
    isAuthenticated: session !== null,
    isLoading,
  })

  if (!destination) return <AuthLoadingScreen />
  return <Redirect href={destination} />
}
