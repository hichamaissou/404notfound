import { z } from 'zod'

/**
 * Environment configuration schema with strict validation.
 * Validates all required environment variables at startup.
 */
const envSchema = z.object({
  // Shopify App Configuration
  SHOPIFY_API_KEY: z.string().min(1, 'SHOPIFY_API_KEY is required'),
  SHOPIFY_API_SECRET: z.string().min(1, 'SHOPIFY_API_SECRET is required'),
  SHOPIFY_SCOPES: z.string().min(1, 'SHOPIFY_SCOPES is required'),
  SHOPIFY_APP_URL: z.string().url('SHOPIFY_APP_URL must be a valid URL'),
  SHOPIFY_API_VERSION: z.string().default('2024-01'),
  
  // Public environment variables (available on client)
  NEXT_PUBLIC_SHOPIFY_API_KEY: z.string().min(1, 'NEXT_PUBLIC_SHOPIFY_API_KEY is required'),
  
  // Database Configuration
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  
  // Security
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  
  // Billing Configuration
  BILLING_CURRENCY: z.string().default('USD'),
  BILLING_PLAN_NAME: z.string().default('Pro Plan'),
  BILLING_PRICE_AMOUNT: z.string().default('9.99'),
  BILLING_TRIAL_DAYS: z.string().default('7'),
  BILLING_TEST_MODE: z.string().default('true'),
  
  // Cron & Jobs
  CRON_SECRET: z.string().optional(),
  
  // Optional Services
  RESEND_API_KEY: z.string().optional(),
  ALERTS_TO: z.string().optional(),
  
  // Runtime Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VERCEL: z.string().optional(),
  SKIP_DB_PUSH: z.string().optional(),
})

/**
 * Validates and exports typed environment configuration.
 * Fails fast with detailed error messages for missing/invalid variables.
 */
function loadEnvironment() {
  try {
    const parsed = envSchema.parse(process.env)
    
    return {
      ...parsed,
      // Transform string booleans to actual booleans
      BILLING_TEST_MODE: parsed.BILLING_TEST_MODE === 'true',
      BILLING_PRICE_AMOUNT: parseFloat(parsed.BILLING_PRICE_AMOUNT),
      BILLING_TRIAL_DAYS: parseInt(parsed.BILLING_TRIAL_DAYS, 10),
      
      // Computed values
      isDevelopment: parsed.NODE_ENV === 'development',
      isProduction: parsed.NODE_ENV === 'production',
      isVercel: Boolean(parsed.VERCEL),
      shouldSkipDbPush: Boolean(parsed.VERCEL || parsed.SKIP_DB_PUSH),
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n  ')
      
      throw new Error(
        `Environment validation failed:\n  ${missingVars}\n\n` +
        'Please check your .env.local file and ensure all required variables are set.'
      )
    }
    throw error
  }
}

/**
 * Typed environment configuration object.
 * Use this instead of process.env.* for type safety and validation.
 */
export const env = loadEnvironment()

export type Environment = typeof env
