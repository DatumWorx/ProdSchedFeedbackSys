/**
 * Database Migration Script
 * 
 * This script updates existing databases to add the UNIQUE constraint
 * on departments.asana_project_gid for proper foreign key support.
 * 
 * Usage: npx ts-node scripts/migrate-database.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Use the unified QC database located in QC_Data/databases/
const workspaceRoot = path.resolve(process.cwd(), '..');
const dbPath = path.join(workspaceRoot, 'QC_Data', 'databases', 'qc_unified.db');

if (!fs.existsSync(dbPath)) {
  console.log('Database not found. No migration needed for new database.');
  process.exit(0);
}

console.log('Starting database migration...');
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF'); // Temporarily disable for migration

try {
  // Check if the constraint already exists by checking the schema
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='departments'").get() as { sql: string } | undefined;
  
  if (schema?.sql?.includes('asana_project_gid TEXT UNIQUE')) {
    console.log('✅ Migration already applied. departments.asana_project_gid already has UNIQUE constraint.');
    db.close();
    process.exit(0);
  }

  console.log('Applying migration: Adding UNIQUE constraint to departments.asana_project_gid...');

  // Step 1: Check for duplicate asana_project_gid values
  const duplicates = db.prepare(`
    SELECT asana_project_gid, COUNT(*) as count 
    FROM departments 
    WHERE asana_project_gid IS NOT NULL 
    GROUP BY asana_project_gid 
    HAVING COUNT(*) > 1
  `).all() as Array<{ asana_project_gid: string; count: number }>;

  if (duplicates.length > 0) {
    console.error('❌ Error: Duplicate asana_project_gid values found:');
    duplicates.forEach(dup => {
      console.error(`   - ${dup.asana_project_gid}: ${dup.count} occurrences`);
    });
    console.error('Please resolve duplicates before running migration.');
    db.close();
    process.exit(1);
  }

  // Step 2: Create new table with UNIQUE constraint
  console.log('Creating new departments table with UNIQUE constraint...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      asana_project_gid TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Step 3: Copy data from old table to new table
  console.log('Copying data to new table...');
  type DepartmentRow = {
    id: number;
    name: string;
    asana_project_gid: string | null;
    created_at: string;
  };
  
  const rows = db.prepare('SELECT id, name, asana_project_gid, created_at FROM departments').all() as DepartmentRow[];

  const insertStmt = db.prepare(`
    INSERT INTO departments_new (id, name, asana_project_gid, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rowsToInsert: DepartmentRow[]) => {
    for (const row of rowsToInsert) {
      insertStmt.run(row.id, row.name, row.asana_project_gid, row.created_at);
    }
  });

  insertMany(rows);
  console.log(`   Copied ${rows.length} rows`);

  // Step 4: Drop old table and rename new table
  console.log('Replacing old table...');
  db.exec('DROP TABLE departments');
  db.exec('ALTER TABLE departments_new RENAME TO departments');

  // Step 5: Recreate indexes
  console.log('Recreating indexes...');
  db.exec('CREATE INDEX IF NOT EXISTS idx_operators_department ON operators(department)');

  // Step 6: Re-enable foreign keys
  db.pragma('foreign_keys = ON');

  console.log('✅ Migration completed successfully!');
  
} catch (error: any) {
  console.error('❌ Migration failed:', error.message);
  console.error(error);
  db.pragma('foreign_keys = ON');
  db.close();
  process.exit(1);
} finally {
  db.close();
}
