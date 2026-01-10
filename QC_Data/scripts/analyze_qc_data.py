#!/usr/bin/env python3
"""
SDP QC Data Analysis Tool
Provides various analysis queries on the QC database.
"""

import sqlite3
import sys
from datetime import datetime
from collections import Counter

DB_PATH = "/Users/zax/SDP/SDP Prod Mgmt Engine/qc_sheets.db"

def get_connection():
    """Get database connection."""
    return sqlite3.connect(DB_PATH)

def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)

def basic_stats():
    """Print basic database statistics."""
    conn = get_connection()
    cursor = conn.cursor()
    
    print_section("Basic Statistics")
    
    # Total entries
    cursor.execute("SELECT COUNT(*) FROM qc_entries")
    total = cursor.fetchone()[0]
    print(f"Total QC Entries: {total:,}")
    
    # Date range
    cursor.execute("""
        SELECT MIN(entry_date), MAX(entry_date) 
        FROM qc_entries 
        WHERE entry_date IS NOT NULL 
        AND entry_date > '2000-01-01'
        AND entry_date < '2100-01-01'
    """)
    date_range = cursor.fetchone()
    if date_range[0] and date_range[1]:
        print(f"Date Range: {date_range[0]} to {date_range[1]}")
    
    # Unique counts
    cursor.execute("SELECT COUNT(DISTINCT operator) FROM qc_entries WHERE operator IS NOT NULL")
    operators = cursor.fetchone()[0]
    print(f"Unique Operators: {operators}")
    
    cursor.execute("SELECT COUNT(DISTINCT work_order) FROM qc_entries WHERE work_order IS NOT NULL")
    work_orders = cursor.fetchone()[0]
    print(f"Unique Work Orders: {work_orders}")
    
    cursor.execute("SELECT COUNT(DISTINCT customer_name) FROM qc_entries WHERE customer_name IS NOT NULL")
    customers = cursor.fetchone()[0]
    print(f"Unique Customers: {customers}")
    
    cursor.execute("SELECT COUNT(DISTINCT department) FROM qc_entries WHERE department IS NOT NULL")
    departments = cursor.fetchone()[0]
    print(f"Unique Departments: {departments}")
    
    conn.close()

def top_operators():
    """Show top operators by entry count."""
    conn = get_connection()
    cursor = conn.cursor()
    
    print_section("Top 20 Operators by Entry Count")
    
    cursor.execute("""
        SELECT operator, COUNT(*) as count, 
               SUM(total_parts) as total_parts,
               COUNT(DISTINCT work_order) as work_orders
        FROM qc_entries
        WHERE operator IS NOT NULL
        GROUP BY operator
        ORDER BY count DESC
        LIMIT 20
    """)
    
    print(f"{'Operator':<20} {'Entries':<10} {'Total Parts':<15} {'Work Orders':<12}")
    print("-" * 60)
    for row in cursor.fetchall():
        operator, count, parts, wos = row
        parts_str = f"{parts:,}" if parts else "N/A"
        print(f"{operator:<20} {count:<10} {parts_str:<15} {wos:<12}")
    
    conn.close()

def top_customers():
    """Show top customers by entry count."""
    conn = get_connection()
    cursor = conn.cursor()
    
    print_section("Top 20 Customers by Entry Count")
    
    cursor.execute("""
        SELECT customer_name, COUNT(*) as count,
               COUNT(DISTINCT work_order) as work_orders,
               SUM(total_parts) as total_parts
        FROM qc_entries
        WHERE customer_name IS NOT NULL
        GROUP BY customer_name
        ORDER BY count DESC
        LIMIT 20
    """)
    
    print(f"{'Customer':<30} {'Entries':<10} {'Work Orders':<12} {'Total Parts':<15}")
    print("-" * 70)
    for row in cursor.fetchall():
        customer, count, wos, parts = row
        parts_str = f"{parts:,}" if parts else "N/A"
        customer_display = customer[:28] if customer else "Unknown"
        print(f"{customer_display:<30} {count:<10} {wos:<12} {parts_str:<15}")
    
    conn.close()

