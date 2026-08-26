type AuthNavigationState = {
  isAuthenticated: boolean
  isLoading: boolean
}

export function getAuthDestination({
  isAuthenticated,
  isLoading,
}: AuthNavigationState) {
  if (isLoading) return null
  return isAuthenticated ? ('/(tabs)' as const) : ('/sign-in' as const)
}
