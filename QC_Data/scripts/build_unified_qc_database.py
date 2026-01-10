#!/usr/bin/env python3
"""
Unified QC Database Builder
Main script to consolidate all QC data from three sources into a single unified database:
1. Excel Format Version 1 (from /mnt/nvme2/SDP/QC-Data)
2. Excel Format Version 2 (from /mnt/nvme2/SDP/QC-Data)
3. Scheduling Feedback System direct input (from production_mgmt.db)
"""

import sqlite3
import os
import sys
from datetime import datetime
from pathlib import Path

# Configuration
UNIFIED_DB_PATH = "/mnt/nvme2/SDP/2-Dev/SDP-ProdMgmt2.0/qc_unified.db"
QC_FORMS_DIR = "/mnt/nvme2/SDP/QC-Data"
PROD_MGMT_DB_PATH = "/mnt/nvme2/SDP/2-Dev/SDP-ProdMgmt2.0/production-management-app/backend/data/production_mgmt.db"
RAW_DB_PATH = "/mnt/nvme2/SDP/2-Dev/SDP-ProdMgmt2.0/qc_sheets.db"
CLEANED_DB_PATH = "/mnt/nvme2/SDP/2-Dev/SDP-ProdMgmt2.0/qc_cleaned_2025.db"
SCHEMA_FILE = "qc_unified_database_schema.sql"


def create_unified_schema(conn):
    """Create unified database schema."""
    print("Creating unified database schema...")
    
    schema_path = os.path.join(os.path.dirname(__file__), SCHEMA_FILE)
    
    if not os.path.exists(schema_path):
        print(f"Error: Schema file not found: {schema_path}")
        return False
    
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
        try:
            conn.executescript(schema_sql)
            conn.commit()
            print("✅ Schema created successfully")
            return True
        except Exception as e:
            print(f"❌ Error creating schema: {e}")
            return False


def migrate_excel_data():
    """Migrate Excel data (v1 and v2) using migration script."""
    print("\n" + "=" * 60)
    print("Phase 2: Migrating Excel Data")
    print("=" * 60)
    
    if not os.path.exists(QC_FORMS_DIR):
        print(f"⚠️  QC Forms directory not found: {QC_FORMS_DIR}")
        print("   Skipping Excel data migration")
        return False
    
    # Import and run the Excel migration script
    try:
        from migrate_excel_data import migrate_excel_files
        migrate_excel_files()
        return True
    except Exception as e:
        print(f"❌ Error migrating Excel data: {e}")
        import traceback
        traceback.print_exc()
        return False


def migrate_direct_input_data():
    """Migrate direct input data from web app."""
    print("\n" + "=" * 60)
    print("Phase 3: Migrating Direct Input Data")
    print("=" * 60)
    
    if not os.path.exists(PROD_MGMT_DB_PATH):
        print(f"⚠️  Production management database not found: {PROD_MGMT_DB_PATH}")
        print("   Skipping direct input migration")
        return False
    
    # Import and run the direct input migration script
    try:
        from migrate_direct_input import migrate_direct_input
        migrate_direct_input()
        return True
    except Exception as e:
        print(f"❌ Error migrating direct input data: {e}")
        import traceback
        traceback.print_exc()
        return False


