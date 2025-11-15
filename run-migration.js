const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  // Create Supabase client with service role key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, 'scripts', '007-add-metadata-to-astrologer-otp.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('🚀 Running migration: 007-add-metadata-to-astrologer-otp.sql')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // Execute the SQL via Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql })

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('⚠️  exec_sql function not found, trying direct execution...')

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

      console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        if (statement.includes('ALTER TABLE')) {
          console.log(`[${i + 1}/${statements.length}] Executing ALTER TABLE...`)
          console.log(statement.substring(0, 100) + '...\n')
        } else if (statement.includes('CREATE INDEX')) {
          console.log(`[${i + 1}/${statements.length}] Executing CREATE INDEX...`)
          console.log(statement.substring(0, 100) + '...\n')
        } else if (statement.includes('COMMENT')) {
          console.log(`[${i + 1}/${statements.length}] Executing COMMENT...`)
          console.log(statement.substring(0, 100) + '...\n')
        }

        // For Supabase, we need to use the PostgreSQL REST API or SQL editor
        // Since direct SQL execution via Supabase JS client is limited,
        // we'll need to use the Supabase SQL editor or pg library

        console.log('❌ Direct SQL execution not supported via Supabase JS client.')
        console.log('\n📋 Please run the migration manually using one of these methods:\n')
        console.log('1️⃣  Supabase Dashboard → SQL Editor → Paste the SQL from:')
        console.log('    scripts/007-add-metadata-to-astrologer-otp.sql\n')
        console.log('2️⃣  Or use psql command:')
        console.log(`    psql "${process.env.SUPABASE_POSTGRES_URL_NON_POOLING}" -f scripts/007-add-metadata-to-astrologer-otp.sql\n`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        process.exit(1)
      }

      return
    }

    console.log('✅ Migration completed successfully!')
    console.log(data)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    console.log('\n📋 Please run the migration manually:')
    console.log('   Open Supabase Dashboard → SQL Editor → Run the following:\n')
    console.log(sql)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    process.exit(1)
  }
}

runMigration()
