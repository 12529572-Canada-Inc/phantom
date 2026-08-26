export type SignOutStatus = 'idle' | 'pending' | 'failed'

export async function performSignOut(
  signOut: () => Promise<boolean>,
  setStatus: (status: SignOutStatus) => void,
) {
  setStatus('pending')

  const succeeded = await signOut()
  if (!succeeded) setStatus('failed')
}