def department_stats():
    """Show statistics by department."""
    conn = get_connection()
    cursor = conn.cursor()
    
    print_section("Statistics by Department")
    
    cursor.execute("""
        SELECT department,
               COUNT(*) as entries,
               COUNT(DISTINCT operator) as operators,
               COUNT(DISTINCT work_order) as work_orders,
               SUM(total_parts) as total_parts,
               AVG(total_parts) as avg_parts
        FROM qc_entries
        WHERE department IS NOT NULL
        GROUP BY department
        ORDER BY entries DESC
    """)
    
    print(f"{'Department':<15} {'Entries':<10} {'Operators':<10} {'Work Orders':<12} {'Total Parts':<15} {'Avg Parts':<12}")
    print("-" * 75)
    for row in cursor.fetchall():
        dept, entries, ops, wos, parts, avg_parts = row
        parts_str = f"{int(parts):,}" if parts else "N/A"
        avg_str = f"{avg_parts:.1f}" if avg_parts else "N/A"
        print(f"{dept:<15} {entries:<10} {ops:<10} {wos:<12} {parts_str:<15} {avg_str:<12}")
    
    conn.close()

def yield_analysis():
    """Analyze yield, scrap, and defects."""
    conn = get_connection()
    cursor = conn.cursor()
    
    print_section("Yield Analysis")
    
    # Total entries with yield status
    cursor.execute("""
        SELECT yield_status, COUNT(*) as count, 
               SUM(scrap_count) as total_scrap,
               SUM(defects_count) as total_defects,
               SUM(total_parts) as total_parts
        FROM qc_entries
        WHERE yield_status IS NOT NULL
        GROUP BY yield_status
        ORDER BY count DESC
    """)
    
    print(f"{'Yield Status':<20} {'Count':<10} {'Total Scrap':<15} {'Total Defects':<15} {'Total Parts':<15}")
    print("-" * 75)
    for row in cursor.fetchall():
        status, count, scrap, defects, parts = row
        scrap_str = f"{int(scrap):,}" if scrap else "0"
        defects_str = f"{int(defects):,}" if defects else "0"
        parts_str = f"{int(parts):,}" if parts else "N/A"
        print(f"{status:<20} {count:<10} {scrap_str:<15} {defects_str:<15} {parts_str:<15}")
    
    # Overall scrap/defect rate
    cursor.execute("""
        SELECT 
            COUNT(*) as total_entries,
            SUM(CASE WHEN yield_status = 'SCRAP' THEN 1 ELSE 0 END) as scrap_entries,
            SUM(CASE WHEN yield_status = 'DEFECT' THEN 1 ELSE 0 END) as defect_entries,
            SUM(total_parts) as total_parts,
            SUM(scrap_count) as total_scrap,
            SUM(defects_count) as total_defects
        FROM qc_entries
        WHERE total_parts IS NOT NULL
    """)
    
    row = cursor.fetchone()
    if row and row[0]:
        total_entries, scrap_entries, defect_entries, total_parts, total_scrap, total_defects = row
        if total_parts:
            scrap_rate = (total_scrap or 0) / total_parts * 100
            defect_rate = (total_defects or 0) / total_parts * 100
            print(f"\nOverall Scrap Rate: {scrap_rate:.2f}%")
            print(f"Overall Defect Rate: {defect_rate:.2f}%")
    
    conn.close()

