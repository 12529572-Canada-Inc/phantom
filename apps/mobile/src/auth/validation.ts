import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be 128 characters or fewer.'),
})

const signUpCredentialsSchema = credentialsSchema
  .extend({ confirmation: z.string() })
  .refine(({ confirmation, password }) => confirmation === password, {
    message: 'Passwords do not match.',
    path: ['confirmation'],
  })

export function validateCredentials(email: string, password: string) {
  return credentialsSchema.safeParse({ email, password })
}

export function validateSignUpCredentials(
  email: string,
  password: string,
  confirmation: string,
) {
  return signUpCredentialsSchema.safeParse({ confirmation, email, password })
}
