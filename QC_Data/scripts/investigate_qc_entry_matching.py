#!/usr/bin/env python3
"""
Investigation Report: QC Entry Matching Analysis
Proves or disproves whether operators have logged more QC entries than are being matched.
"""

import sqlite3
from collections import defaultdict
from datetime import datetime
from operator_mapping import get_operator_alias, get_all_operator_aliases

DB_PATH = "/Users/zax/SDP/SDP Prod Mgmt Engine/qc_sheets.db"

# Operators of interest (those with low comparison days)
INVESTIGATION_OPERATORS = {
    "Zulema": ["Zulema", "Zulema Flores"],
    "Jesus Magdaleno": ["Jesus Magdaleno", "Magdaleno, Jesus"],
    "Carolina": ["Carolina", "Jacinta", "Jacinta Membreno", "Membreno, Jacinta"],
    "Filiberto": ["Filiberto", "Filiberto Perez", "Perez, Filiberto"],
    "Kaleb": ["Kaleb", "Kaleb Starkey", "Starkey, Kaleb"],
}

def normalize_time_to_minutes(time_value):
    """Normalize time value to minutes."""
    if time_value is None or time_value <= 0:
        return None
    
    COMMON_MINUTE_VALUES = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510]
    
    if time_value > 24:
        return time_value
    if time_value <= 8:
        return time_value * 60.0
    if time_value in COMMON_MINUTE_VALUES:
        return time_value
    if time_value % 1 == 0 and time_value % 60 == 0:
        return time_value * 60.0
    return time_value * 60.0

def get_all_raw_operator_names():
    """Get all unique raw operator names from QC database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT DISTINCT operator
        FROM qc_entries
        WHERE operator IS NOT NULL
        ORDER BY operator
    """)
    
    raw_operators = {}
    for row in cursor.fetchall():
        raw_name = row[0]
        if raw_name:
            standardized = get_operator_alias(raw_name)
            raw_operators[raw_name] = standardized
    
    conn.close()
    return raw_operators

def find_potential_matches(raw_operators, search_terms):
    """Find raw operator names that might match search terms."""
    matches = []
    search_lower = [term.lower() for term in search_terms]
    
    for raw_name, standardized in raw_operators.items():
        raw_lower = raw_name.lower()
        # Check if any search term appears in the raw name
        for term in search_lower:
            if term in raw_lower or raw_lower in term:
                matches.append((raw_name, standardized))
                break
    
    return matches

