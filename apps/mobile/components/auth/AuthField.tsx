import type { ComponentProps } from 'react'
import { Text, TextInput, View } from 'react-native'

import { styles } from './auth-styles'

type AuthFieldProps = ComponentProps<typeof TextInput> & {
  label: string
}

export function AuthField({ label, ...inputProps }: AuthFieldProps) {
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