def time_analysis():
    """Analyze time-based metrics."""
    conn = get_connection()
    cursor = conn.cursor()
    
    print_section("Time Analysis")
    
    # Average process time and total time
    cursor.execute("""
        SELECT 
            AVG(process_time) as avg_process_time,
            AVG(total_time) as avg_total_time,
            SUM(total_time) as total_hours,
            COUNT(*) as entries_with_time
        FROM qc_entries
        WHERE (process_time IS NOT NULL OR total_time IS NOT NULL)
    """)
    
    row = cursor.fetchone()
    if row:
        avg_process, avg_total, total_hours, count = row
        if avg_process:
            print(f"Average Process Time: {avg_process:.2f} hours")
        if avg_total:
            print(f"Average Total Time: {avg_total:.2f} hours")
        if total_hours:
            print(f"Total Hours Logged: {total_hours:.2f} hours ({total_hours/8:.1f} days)")
        print(f"Entries with Time Data: {count:,}")
    
    # Parts per hour analysis
    cursor.execute("""
        SELECT 
            AVG(CAST(total_parts AS FLOAT) / NULLIF(total_time, 0)) as avg_parts_per_hour,
            AVG(CAST(total_parts AS FLOAT) / NULLIF(process_time, 0)) as avg_parts_per_process_hour
        FROM qc_entries
        WHERE total_parts IS NOT NULL 
        AND (total_time > 0 OR process_time > 0)
    """)
    
    row = cursor.fetchone()
    if row and row[0]:
        parts_per_hour, parts_per_process = row
        if parts_per_hour:
            print(f"Average Parts per Hour: {parts_per_hour:.2f}")
        if parts_per_process:
            print(f"Average Parts per Process Hour: {parts_per_process:.2f}")
    
    conn.close()

def recent_activity():
    """Show recent QC activity."""
    conn = get_connection()
    cursor = conn.cursor()
    
    print_section("Recent Activity (Last 20 Entries)")
    
    cursor.execute("""
        SELECT entry_date, operator, part_name, work_order, 
               total_parts, department, yield_status
        FROM qc_entries
        WHERE entry_date IS NOT NULL
        AND entry_date > '2000-01-01'
        AND entry_date < '2100-01-01'
        ORDER BY entry_date DESC, id DESC
        LIMIT 20
    """)
    
    print(f"{'Date':<12} {'Operator':<15} {'Part':<20} {'WO':<15} {'Parts':<8} {'Dept':<12} {'Yield':<10}")
    print("-" * 95)
    for row in cursor.fetchall():
        date, op, part, wo, parts, dept, yield_stat = row
        part_display = (part[:18] + "..") if part and len(part) > 20 else (part or "N/A")
        wo_display = wo[:13] if wo else "N/A"
        parts_str = str(parts) if parts else "N/A"
        dept_display = dept or "N/A"
        yield_display = yield_stat or "OK"
        print(f"{date:<12} {op or 'N/A':<15} {part_display:<20} {wo_display:<15} {parts_str:<8} {dept_display:<12} {yield_display:<10}")
    
    conn.close()

def custom_query(query):
    """Execute a custom SQL query."""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        
        # Print header
        print("\n" + " | ".join(columns))
        print("-" * (len(" | ".join(columns)) + 10))
        
        # Print rows
        for row in rows:
            print(" | ".join(str(val) if val is not None else "NULL" for val in row))
        
        print(f"\n{len(rows)} rows returned")
        
    except Exception as e:
        print(f"Error executing query: {e}")
    finally:
        conn.close()

def main():
    """Main function."""
    if len(sys.argv) > 1:
        if sys.argv[1] == "query" and len(sys.argv) > 2:
            # Custom query mode
            query = " ".join(sys.argv[2:])
            custom_query(query)
            return
        elif sys.argv[1] == "help":
            print("""
SDP QC Data Analysis Tool

Usage:
  python3 analyze_qc_data.py              - Run all standard analyses
  python3 analyze_qc_data.py query <SQL> - Execute custom SQL query
  python3 analyze_qc_data.py help        - Show this help

Available tables:
  - qc_entries: Main QC data table
  - qc_files: File import metadata

Example custom query:
  python3 analyze_qc_data.py query "SELECT * FROM qc_entries WHERE operator = 'JE' LIMIT 10"
            """)
            return
    
    # Run all standard analyses
    basic_stats()
    top_operators()
    top_customers()
    department_stats()
    yield_analysis()
    time_analysis()
    recent_activity()
    
    print("\n" + "=" * 60)
    print("Analysis Complete!")
    print("=" * 60)
    print("\nTo run custom queries, use:")
    print("  python3 analyze_qc_data.py query \"SELECT ... FROM qc_entries WHERE ...\"")

if __name__ == "__main__":
    main()
