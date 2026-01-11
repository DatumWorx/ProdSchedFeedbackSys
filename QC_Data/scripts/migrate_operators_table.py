#!/usr/bin/env python3
"""
Migrate operators table to new schema with additional fields.
This script safely updates the operators table structure.
"""

import sqlite3
import json
from pathlib import Path

# Database path
WORKSPACE_ROOT = Path(__file__).parent.parent.parent
DB_PATH = WORKSPACE_ROOT / 'QC_Data' / 'databases' / 'qc_unified.db'

def migrate_operators_table():
    """Migrate operators table to new schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if operators table exists and get current schema
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='operators'
        """)
        
        table_exists = cursor.fetchone() is not None
        
        if not table_exists:
            # Create new table with full schema
            print("Creating new operators table...")
            cursor.execute("""
                CREATE TABLE operators (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    date_of_hire DATE,
                    pay_rate REAL,
                    role TEXT,
                    primary_dept TEXT,
                    certified_departments TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_operators_name ON operators(name)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_operators_role ON operators(role)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_operators_primary_dept ON operators(primary_dept)")
            print("✓ Operators table created successfully")
        else:
            # Check what columns exist
            cursor.execute("PRAGMA table_info(operators)")
            columns = {row[1]: row[2] for row in cursor.fetchall()}
            
            print(f"Existing columns: {list(columns.keys())}")
            
            # Backup existing data if any
            cursor.execute("SELECT COUNT(*) FROM operators")
            count = cursor.fetchone()[0]
            existing_data = []
            if count > 0:
                print(f"Backing up {count} existing records...")
                cursor.execute("SELECT id, name, department, created_at FROM operators")
                existing_data = cursor.fetchall()
            
            # Check and add missing columns
            migrations = []
            
            if 'date_of_hire' not in columns:
                migrations.append("ALTER TABLE operators ADD COLUMN date_of_hire DATE")
            
            if 'pay_rate' not in columns:
                migrations.append("ALTER TABLE operators ADD COLUMN pay_rate REAL")
            
            if 'role' not in columns:
                migrations.append("ALTER TABLE operators ADD COLUMN role TEXT")
            
            if 'primary_dept' not in columns:
                migrations.append("ALTER TABLE operators ADD COLUMN primary_dept TEXT")
            
            if 'certified_departments' not in columns:
                migrations.append("ALTER TABLE operators ADD COLUMN certified_departments TEXT")
            
            if 'updated_at' not in columns:
                migrations.append("ALTER TABLE operators ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP")
            
            # If 'department' exists but 'primary_dept' doesn't, we need to migrate data
            if 'department' in columns and 'primary_dept' not in columns:
                # This will be handled after adding the column
                migrate_department = True
            else:
                migrate_department = False
            
            # Execute migrations
            for migration in migrations:
                print(f"Executing: {migration}")
                cursor.execute(migration)
            
            # Migrate department to primary_dept if needed
            if migrate_department:
                print("Migrating 'department' to 'primary_dept'...")
                cursor.execute("UPDATE operators SET primary_dept = department WHERE primary_dept IS NULL")
            
            # If old 'department' column exists and is separate, we could drop it
            # But SQLite doesn't support DROP COLUMN easily, so we'll leave it for now
            # (It won't hurt to have both)
            
            # Create indexes if they don't exist
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_operators_name ON operators(name)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_operators_role ON operators(role)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_operators_primary_dept ON operators(primary_dept)")
            
            print("✓ Operators table migrated successfully")
            
        conn.commit()
        print(f"✓ Migration complete. Database: {DB_PATH}")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_operators_table()
