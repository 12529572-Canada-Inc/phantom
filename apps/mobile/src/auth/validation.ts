import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be 128 characters or fewer.'),
})

export function validateCredentials(email: string, password: string) {
  return credentialsSchema.safeParse({ email, password })
}
