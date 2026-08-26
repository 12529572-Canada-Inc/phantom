import { Link, Redirect } from 'expo-router'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native'

import { AuthField } from './AuthField'
import { styles } from './auth-styles'
import { type AuthMode, useAuthForm } from './use-auth-form'

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const {
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
  } = useAuthForm(mode)

  if (session) return <Redirect href="/(tabs)" />

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
