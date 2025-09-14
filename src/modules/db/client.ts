/**
 * Database client configuration and connection management.
 * Re-exports the existing Drizzle client with type safety.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '../../config/env'
import * as schema from '../../lib/db/schema'

/**
 * PostgreSQL connection client.
 * Configured with connection pooling and SSL for production.
 */
const client = postgres(env.DATABASE_URL, {
  max: 10,
  ssl: env.isProduction ? 'require' : false,
})

/**
 * Drizzle ORM database instance with full schema.
 * Use this for all database operations throughout the app.
 */
export const db = drizzle(client, { schema })

/**
 * Re-export all schema tables and types for convenience.
 */
export * from '../../lib/db/schema'