def migrate_from_existing_databases():
    """Optionally migrate from existing raw/cleaned databases as backup."""
    print("\n" + "=" * 60)
    print("Phase 4: Migrating from Existing Databases (Backup)")
    print("=" * 60)
    
    unified_conn = sqlite3.connect(UNIFIED_DB_PATH)
    unified_cursor = unified_conn.cursor()
    
    # Check for existing entries to avoid duplicates
    unified_cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE data_source LIKE 'excel_%'")
    existing_excel_count = unified_cursor.fetchone()[0]
    
    if existing_excel_count > 0:
        print(f"⚠️  Found {existing_excel_count} Excel entries already in unified database")
        print("   Skipping migration from existing databases (data already migrated from Excel files)")
        unified_conn.close()
        return True
    
    migrated_any = False
    
    # Try raw database
    if os.path.exists(RAW_DB_PATH):
        print(f"\nAttempting to migrate from raw database: {RAW_DB_PATH}")
        try:
            raw_conn = sqlite3.connect(RAW_DB_PATH)
            raw_cursor = raw_conn.cursor()
            
            # Get entries from raw database
            raw_cursor.execute("""
                SELECT source_file, work_order, customer_name, entry_date, operator,
                       part_name, start_time, finish_time, process_time, total_time,
                       material, material_size, total_parts, yield_status, scrap_count,
                       defects_count, notes, department, created_at
                FROM qc_entries
                WHERE entry_date IS NOT NULL
                ORDER BY entry_date
            """)
            
            raw_entries = raw_cursor.fetchall()
            print(f"   Found {len(raw_entries)} entries in raw database")
            
            # Determine format version for each file (heuristic: assume v1 for old database)
            # Or detect based on file modification date or date range
            migrated_from_raw = 0
            
            for entry in raw_entries:  # Process ALL entries
                (source_file, work_order, customer_name, entry_date, operator,
                 part_name, start_time, finish_time, process_time, total_time,
                 material, material_size, total_parts, yield_status, scrap_count,
                 defects_count, notes, department, created_at) = entry
                
                # Heuristic: if entry_date is recent (after July 2025), likely v2
                # Otherwise likely v1
                try:
                    if isinstance(entry_date, str):
                        entry_date_obj = datetime.strptime(entry_date, '%Y-%m-%d').date()
                    else:
                        entry_date_obj = entry_date
                    
                    # July 2025 cutoff
                    cutoff_date = datetime(2025, 7, 1).date()
                    data_source = 'excel_v2' if entry_date_obj >= cutoff_date else 'excel_v1'
                    
                    # Normalize time
                    total_time_minutes = None
                    if total_time:
                        if total_time > 24:
                            total_time_minutes = total_time
                        else:
                            total_time_minutes = total_time * 60.0
                    
                    try:
                        unified_cursor.execute("""
                            INSERT INTO qc_entries (
                                data_source, source_file, work_order, customer_name, entry_date,
                                operator, part_name, start_time, finish_time, process_time_minutes,
                                total_time_minutes, material, material_size, total_parts, parts_produced,
                                defects_count, scrap_count, yield_status, notes, department, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            data_source, source_file, work_order, customer_name, entry_date,
                            operator, part_name, start_time, finish_time,
                            process_time * 60.0 if process_time and process_time <= 8 else process_time,
                            total_time_minutes, material, material_size, total_parts, total_parts,
                            defects_count, scrap_count, yield_status, notes, department, created_at
                        ))
                        migrated_from_raw += 1
                    except sqlite3.IntegrityError:
                        # Duplicate - skip
                        pass
                
                except Exception as e:
                    continue
            
            unified_conn.commit()
            raw_conn.close()
            
            if migrated_from_raw > 0:
                print(f"   ✅ Migrated {migrated_from_raw} entries from raw database")
                migrated_any = True
            else:
                print(f"   ⚠️  No entries migrated from raw database")
        
        except Exception as e:
            print(f"   ❌ Error migrating from raw database: {e}")
    
    unified_conn.close()
    return migrated_any


def validate_data_integrity():
    """Validate data integrity and print statistics."""
    print("\n" + "=" * 60)
    print("Phase 5: Data Validation")
    print("=" * 60)
    
    if not os.path.exists(UNIFIED_DB_PATH):
        print(f"❌ Unified database not found: {UNIFIED_DB_PATH}")
        return False
    
    conn = sqlite3.connect(UNIFIED_DB_PATH)
    cursor = conn.cursor()
    
    # Count entries by source
    cursor.execute("SELECT data_source, COUNT(*) FROM qc_entries GROUP BY data_source")
    source_counts = cursor.fetchall()
    
    print("\nEntries by data source:")
    total_entries = 0
    for source, count in source_counts:
        print(f"  {source}: {count:,}")
        total_entries += count
    
    print(f"\nTotal entries: {total_entries:,}")
    
    # Date range
    cursor.execute("SELECT MIN(entry_date), MAX(entry_date) FROM qc_entries WHERE entry_date IS NOT NULL")
    date_range = cursor.fetchone()
    if date_range[0] and date_range[1]:
        print(f"Date range: {date_range[0]} to {date_range[1]}")
    
    # Operator counts
    cursor.execute("SELECT COUNT(DISTINCT operator) FROM qc_entries WHERE operator IS NOT NULL")
    operator_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT operator_id) FROM qc_entries WHERE operator_id IS NOT NULL")
    operator_id_count = cursor.fetchone()[0]
    print(f"Unique operators (name): {operator_count}")
    print(f"Unique operators (ID): {operator_id_count}")
    
    # Work order counts
    cursor.execute("SELECT COUNT(DISTINCT work_order) FROM qc_entries WHERE work_order IS NOT NULL")
    wo_count = cursor.fetchone()[0]
    print(f"Unique work orders: {wo_count}")
    
    # Department breakdown
    cursor.execute("SELECT department, COUNT(*) FROM qc_entries WHERE department IS NOT NULL GROUP BY department")
    dept_counts = cursor.fetchall()
    if dept_counts:
        print("\nEntries by department:")
        for dept, count in dept_counts:
            print(f"  {dept}: {count:,}")
    
    # Validation checks
    print("\nValidation checks:")
    
    # Check for entries with missing required fields
    cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE entry_date IS NULL")
    missing_dates = cursor.fetchone()[0]
    if missing_dates > 0:
        print(f"  ⚠️  {missing_dates} entries with missing entry_date")
    else:
        print(f"  ✅ All entries have entry_date")
    
    # Check for entries with no operator info
    cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE operator IS NULL AND operator_id IS NULL")
    missing_operator = cursor.fetchone()[0]
    if missing_operator > 0:
        print(f"  ⚠️  {missing_operator} entries with missing operator info")
    else:
        print(f"  ✅ All entries have operator info")
    
    # Check data source distribution
    print("\nData source distribution:")
    cursor.execute("""
        SELECT data_source, 
               COUNT(*) as count,
               MIN(entry_date) as min_date,
               MAX(entry_date) as max_date
        FROM qc_entries
        WHERE entry_date IS NOT NULL
        GROUP BY data_source
    """)
    source_stats = cursor.fetchall()
    for source, count, min_date, max_date in source_stats:
        print(f"  {source}: {count:,} entries ({min_date} to {max_date})")
    
    conn.close()
    return True


def main():
    """Main function to build unified QC database."""
    print("=" * 60)
    print("Unified QC Database Builder")
    print("=" * 60)
    print(f"\nUnified Database: {UNIFIED_DB_PATH}")
    print(f"QC Forms Directory: {QC_FORMS_DIR}")
    print(f"Production Management DB: {PROD_MGMT_DB_PATH}")
    
    # Check if we should recreate the database
    recreate = False
    if len(sys.argv) > 1 and sys.argv[1] in ['--recreate', '-r']:
        recreate = True
        if os.path.exists(UNIFIED_DB_PATH):
            print(f"\n⚠️  Recreating database (existing will be backed up)")
            backup_path = f"{UNIFIED_DB_PATH}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            import shutil
            shutil.copy2(UNIFIED_DB_PATH, backup_path)
            os.remove(UNIFIED_DB_PATH)
            print(f"   Backup saved to: {backup_path}")
    
    # Phase 1: Create unified schema
    print("\n" + "=" * 60)
    print("Phase 1: Creating Unified Database Schema")
    print("=" * 60)
    
    conn = sqlite3.connect(UNIFIED_DB_PATH)
    if not create_unified_schema(conn):
        print("❌ Failed to create schema. Exiting.")
        conn.close()
        return
    
    conn.close()
    
    # Phase 2: Migrate Excel data (v1 and v2)
    excel_success = migrate_excel_data()
    
    # Phase 3: Migrate direct input data
    direct_input_success = migrate_direct_input_data()
    
    # Phase 4: Optionally migrate from existing databases as backup
    migrate_from_existing_databases()
    
    # Phase 5: Validate data integrity
    validation_success = validate_data_integrity()
    
    # Final summary
    print("\n" + "=" * 60)
    print("Build Summary")
    print("=" * 60)
    print(f"Excel data migration: {'✅ Success' if excel_success else '❌ Failed or Skipped'}")
    print(f"Direct input migration: {'✅ Success' if direct_input_success else '❌ Failed or Skipped'}")
    print(f"Data validation: {'✅ Success' if validation_success else '❌ Failed'}")
    print(f"\nUnified database location: {UNIFIED_DB_PATH}")
    print("\n✅ Unified database build complete!")


if __name__ == "__main__":
    main()
