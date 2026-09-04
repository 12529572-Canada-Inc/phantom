import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const mobileRequire = createRequire(
  new URL('../../apps/mobile/package.json', import.meta.url),
)
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'))
const { transformFileSync } = expoRequire('@babel/core')

test('Expo embeds public auth configuration in the native bundle', () => {
  const values = {
    EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_bundle_test',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon-bundle-test',
  }
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  )
  Object.assign(process.env, values)
  try {
    const { code } = transformFileSync(
      fileURLToPath(
        new URL('../../apps/mobile/src/auth/supabase.ts', import.meta.url),
      ),
      {
        configFile: false,
        babelrc: false,
        presets: [expoRequire.resolve('babel-preset-expo')],
        caller: { name: 'metro', platform: 'ios', isDev: false },
      },
    )
    for (const value of Object.values(values)) assert.ok(code.includes(value))
    assert.doesNotMatch(code, /readSupabaseConfig\)\(process\.env\)/)
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
