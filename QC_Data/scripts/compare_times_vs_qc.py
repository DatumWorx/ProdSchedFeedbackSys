#!/usr/bin/env python3
"""
Compare times worked from Detailed CSV against QC database times.
"""

import csv
import sqlite3
from datetime import datetime
from collections import defaultdict
from operator_mapping import get_operator_alias, get_all_operator_aliases

# Database path
DB_PATH = "/Users/zax/SDP/SDP Prod Mgmt Engine/qc_sheets.db"
CSV_PATH = "/Users/zax/SDP/SDP Prod Mgmt Engine/Detailed_12-27-2025_____.csv"

def normalize_time_to_minutes(time_value):
    """
    Normalize time value to minutes.
    
    The raw database contains mixed units:
    - Values > 24 are MINUTES (e.g., 450 = 450 minutes = 7.5 hours)
    - Values <= 8 are likely HOURS (e.g., 1.75 = 1.75 hours)
    - Values 8-24 are ambiguous and require heuristics
    """
    if time_value is None or time_value <= 0:
        return None
    
    COMMON_MINUTE_VALUES = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510]
    
    if time_value > 24:
        return time_value  # Already in minutes
    
    if time_value <= 8:
        return time_value * 60.0  # Convert hours to minutes
    
    # Ambiguous range (8 < value <= 24)
    if time_value in COMMON_MINUTE_VALUES:
        return time_value  # Treat as minutes
    
    if time_value % 1 == 0 and time_value % 60 == 0:
        return time_value * 60.0  # Likely hours
    
    return time_value * 60.0  # Default: treat as hours

# Mapping from CSV employee names (Last, First) to canonical operator names
# This maps the CSV format to the operator mapping system
# Uses standardized names from operator_mapping.py
EMPLOYEE_NAME_MAPPING = {
    "Baltazar, Jesus": "Jesus Baltazar",
    "Magdaleno, Jesus": "Jesus Magdaleno",
    "Barrientos, Evelyn": "Evelyn",
    "Benton, Gary": "Gary",
    "Box, Ondray": "Ondray",
    "Cruz, Ruth": "Ruth",
    "Downard, Joe": "Joe",
    "Evanichko, Jeff": "Jeff",
    "Flores, Zulema": "Zulema",
    "Jimenez, Bernadino": "Bernie",  # Bernadino -> Bernie via NAME_VARIATIONS
    "Martinez, Zeferino": "Zeferino",
    "Membreno, Jacinta": "Carolina",  # Jacinta -> Carolina via NAME_VARIATIONS
    "Morales, Andrea": "Andrea",
    "Perez, Filiberto": "Filiberto",
    "Ramirez, David": "David",
    "Ramirez, Juana": "Juana",
    "Starkey, Kaleb": "Kaleb",
    "Willey, Heather": "Heather",
}

def parse_date(date_str):
    """Parse date string in M/D/YYYY format to YYYY-MM-DD."""
    try:
        dt = datetime.strptime(date_str.strip(), "%m/%d/%Y")
        return dt.strftime("%Y-%m-%d")
    except:
        return None

def get_csv_times():
    """Load times worked from CSV file."""
    csv_times = defaultdict(lambda: defaultdict(float))  # employee -> date -> hours
    
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            employee = row.get('Employee', '').strip()
            date_str = row.get('Date', '').strip()
            hours_str = row.get('Hours', '').strip()
            
            # Skip header rows and invalid entries
            if not employee or not date_str or date_str in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']:
                continue
            
            # Parse date
            date = parse_date(date_str)
            if not date:
                continue
            
            # Parse hours
            try:
                hours = float(hours_str) if hours_str else 0.0
            except:
                hours = 0.0
            
            # Only count positive hours (skip lunch deductions, etc.)
            if hours > 0:
                csv_times[employee][date] += hours
    
    return csv_times

