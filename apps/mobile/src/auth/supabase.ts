import 'react-native-url-polyfill/auto'

import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'

import { readSupabaseConfig } from './config'
import { createSecureStoreAdapter } from './secure-store-adapter'

export const supabaseConfig = readSupabaseConfig(process.env)

export const supabase = supabaseConfig.ok
  ? createClient(supabaseConfig.value.url, supabaseConfig.value.publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        persistSession: true,
        storage: createSecureStoreAdapter(SecureStore),
      },
    })
  : null
