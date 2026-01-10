#!/usr/bin/env python3
"""
Unified Database Validation Script
Validates data integrity and provides statistics for the unified QC database.
"""

import sqlite3
import os
import sys
from datetime import datetime

# Configuration
UNIFIED_DB_PATH = "/mnt/nvme2/SDP/2-Dev/SDP-ProdMgmt2.0/qc_unified.db"


def validate_unified_database():
    """Validate unified database and print comprehensive statistics."""
    print("=" * 60)
    print("Unified QC Database Validation")
    print("=" * 60)
    
    if not os.path.exists(UNIFIED_DB_PATH):
        print(f"❌ Unified database not found: {UNIFIED_DB_PATH}")
        return False
    
    conn = sqlite3.connect(UNIFIED_DB_PATH)
    cursor = conn.cursor()
    
    # Basic counts
    print("\n1. Basic Statistics")
    print("-" * 60)
    
    cursor.execute("SELECT COUNT(*) FROM qc_entries")
    total_entries = cursor.fetchone()[0]
    print(f"Total QC entries: {total_entries:,}")
    
    # Count by source
    cursor.execute("SELECT data_source, COUNT(*) FROM qc_entries GROUP BY data_source ORDER BY data_source")
    source_counts = cursor.fetchall()
    print("\nEntries by data source:")
    for source, count in source_counts:
        percentage = (count / total_entries * 100) if total_entries > 0 else 0
        print(f"  {source:20} {count:8,} ({percentage:5.1f}%)")
    
    # Date range
    print("\n2. Date Range Analysis")
    print("-" * 60)
    
    cursor.execute("SELECT MIN(entry_date), MAX(entry_date), COUNT(DISTINCT entry_date) FROM qc_entries WHERE entry_date IS NOT NULL")
    min_date, max_date, unique_dates = cursor.fetchone()
    if min_date and max_date:
        print(f"Date range: {min_date} to {max_date}")
        print(f"Unique dates: {unique_dates:,}")
        
        # Date range by source
        cursor.execute("""
            SELECT data_source, MIN(entry_date), MAX(entry_date), COUNT(*)
            FROM qc_entries
            WHERE entry_date IS NOT NULL
            GROUP BY data_source
            ORDER BY data_source
        """)
        print("\nDate range by source:")
        for source, min_d, max_d, count in cursor.fetchall():
            print(f"  {source:20} {min_d} to {max_d} ({count:,} entries)")
    else:
        print("⚠️  No valid dates found")
    
    # Operator statistics
    print("\n3. Operator Statistics")
    print("-" * 60)
    
    cursor.execute("SELECT COUNT(DISTINCT operator) FROM qc_entries WHERE operator IS NOT NULL")
    operator_name_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT operator_id) FROM qc_entries WHERE operator_id IS NOT NULL")
    operator_id_count = cursor.fetchone()[0]
    
    print(f"Unique operators (by name): {operator_name_count:,}")
    print(f"Unique operators (by ID): {operator_id_count:,}")
    
    # Top operators by entry count
    cursor.execute("""
        SELECT operator, COUNT(*) as entry_count
        FROM qc_entries
        WHERE operator IS NOT NULL
        GROUP BY operator
        ORDER BY entry_count DESC
        LIMIT 10
    """)
    print("\nTop 10 operators by entry count:")
    for operator, count in cursor.fetchall():
        print(f"  {operator:30} {count:8,}")
    
    # Work order statistics
    print("\n4. Work Order Statistics")
    print("-" * 60)
    
    cursor.execute("SELECT COUNT(DISTINCT work_order) FROM qc_entries WHERE work_order IS NOT NULL")
    wo_count = cursor.fetchone()[0]
    print(f"Unique work orders: {wo_count:,}")
    
    cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE work_order IS NULL")
    wo_null_count = cursor.fetchone()[0]
    if wo_null_count > 0:
        percentage = (wo_null_count / total_entries * 100) if total_entries > 0 else 0
        print(f"Entries without work order: {wo_null_count:,} ({percentage:.1f}%)")
    
    # Top work orders by entry count
    cursor.execute("""
        SELECT work_order, COUNT(*) as entry_count
        FROM qc_entries
        WHERE work_order IS NOT NULL
        GROUP BY work_order
        ORDER BY entry_count DESC
        LIMIT 10
    """)
    print("\nTop 10 work orders by entry count:")
    for wo, count in cursor.fetchall():
        print(f"  {wo:30} {count:8,}")
    
    # Department statistics
    print("\n5. Department Statistics")
    print("-" * 60)
    
    cursor.execute("SELECT department, COUNT(*) FROM qc_entries WHERE department IS NOT NULL GROUP BY department ORDER BY COUNT(*) DESC")
    dept_counts = cursor.fetchall()
    if dept_counts:
        print("Entries by department:")
        for dept, count in dept_counts:
            percentage = (count / total_entries * 100) if total_entries > 0 else 0
            print(f"  {dept:20} {count:8,} ({percentage:5.1f}%)")
    
    cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE department IS NULL")
    dept_null_count = cursor.fetchone()[0]
    if dept_null_count > 0:
        percentage = (dept_null_count / total_entries * 100) if total_entries > 0 else 0
        print(f"  {'(Unknown)':20} {dept_null_count:8,} ({percentage:5.1f}%)")
    
    # Parts and quality statistics
    print("\n6. Parts and Quality Statistics")
    print("-" * 60)
    
    cursor.execute("SELECT SUM(parts_produced), AVG(parts_produced), COUNT(*) FROM qc_entries WHERE parts_produced > 0")
    total_parts, avg_parts, entries_with_parts = cursor.fetchone()
    if total_parts:
        print(f"Total parts produced: {total_parts:,.0f}")
        print(f"Average parts per entry: {avg_parts:.1f}")
        print(f"Entries with parts: {entries_with_parts:,}")
    
    cursor.execute("SELECT SUM(defects_count), SUM(scrap_count) FROM qc_entries")
    total_defects, total_scrap = cursor.fetchone()
    if total_defects or total_scrap:
        print(f"\nTotal defects: {total_defects or 0:,}")
        print(f"Total scrap: {total_scrap or 0:,}")
        if total_parts and total_parts > 0:
            defect_rate = (total_defects / total_parts * 100) if total_defects else 0
            scrap_rate = (total_scrap / total_parts * 100) if total_scrap else 0
            print(f"Defect rate: {defect_rate:.2f}%")
            print(f"Scrap rate: {scrap_rate:.2f}%")
    
    # Time statistics
    print("\n7. Time Statistics")
    print("-" * 60)
    
    cursor.execute("SELECT SUM(total_time_minutes), AVG(total_time_minutes), COUNT(*) FROM qc_entries WHERE total_time_minutes > 0")
    total_minutes, avg_minutes, entries_with_time = cursor.fetchone()
    if total_minutes:
        total_hours = total_minutes / 60.0
        avg_hours = avg_minutes / 60.0
        print(f"Total time: {total_hours:,.1f} hours ({total_minutes:,.0f} minutes)")
        print(f"Average time per entry: {avg_hours:.2f} hours ({avg_minutes:.1f} minutes)")
        print(f"Entries with time data: {entries_with_time:,}")
    
    # Data quality validation
    print("\n8. Data Quality Validation")
    print("-" * 60)
    
    validation_issues = []
    
    # Check for missing required fields
    cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE entry_date IS NULL")
    missing_dates = cursor.fetchone()[0]
    if missing_dates > 0:
        validation_issues.append(f"  ⚠️  {missing_dates:,} entries with missing entry_date")
    else:
        print("  ✅ All entries have entry_date")
    
    # Check for entries with no operator info
    cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE operator IS NULL AND operator_id IS NULL")
    missing_operator = cursor.fetchone()[0]
    if missing_operator > 0:
        validation_issues.append(f"  ⚠️  {missing_operator:,} entries with missing operator info")
    else:
        print("  ✅ All entries have operator info")
    
    # Check for entries with no source file for Excel entries
    cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE data_source LIKE 'excel_%' AND source_file IS NULL")
    missing_source_file = cursor.fetchone()[0]
    if missing_source_file > 0:
        validation_issues.append(f"  ⚠️  {missing_source_file:,} Excel entries with missing source_file")
    else:
        print("  ✅ All Excel entries have source_file")
    
    # Check for entries with no asana_task_gid for direct input
    cursor.execute("SELECT COUNT(*) FROM qc_entries WHERE data_source = 'direct_input' AND asana_task_gid IS NULL")
    missing_task_gid = cursor.fetchone()[0]
    if missing_task_gid > 0:
        validation_issues.append(f"  ⚠️  {missing_task_gid:,} direct input entries with missing asana_task_gid")
    else:
        print("  ✅ All direct input entries have asana_task_gid")
    
    if validation_issues:
        print("\nValidation Issues:")
        for issue in validation_issues:
            print(issue)
    
    # Source metadata
    print("\n9. Import Metadata")
    print("-" * 60)
    
    cursor.execute("""
        SELECT data_source, COUNT(DISTINCT source_file) as file_count, 
               SUM(total_entries) as total_imported, MIN(imported_at), MAX(imported_at)
        FROM qc_source_metadata
        GROUP BY data_source
        ORDER BY data_source
    """)
    metadata = cursor.fetchall()
    if metadata:
        print("Import metadata by source:")
        for source, file_count, total_imported, min_import, max_import in metadata:
            print(f"  {source:20} {file_count or 0:4} files, {total_imported or 0:8,} entries")
            if min_import:
                print(f"    First import: {min_import}")
            if max_import:
                print(f"    Last import: {max_import}")
    
    # Summary
    print("\n" + "=" * 60)
    print("Validation Summary")
    print("=" * 60)
    
    if validation_issues:
        print(f"⚠️  Found {len(validation_issues)} validation issue(s) - see details above")
    else:
        print("✅ No validation issues found - database looks good!")
    
    print(f"\nDatabase location: {UNIFIED_DB_PATH}")
    print(f"Database size: {os.path.getsize(UNIFIED_DB_PATH) / (1024 * 1024):.2f} MB")
    
    conn.close()
    return len(validation_issues) == 0


if __name__ == "__main__":
    success = validate_unified_database()
    sys.exit(0 if success else 1)