def get_qc_times():
    """Load times worked from QC database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    qc_times = defaultdict(lambda: defaultdict(float))  # operator -> date -> hours
    
    # Query all entries with time data
    cursor.execute("""
        SELECT 
            entry_date,
            operator,
            total_time,
            process_time
        FROM qc_entries
        WHERE entry_date IS NOT NULL
        AND entry_date > '2000-01-01'
        AND entry_date < '2100-01-01'
        AND (total_time IS NOT NULL OR process_time IS NOT NULL)
        ORDER BY entry_date, operator
    """)
    
    for row in cursor.fetchall():
        date, operator, total_time, process_time = row
        
        if not operator or not date:
            continue
        
        # Use total_time if available, otherwise process_time
        raw_time = total_time if total_time else (process_time if process_time else None)
        
        if raw_time and raw_time > 0:
            # Normalize time to minutes, then convert to hours
            minutes = normalize_time_to_minutes(raw_time)
            if minutes:
                hours = minutes / 60.0
                
                # Normalize operator name
                normalized = get_operator_alias(operator)
                if normalized:
                    qc_times[normalized][date] += hours
    
    conn.close()
    return qc_times

def map_employee_to_operator(employee_name):
    """Map CSV employee name to canonical operator name."""
    # Direct mapping
    if employee_name in EMPLOYEE_NAME_MAPPING:
        return EMPLOYEE_NAME_MAPPING[employee_name]
    
    # Try to extract first name and map
    if ', ' in employee_name:
        last, first = employee_name.split(', ', 1)
        # Try first name directly
        normalized = get_operator_alias(first)
        if normalized:
            return normalized
    
    return None

def compare_times():
    """Compare CSV times vs QC times."""
    print("=" * 80)
    print("TIME COMPARISON: CSV vs QC Database")
    print("=" * 80)
    
    csv_times = get_csv_times()
    qc_times = get_qc_times()
    
    # Build comparison
    all_employees = set()
    all_dates = set()
    
    for emp, dates in csv_times.items():
        all_employees.add(emp)
        all_dates.update(dates.keys())
    
    for op, dates in qc_times.items():
        all_dates.update(dates.keys())
    
    # Group by employee/operator
    comparisons = []
    
    for employee in sorted(all_employees):
        operator = map_employee_to_operator(employee)
        if not operator:
            continue
        
        employee_dates = csv_times.get(employee, {})
        operator_dates = qc_times.get(operator, {})
        
        # Find overlapping dates
        common_dates = set(employee_dates.keys()) & set(operator_dates.keys())
        
        if not common_dates:
            continue
        
        for date in sorted(common_dates):
            csv_hours = employee_dates[date]
            qc_hours = operator_dates[date]
            diff = csv_hours - qc_hours
            pct_diff = (diff / csv_hours * 100) if csv_hours > 0 else 0
            
            comparisons.append({
                'employee': employee,
                'operator': operator,
                'date': date,
                'csv_hours': csv_hours,
                'qc_hours': qc_hours,
                'diff': diff,
                'pct_diff': pct_diff
            })
    
    # Print summary
    print(f"\nTotal comparisons: {len(comparisons)}")
    print(f"Date range: {min(all_dates)} to {max(all_dates)}")
    
    # Group by employee
    by_employee = defaultdict(list)
    for comp in comparisons:
        by_employee[comp['employee']].append(comp)
    
    print("\n" + "=" * 80)
    print("COMPARISON BY EMPLOYEE")
    print("=" * 80)
    
    for employee in sorted(by_employee.keys()):
        comps = by_employee[employee]
        operator = comps[0]['operator']
        
        # Get all dates for this employee/operator
        employee_dates = csv_times.get(employee, {})
        operator_dates = qc_times.get(operator, {})
        total_csv_days = len(employee_dates)
        total_qc_days = len(operator_dates)
        comparison_days = len(comps)
        days_worked_no_qc = total_csv_days - comparison_days
        
        total_csv = sum(c['csv_hours'] for c in comps)
        total_qc = sum(c['qc_hours'] for c in comps)
        total_diff = total_csv - total_qc
        avg_pct_diff = sum(abs(c['pct_diff']) for c in comps) / len(comps) if comps else 0
        
        print(f"\n{employee} ({operator}):")
        print(f"  Total CSV days (days worked): {total_csv_days}")
        print(f"  Total QC days (days with QC entries): {total_qc_days}")
        print(f"  Comparison days (overlap): {comparison_days}")
        if days_worked_no_qc > 0:
            pct_missing = (days_worked_no_qc / total_csv_days * 100) if total_csv_days > 0 else 0
            print(f"  ⚠️  Days worked but NO QC entries: {days_worked_no_qc} ({pct_missing:.1f}% of working days)")
        print(f"  Total CSV hours (comparison days only): {total_csv:.2f}")
        print(f"  Total QC hours (comparison days only): {total_qc:.2f}")
        print(f"  Difference: {total_diff:.2f} hours ({total_diff/total_csv*100:.1f}%)" if total_csv > 0 else "  Difference: N/A")
        print(f"  Average % difference: {avg_pct_diff:.1f}%")
        
        # Show dates with significant differences
        significant = [c for c in comps if abs(c['diff']) > 1.0 or abs(c['pct_diff']) > 20]
        if significant:
            print(f"  Significant differences (>1hr or >20%):")
            for c in significant[:10]:  # Show top 10
                print(f"    {c['date']}: CSV={c['csv_hours']:.2f}h, QC={c['qc_hours']:.2f}h, Diff={c['diff']:.2f}h ({c['pct_diff']:.1f}%)")
    
    # Overall statistics
    print("\n" + "=" * 80)
    print("OVERALL STATISTICS")
    print("=" * 80)
    
    all_csv_total = sum(c['csv_hours'] for c in comparisons)
    all_qc_total = sum(c['qc_hours'] for c in comparisons)
    all_diff_total = all_csv_total - all_qc_total
    
    print(f"Total CSV hours (all employees, all dates): {all_csv_total:.2f}")
    print(f"Total QC hours (all operators, all dates): {all_qc_total:.2f}")
    print(f"Total difference: {all_diff_total:.2f} hours")
    print(f"Overall % difference: {all_diff_total/all_csv_total*100:.1f}%" if all_csv_total > 0 else "N/A")
    
    # Employees with no QC data
    print("\n" + "=" * 80)
    print("EMPLOYEES WITH CSV DATA BUT NO QC MATCHES")
    print("=" * 80)
    
    for employee in sorted(all_employees):
        operator = map_employee_to_operator(employee)
        if operator and operator not in qc_times:
            csv_total = sum(csv_times[employee].values())
            print(f"{employee} ({operator}): {csv_total:.2f} hours in CSV, no QC data found")
    
    # Operators with QC data but no CSV matches
    print("\n" + "=" * 80)
    print("OPERATORS WITH QC DATA BUT NO CSV MATCHES")
    print("=" * 80)
    
    csv_operators = {map_employee_to_operator(emp) for emp in all_employees}
    csv_operators.discard(None)
    
    for operator in sorted(qc_times.keys()):
        if operator not in csv_operators:
            qc_total = sum(qc_times[operator].values())
            print(f"{operator}: {qc_total:.2f} hours in QC, no CSV match found")

if __name__ == "__main__":
    compare_times()
