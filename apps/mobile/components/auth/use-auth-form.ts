import { Keyboard } from 'react-native'
import { useState } from 'react'

import { useAuth } from '../../src/auth/auth-context'
import { authCallbackUrl, signInWithGoogle } from '../../src/auth/oauth'
import { supabase } from '../../src/auth/supabase'
import {
  validateCredentials,
  validateSignUpCredentials,
} from '../../src/auth/validation'

export type AuthMode = 'sign-in' | 'sign-up'

export function useAuthForm(mode: AuthMode) {
  const { configurationError, session } = useAuth()
  const [confirmation, setConfirmation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pendingAction, setPendingAction] = useState<'email' | 'google' | null>(
    null,
  )
  const [status, setStatus] = useState<{
    kind: 'error' | 'notice'
    message: string
  } | null>(null)
  const isSignUp = mode === 'sign-up'
  const isDisabled = pendingAction !== null || configurationError !== null

  async function submitEmail() {
    Keyboard.dismiss()
    setStatus(null)

    const validation = isSignUp
      ? validateSignUpCredentials(email, password, confirmation)
      : validateCredentials(email, password)

    if (!validation.success) {
      setStatus({
        kind: 'error',
        message: validation.error.issues[0]?.message ?? 'Check your details.',
      })
      return
    }

    if (!supabase) {
      setStatus({ kind: 'error', message: 'Authentication is not configured.' })
      return
    }

    setPendingAction('email')
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
          options: { emailRedirectTo: authCallbackUrl },
        })

        if (error) {
          setStatus({
            kind: 'error',
            message:
              'Unable to create your account. Check your details and try again.',
          })
        } else if (!data.session) {
          setStatus({
            kind: 'notice',
            message:
              'Check your email to confirm your account, then return here.',
          })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        })

        if (error) {
          setStatus({
            kind: 'error',
            message: 'Unable to sign in. Check your credentials and try again.',
          })
        }
      }
    } catch {
      setStatus({
        kind: 'error',
        message:
          'The signal could not be reached. Check your connection and try again.',
      })
    } finally {
      setPendingAction(null)
    }
  }

  async function submitGoogle() {
    setStatus(null)
    if (!supabase) {
      setStatus({ kind: 'error', message: 'Authentication is not configured.' })
      return
    }

    setPendingAction('google')
    try {
      const result = await signInWithGoogle(supabase)
      if (!result.ok && !('cancelled' in result)) {
        setStatus({ kind: 'error', message: result.message })
      }
    } catch {
      setStatus({
        kind: 'error',
        message: 'Google sign-in could not be completed. Try again.',
      })
    } finally {
      setPendingAction(null)
    }
  }

  return {
    configurationError,
    confirmation,
    email,
    isDisabled,
    isSignUp,
    password,
    pendingAction,
    session,
    setConfirmation,
    setEmail,
    setPassword,
    status,
    submitEmail,
    submitGoogle,
  }
}
