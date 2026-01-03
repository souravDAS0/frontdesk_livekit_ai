const fs = require('fs');
const path = require('path');
const { pool } = require('./config');

/**
 * Database migration runner
 * Executes SQL migration files in order
 */
async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Starting database migrations...\n');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get list of already executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
    );
    const executedSet = new Set(executedMigrations.map(m => m.migration_name));

    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    let executedCount = 0;

    // Execute each migration
    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`⊘ Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`→ Executing ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✓ Successfully executed ${file}\n`);
        executedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Error executing ${file}:`, error.message);
        throw error;
      }
    }

    if (executedCount === 0) {
      console.log('All migrations are up to date.');
    } else {
      console.log(`\n✓ Successfully executed ${executedCount} migration(s)`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
