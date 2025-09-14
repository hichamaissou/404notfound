const { execSync } = require('child_process')

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL found, running drizzle-kit push...')
  try {
    execSync('npx drizzle-kit push', { stdio: 'inherit' })
    console.log('Database push completed successfully')
  } catch (error) {
    console.error('Database push failed:', error.message)
    process.exit(1)
  }
} else {
  console.log('No DATABASE_URL found, skipping database push')
}
