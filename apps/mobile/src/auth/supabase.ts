import 'react-native-url-polyfill/auto'

import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'

import { readSupabaseConfig } from './config'
import { createSecureStoreAdapter } from './secure-store-adapter'

// Expo only embeds statically referenced EXPO_PUBLIC_ variables in the bundle.
export const supabaseConfig = readSupabaseConfig({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
})

export const supabase = supabaseConfig.ok
  ? createClient(
      supabaseConfig.value.url,
      supabaseConfig.value.publishableKey,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          persistSession: true,
          storage: createSecureStoreAdapter(SecureStore),
        },
      },
    )
  : null
