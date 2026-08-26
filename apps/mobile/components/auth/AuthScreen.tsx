import { Link, Redirect } from 'expo-router'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { type ComponentProps, useState } from 'react'

import { useAuth } from '../../src/auth/auth-context'
import { authCallbackUrl, signInWithGoogle } from '../../src/auth/oauth'
import { supabase } from '../../src/auth/supabase'
import {
  validateCredentials,
  validateSignUpCredentials,
} from '../../src/auth/validation'

type AuthMode = 'sign-in' | 'sign-up'

type AuthFieldProps = ComponentProps<typeof TextInput> & {
  label: string
}

function AuthField({ label, ...inputProps }: AuthFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#71717a"
        selectionColor="#a78bfa"
        style={styles.input}
        {...inputProps}
      />
    </View>
  )
}

export function AuthScreen({ mode }: { mode: AuthMode }) {
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

  if (session) return <Redirect href="/(tabs)" />

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>PHANTOM // SECURE CHANNEL</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {isSignUp ? 'Join the signal' : 'Return to the signal'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Create an identity before you enter contested territory.'
                : 'Identify yourself to continue the search.'}
            </Text>
          </View>

          {configurationError ? (
            <View accessibilityRole="alert" style={styles.errorPanel}>
              <Text style={styles.errorText}>
                Authentication is not configured for this build. Add the public
                Supabase environment values and restart Expo.
              </Text>
            </View>
          ) : null}

          {status ? (
            <View
              accessibilityLiveRegion="polite"
              accessibilityRole={status.kind === 'error' ? 'alert' : 'text'}
              style={
                status.kind === 'error' ? styles.errorPanel : styles.noticePanel
              }
            >
              <Text
                style={
                  status.kind === 'error' ? styles.errorText : styles.noticeText
                }
              >
                {status.message}
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <AuthField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
            />
            <AuthField
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              label="Password"
              onChangeText={setPassword}
              onSubmitEditing={isSignUp ? undefined : submitEmail}
              returnKeyType={isSignUp ? 'next' : 'done'}
              secureTextEntry
              textContentType={isSignUp ? 'newPassword' : 'password'}
              value={password}
            />
            {isSignUp ? (
              <AuthField
                autoCapitalize="none"
                autoComplete="new-password"
                label="Confirm password"
                onChangeText={setConfirmation}
                onSubmitEditing={submitEmail}
                returnKeyType="done"
                secureTextEntry
                textContentType="newPassword"
                value={confirmation}
              />
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: isDisabled,
                busy: pendingAction === 'email',
              }}
              disabled={isDisabled}
              onPress={submitEmail}
              style={({ pressed }) => [
                styles.primaryButton,
                isDisabled && styles.disabledButton,
                pressed && !isDisabled && styles.pressedButton,
              ]}
            >
              {pendingAction === 'email' ? (
                <ActivityIndicator color="#18181b" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Create account' : 'Sign in'}
                </Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: isDisabled,
                busy: pendingAction === 'google',
              }}
              disabled={isDisabled}
              onPress={submitGoogle}
              style={({ pressed }) => [
                styles.secondaryButton,
                isDisabled && styles.disabledButton,
                pressed && !isDisabled && styles.pressedButton,
              ]}
            >
              {pendingAction === 'google' ? (
                <ActivityIndicator color="#f4f4f5" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  Continue with Google
                </Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footerText}>
            {isSignUp ? 'Already registered? ' : 'New to the field? '}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              style={styles.footerLink}
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  disabledButton: { opacity: 0.45 },
  divider: { backgroundColor: '#27272a', flex: 1, height: 1 },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  dividerText: { color: '#71717a', fontSize: 12, fontWeight: '700' },
  errorPanel: {
    backgroundColor: '#2a1118',
    borderColor: '#7f1d35',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    padding: 12,
  },
  errorText: { color: '#fda4af', fontSize: 14, lineHeight: 20 },
  eyebrow: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  field: { gap: 8 },
  footerLink: { color: '#c4b5fd', fontWeight: '700' },
  footerText: { color: '#a1a1aa', marginTop: 28, textAlign: 'center' },
  form: { gap: 16 },
  header: { gap: 10, marginBottom: 28 },
  input: {
    backgroundColor: '#111118',
    borderColor: '#3f3f46',
    borderRadius: 8,
    borderWidth: 1,
    color: '#f4f4f5',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  keyboardView: { flex: 1 },
  label: { color: '#d4d4d8', fontSize: 14, fontWeight: '600' },
  noticePanel: {
    backgroundColor: '#10241d',
    borderColor: '#166534',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    padding: 12,
  },
  noticeText: { color: '#86efac', fontSize: 14, lineHeight: 20 },
  pressedButton: { transform: [{ scale: 0.99 }] },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#c4b5fd',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonText: { color: '#18181b', fontSize: 16, fontWeight: '800' },
  safeArea: { backgroundColor: '#08080d', flex: 1 },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#52525b',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: { color: '#f4f4f5', fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#a1a1aa', fontSize: 16, lineHeight: 24 },
  title: {
    color: '#fafafa',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
})
