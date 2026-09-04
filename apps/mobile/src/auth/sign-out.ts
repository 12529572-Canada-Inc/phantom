export type SignOutStatus = 'idle' | 'pending' | 'failed'

export async function signOutWithLocationCleanup(
  cleanupLocation: () => Promise<unknown>,
  signOut: () => Promise<boolean>,
) {
  try {
    await cleanupLocation()
  } catch {
    // Authentication must still be cleared if native or network cleanup fails.
  }

  return signOut()
}

export async function performSignOut(
  signOut: () => Promise<boolean>,
  setStatus: (status: SignOutStatus) => void,
) {
  setStatus('pending')

  const succeeded = await signOut()
  if (!succeeded) setStatus('failed')
}
