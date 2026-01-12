#!/usr/bin/env python3
"""
Migrate QC entries from qc_sheets.db to qc_unified.db
Replaces all entries in qc_unified.db with entries from qc_sheets.db
"""

import sqlite3
import os
from datetime import datetime

# Database paths
SOURCE_DB_PATH = "/mnt/nvme2/SDP/2-Dev/SDP-ProdMgmt2.0/qc_sheets.db"
TARGET_DB_PATH = "/mnt/nvme2/SDP/2-Dev/ProdSchedFeedbackSys/QC_Data/databases/qc_unified.db"


def migrate_qc_entries():
    """Migrate all QC entries from source to target database."""
    
    # Check if source database exists
    if not os.path.exists(SOURCE_DB_PATH):
        print(f"❌ Source database not found: {SOURCE_DB_PATH}")
        return False
    
    # Check if target database exists
    if not os.path.exists(TARGET_DB_PATH):
        print(f"❌ Target database not found: {TARGET_DB_PATH}")
        return False
    
    # Connect to source database
    print(f"Connecting to source database: {SOURCE_DB_PATH}")
    source_conn = sqlite3.connect(SOURCE_DB_PATH)
    source_cursor = source_conn.cursor()
    
    # Get count from source
    source_cursor.execute("SELECT COUNT(*) FROM qc_entries")
    source_count = source_cursor.fetchone()[0]
    print(f"Source database has {source_count:,} entries")
    
    # Connect to target database
    print(f"Connecting to target database: {TARGET_DB_PATH}")
    target_conn = sqlite3.connect(TARGET_DB_PATH)
    target_cursor = target_conn.cursor()
    
    # Get count from target before deletion
    target_cursor.execute("SELECT COUNT(*) FROM qc_entries")
    target_count_before = target_cursor.fetchone()[0]
    print(f"Target database currently has {target_count_before:,} entries")
    
    # Delete all entries from target database
    print("\nDeleting all entries from target database...")
    target_cursor.execute("DELETE FROM qc_entries")
    deleted_count = target_cursor.rowcount
    target_conn.commit()
    print(f"✅ Deleted {deleted_count:,} entries from target database")
    
    # Reset the auto-increment counter (optional but clean)
    target_cursor.execute("DELETE FROM sqlite_sequence WHERE name='qc_entries'")
    target_conn.commit()
    
    # Fetch all entries from source database
    print("\nFetching entries from source database...")
    source_cursor.execute("""
        SELECT id, source_file, work_order, customer_name, entry_date, operator,
               part_name, start_time, finish_time, process_time, total_time,
               material, material_size, total_parts, yield_status, scrap_count,
               defects_count, notes, department, created_at, updated_at
        FROM qc_entries
        ORDER BY entry_date, id
    """)
    
    source_entries = source_cursor.fetchall()
    print(f"Fetched {len(source_entries):,} entries from source database")
    
    # July 2025 cutoff date for determining excel_v1 vs excel_v2
    cutoff_date = datetime(2025, 7, 1).date()
    
    # Insert entries into target database
    print("\nInserting entries into target database...")
    inserted_count = 0
    skipped_count = 0
    
    insert_sql = """
        INSERT INTO qc_entries (
            data_source, source_file, source_entry_id, work_order, customer_name, entry_date,
            operator, part_name, start_time, finish_time, process_time_minutes,
            total_time_minutes, material, material_size, total_parts, parts_produced,
            defects_count, scrap_count, yield_status, notes, department, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    for entry in source_entries:
        (source_id, source_file, work_order, customer_name, entry_date, operator,
         part_name, start_time, finish_time, process_time, total_time,
         material, material_size, total_parts, yield_status, scrap_count,
         defects_count, notes, department, created_at, updated_at) = entry
        
        # Skip entries without entry_date
        if not entry_date:
            skipped_count += 1
            continue
        
        # Determine data_source based on entry_date
        try:
            if isinstance(entry_date, str):
                entry_date_obj = datetime.strptime(entry_date, '%Y-%m-%d').date()
            else:
                entry_date_obj = entry_date
            
            data_source = 'excel_v2' if entry_date_obj >= cutoff_date else 'excel_v1'
        except:
            # Default to excel_v1 if date parsing fails
            data_source = 'excel_v1'
            entry_date_obj = None
        
        # Normalize time values to minutes
        # process_time is typically in hours (0-8 range)
        process_time_minutes = None
        if process_time is not None:
            if process_time > 8:  # Already in minutes
                process_time_minutes = process_time
            else:  # In hours, convert to minutes
                process_time_minutes = process_time * 60.0
        
        # total_time is typically in hours (0-24 range)
        total_time_minutes = None
        if total_time is not None:
            if total_time > 24:  # Already in minutes
                total_time_minutes = total_time
            else:  # In hours, convert to minutes
                total_time_minutes = total_time * 60.0
        
        # Insert into target database
        try:
            target_cursor.execute(insert_sql, (
                data_source,  # data_source
                source_file,  # source_file
                source_id,  # source_entry_id (original id from source)
                work_order,  # work_order
                customer_name,  # customer_name
                entry_date,  # entry_date
                operator,  # operator
                part_name,  # part_name
                start_time,  # start_time
                finish_time,  # finish_time
                process_time_minutes,  # process_time_minutes
                total_time_minutes,  # total_time_minutes
                material,  # material
                material_size,  # material_size
                total_parts,  # total_parts
                total_parts,  # parts_produced (same as total_parts for Excel data)
                defects_count or 0,  # defects_count
                scrap_count or 0,  # scrap_count
                yield_status,  # yield_status
                notes,  # notes
                department,  # department
                created_at,  # created_at
                updated_at  # updated_at
            ))
            inserted_count += 1
            
            # Commit in batches for better performance
            if inserted_count % 1000 == 0:
                target_conn.commit()
                print(f"  Inserted {inserted_count:,} entries...")
        
        except Exception as e:
            print(f"  ⚠️  Error inserting entry {source_id}: {e}")
            skipped_count += 1
            continue
    
    # Final commit
    target_conn.commit()
    
    # Verify final count
    target_cursor.execute("SELECT COUNT(*) FROM qc_entries")
    target_count_after = target_cursor.fetchone()[0]
    
    # Close connections
    source_conn.close()
    target_conn.close()
    
    # Print summary
    print("\n" + "=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"Source entries: {source_count:,}")
    print(f"Target entries before: {target_count_before:,}")
    print(f"Target entries after: {target_count_after:,}")
    print(f"Successfully inserted: {inserted_count:,}")
    print(f"Skipped (errors/missing date): {skipped_count:,}")
    
    if inserted_count == source_count - skipped_count:
        print("\n✅ Migration completed successfully!")
        return True
    else:
        print(f"\n⚠️  Migration completed with some skipped entries")
        return True


if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("QC Entries Migration Script")
    print("=" * 60)
    print(f"\nSource: {SOURCE_DB_PATH}")
    print(f"Target: {TARGET_DB_PATH}")
    print("\nThis will DELETE all existing entries in the target database")
    print("and replace them with entries from the source database.\n")
    
    # Support --yes flag for non-interactive execution
    if len(sys.argv) > 1 and sys.argv[1] in ['--yes', '-y']:
        migrate_qc_entries()
    else:
        response = input("Continue? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            migrate_qc_entries()
        else:
            print("Migration cancelled.")