def analyze_operator_qc_entries(operator_canonical, search_terms):
    """Analyze all QC entries for an operator."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all aliases for this operator
    aliases = get_all_operator_aliases(operator_canonical)
    
    # Query 1: Entries that match via standardization
    # Get all aliases and check if operator maps to our canonical name
    cursor.execute("""
        SELECT 
            entry_date,
            operator,
            total_time,
            process_time,
            department,
            work_order
        FROM qc_entries
        WHERE operator IS NOT NULL
        AND entry_date IS NOT NULL
        AND entry_date > '2000-01-01'
        AND entry_date < '2100-01-01'
        ORDER BY entry_date
    """)
    
    all_entries = cursor.fetchall()
    standardized_entries = []
    for entry in all_entries:
        date, operator, total_time, process_time, department, work_order = entry
        if operator:
            mapped = get_operator_alias(operator)
            if mapped == operator_canonical:
                standardized_entries.append((date, operator, mapped, total_time, process_time, department, work_order))
    
    # Query 2: Entries with raw names that match aliases
    placeholders = ','.join(['?' for _ in aliases])
    cursor.execute(f"""
        SELECT 
            entry_date,
            operator,
            total_time,
            process_time,
            department,
            work_order
        FROM qc_entries
        WHERE operator IN ({placeholders})
        AND entry_date IS NOT NULL
        AND entry_date > '2000-01-01'
        AND entry_date < '2100-01-01'
        ORDER BY entry_date
    """, aliases)
    
    raw_matched = cursor.fetchall()
    raw_matched_entries = []
    for entry in raw_matched:
        date, operator, total_time, process_time, department, work_order = entry
        mapped = get_operator_alias(operator) if operator else None
        raw_matched_entries.append((date, operator, mapped, total_time, process_time, department, work_order))
    
    # Query 3: Group entries that might contain this operator
    group_patterns = []
    for alias in aliases:
        if len(alias) >= 2:
            group_patterns.append(f"%{alias}%")
    
    if group_patterns:
        # Build LIKE conditions
        like_conditions = ' OR '.join(['operator LIKE ?' for _ in group_patterns])
        cursor.execute(f"""
            SELECT 
                entry_date,
                operator,
                total_time,
                process_time,
                department,
                work_order
            FROM qc_entries
            WHERE ({like_conditions})
            AND (operator LIKE '%+%' OR operator LIKE '%,%' OR operator LIKE '%/%' OR operator LIKE '%-%')
            AND entry_date IS NOT NULL
            AND entry_date > '2000-01-01'
            AND entry_date < '2100-01-01'
            ORDER BY entry_date
        """, group_patterns)
        
        group_raw = cursor.fetchall()
        group_entries = []
        for entry in group_raw:
            date, operator, total_time, process_time, department, work_order = entry
            mapped = get_operator_alias(operator) if operator else None
            group_entries.append((date, operator, mapped, total_time, process_time, department, work_order))
    else:
        group_entries = []
    
    # Query 4: Find all raw operator names that contain search terms (potential unmapped entries)
    search_matches = []
    for term in search_terms:
        cursor.execute("""
            SELECT DISTINCT operator
            FROM qc_entries
            WHERE operator LIKE ?
            AND entry_date IS NOT NULL
            AND entry_date > '2000-01-01'
            AND entry_date < '2100-01-01'
        """, (f'%{term}%',))
        
        for row in cursor.fetchall():
            raw_name = row[0]
            if raw_name and raw_name not in [m[0] for m in search_matches]:
                std_name = get_operator_alias(raw_name)
                search_matches.append((raw_name, std_name))
    
    conn.close()
    
    return {
        'standardized_entries': standardized_entries,
        'raw_matched_entries': raw_matched_entries,
        'group_entries': group_entries,
        'search_matches': search_matches
    }

def calculate_hours_and_days(entries):
    """Calculate total hours and unique days from entries."""
    total_hours = 0
    unique_dates = set()
    
    for entry in entries:
        # Entry format: (date, operator, standardized, total_time, process_time, department, work_order)
        if len(entry) == 7:
            date, _, _, total_time, process_time, _, _ = entry
        else:
            # Fallback for different entry formats
            date = entry[0]
            total_time = entry[3] if len(entry) > 3 else None
            process_time = entry[4] if len(entry) > 4 else None
        
        if date:
            unique_dates.add(date)
        
        raw_time = total_time if total_time else (process_time if process_time else None)
        if raw_time and raw_time > 0:
            minutes = normalize_time_to_minutes(raw_time)
            if minutes:
                total_hours += minutes / 60.0
    
    return total_hours, len(unique_dates), sorted(unique_dates)

def generate_investigation_report():
    """Generate comprehensive investigation report."""
    print("=" * 100)
    print("QC ENTRY MATCHING INVESTIGATION REPORT")
    print("=" * 100)
    print("\nPurpose: Prove or disprove whether operators have logged more QC entries")
    print("         than are being matched in the time comparison analysis.")
    print("\nDate:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("\n" + "=" * 100)
    
    # Get all raw operator names for reference
    all_raw_operators = get_all_raw_operator_names()
    print(f"\nTotal unique raw operator names in database: {len(all_raw_operators)}")
    
    for operator_canonical, search_terms in INVESTIGATION_OPERATORS.items():
        print("\n" + "=" * 100)
        print(f"OPERATOR: {operator_canonical}")
        print("=" * 100)
        print(f"Search terms: {', '.join(search_terms)}")
        
        # Analyze entries
        analysis = analyze_operator_qc_entries(operator_canonical, search_terms)
        
        # Calculate statistics for standardized entries
        std_hours, std_days, std_dates = calculate_hours_and_days(analysis['standardized_entries'])
        
        # Calculate statistics for raw matched entries
        raw_hours, raw_days, raw_dates = calculate_hours_and_days(analysis['raw_matched_entries'])
        
        # Calculate statistics for group entries
        group_hours, group_days, group_dates = calculate_hours_and_days(analysis['group_entries'])
        
        print(f"\n--- STANDARDIZED ENTRIES (operator_standardized = '{operator_canonical}') ---")
        print(f"  Total entries: {len(analysis['standardized_entries'])}")
        print(f"  Total hours: {std_hours:.2f}")
        print(f"  Unique dates: {std_days}")
        if std_dates:
            print(f"  Date range: {std_dates[0]} to {std_dates[-1]}")
        
        # Show unique raw names that map to this operator
        unique_raw_names = set()
        for entry in analysis['standardized_entries']:
            unique_raw_names.add(entry[1])  # entry[1] is the raw operator name
        print(f"  Unique raw operator names mapped: {len(unique_raw_names)}")
        if unique_raw_names:
            print(f"  Raw names: {', '.join(sorted(unique_raw_names)[:20])}")
            if len(unique_raw_names) > 20:
                print(f"  ... and {len(unique_raw_names) - 20} more")
        
        print(f"\n--- RAW MATCHED ENTRIES (via aliases) ---")
        print(f"  Total entries: {len(analysis['raw_matched_entries'])}")
        print(f"  Total hours: {raw_hours:.2f}")
        print(f"  Unique dates: {raw_days}")
        
        print(f"\n--- GROUP ENTRIES (containing this operator) ---")
        print(f"  Total entries: {len(analysis['group_entries'])}")
        print(f"  Total hours: {group_hours:.2f}")
        print(f"  Unique dates: {group_days}")
        if analysis['group_entries']:
            print(f"  Example group entries:")
            for entry in analysis['group_entries'][:10]:
                date, raw, std, _, _, dept, wo = entry
                print(f"    {date}: '{raw}' → '{std}' (Dept: {dept}, WO: {wo})")
            if len(analysis['group_entries']) > 10:
                print(f"    ... and {len(analysis['group_entries']) - 10} more")
        
        print(f"\n--- POTENTIAL UNMAPPED ENTRIES (fuzzy search) ---")
        print(f"  Found {len(analysis['search_matches'])} raw operator names containing search terms:")
        for raw_name, std_name in sorted(analysis['search_matches']):
            if std_name != operator_canonical:
                print(f"    '{raw_name}' → currently mapped to '{std_name}'")
                # Check if this should map to our operator
                test_mapping = get_operator_alias(raw_name)
                if test_mapping != operator_canonical and test_mapping:
                    print(f"      ⚠️  Maps to '{test_mapping}' instead of '{operator_canonical}'")
        
        # Summary
        print(f"\n--- SUMMARY ---")
        print(f"  Standardized entries: {std_days} days, {std_hours:.2f} hours")
        print(f"  Group entries: {group_days} days, {group_hours:.2f} hours")
        print(f"  Total potential days: {std_days + group_days} days")
        print(f"  Total potential hours: {std_hours + group_hours:.2f} hours")
        
        # Check for date gaps
        all_dates = set(std_dates) | set(group_dates)
        if all_dates:
            sorted_dates = sorted(all_dates)
            print(f"\n  Date coverage: {sorted_dates[0]} to {sorted_dates[-1]}")
            print(f"  Total unique dates with any entry: {len(all_dates)}")
    
    # Overall summary
    print("\n" + "=" * 100)
    print("OVERALL SUMMARY")
    print("=" * 100)
    
    total_std_days = 0
    total_std_hours = 0
    total_group_days = 0
    total_group_hours = 0
    
    for operator_canonical, search_terms in INVESTIGATION_OPERATORS.items():
        analysis = analyze_operator_qc_entries(operator_canonical, search_terms)
        std_hours, std_days, _ = calculate_hours_and_days(analysis['standardized_entries'])
        group_hours, group_days, _ = calculate_hours_and_days(analysis['group_entries'])
        
        total_std_days += std_days
        total_std_hours += std_hours
        total_group_days += group_days
        total_group_hours += group_hours
    
    print(f"\nTotal standardized entries across all operators:")
    print(f"  Days: {total_std_days}")
    print(f"  Hours: {total_std_hours:.2f}")
    
    print(f"\nTotal group entries across all operators:")
    print(f"  Days: {total_group_days}")
    print(f"  Hours: {total_group_hours:.2f}")
    
    print(f"\nTotal potential (standardized + group):")
    print(f"  Days: {total_std_days + total_group_days}")
    print(f"  Hours: {total_std_hours + total_group_hours:.2f}")
    
    print("\n" + "=" * 100)
    print("CONCLUSION")
    print("=" * 100)
    print("\nThis report shows:")
    print("1. All QC entries that are currently matched to each operator (standardized)")
    print("2. Group entries that might contain work by these operators")
    print("3. Potential unmapped entries that might belong to these operators")
    print("\nCompare these numbers to the 'comparison days' in the time comparison report")
    print("to determine if there are missing matches.")

if __name__ == "__main__":
    generate_investigation_report()
