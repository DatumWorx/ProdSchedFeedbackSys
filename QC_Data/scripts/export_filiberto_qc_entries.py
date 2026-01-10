#!/usr/bin/env python3
"""
Export all QC entries for Filiberto Perez to CSV file.
"""

import sqlite3
import csv
from datetime import datetime
from pathlib import Path
from operator_mapping import get_operator_alias, INITIAL_MAPPINGS, NAME_VARIATIONS

DB_PATH = "/Users/zax/SDP/SDP Prod Mgmt Engine/qc_sheets.db"
OUTPUT_FILE = "/Users/zax/SDP/SDP Prod Mgmt Engine/Reports/Filiberto_QC_Entries_Export.csv"

def get_all_filiberto_operators():
    """Get all operator name variations that map to Filiberto."""
    filiberto_variations = set()
    
    # Check canonical name
    filiberto_variations.add("Filiberto")
    
    # Check initial mappings
    for initial, canonical in INITIAL_MAPPINGS.items():
        if canonical == "Filiberto":
            filiberto_variations.add(initial)
            filiberto_variations.add(initial.upper())
            filiberto_variations.add(initial.lower())
            filiberto_variations.add(initial.capitalize())
    
    # Check name variations
    for variation, canonical in NAME_VARIATIONS.items():
        if canonical == "Filiberto":
            filiberto_variations.add(variation)
            filiberto_variations.add(variation.upper())
            filiberto_variations.add(variation.lower())
    
    # Common variations found in data
    additional_variations = [
        "FH", "Fh", "fh", "F.H", "F,h", "F;h",
        "Filiberto", "filiberto", "FILIBERTO",
        "Z,F", "F,H", "F,H,RC"  # Group entries
    ]
    filiberto_variations.update(additional_variations)
    
    return list(filiberto_variations)

def export_filiberto_entries():
    """Export all QC entries for Filiberto to CSV."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    cursor = conn.cursor()
    
    # Get all operator variations
    filiberto_operators = get_all_filiberto_operators()
    
    print(f"Searching for Filiberto entries with operator variations: {filiberto_operators[:10]}...")
    
    # Build query - use LIKE to catch variations
    placeholders = ','.join(['?'] * len(filiberto_operators))
    
    query = f"""
        SELECT 
            id,
            source_file,
            work_order,
            customer_name,
            entry_date,
            operator,
            part_name,
            start_time,
            finish_time,
            process_time,
            total_time,
            material,
            material_size,
            total_parts,
            yield_status,
            scrap_count,
            defects_count,
            notes,
            department,
            created_at,
            updated_at
        FROM qc_entries
        WHERE operator IN ({placeholders})
           OR operator LIKE 'F%H%'
           OR operator LIKE '%Filiberto%'
           OR operator LIKE '%FH%'
        ORDER BY entry_date ASC, id ASC
    """
    
    # Execute query
    cursor.execute(query, filiberto_operators)
    rows = cursor.fetchall()
    
    print(f"\nFound {len(rows)} QC entries for Filiberto")
    
    if not rows:
        print("No entries found. Exiting.")
        conn.close()
        return
    
    # Get column names
    column_names = [description[0] for description in cursor.description]
    
    # Calculate summary statistics
    entries_with_time = sum(1 for row in rows if row['total_time'] or row['process_time'])
    entries_without_time = len(rows) - entries_with_time
    total_time = sum(row['total_time'] or row['process_time'] or 0 for row in rows)
    unique_dates = len(set(row['entry_date'] for row in rows if row['entry_date']))
    
    # Get date range
    dates = [row['entry_date'] for row in rows if row['entry_date']]
    date_range = f"{min(dates)} to {max(dates)}" if dates else "N/A"
    
    # Write to CSV
    output_path = Path(OUTPUT_FILE)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Write header
        writer.writerow(column_names)
        
        # Write data rows
        for row in rows:
            writer.writerow([row[col] for col in column_names])
    
    print(f"\n✅ Exported {len(rows)} entries to: {OUTPUT_FILE}")
    print(f"\nSummary Statistics:")
    print(f"  - Total entries: {len(rows)}")
    print(f"  - Entries with time data: {entries_with_time}")
    print(f"  - Entries without time data: {entries_without_time}")
    print(f"  - Total time (hours): {total_time:.2f}")
    print(f"  - Unique dates: {unique_dates}")
    print(f"  - Date range: {date_range}")
    
    # Show operator variations found
    operators_found = set(row['operator'] for row in rows if row['operator'])
    print(f"\nOperator variations found in data:")
    for op in sorted(operators_found):
        count = sum(1 for row in rows if row['operator'] == op)
        print(f"  - '{op}': {count} entries")
    
    conn.close()
    return len(rows)

if __name__ == "__main__":
    print("=" * 80)
    print("Filiberto QC Entries Export")
    print("=" * 80)
    export_filiberto_entries()
