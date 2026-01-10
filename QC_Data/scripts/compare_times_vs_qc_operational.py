#!/usr/bin/env python3
"""
Enhanced comparison: CSV timeclock vs QC work performed
Includes operational impact analysis for departments with multiple operators.
"""

import csv
import sqlite3
from datetime import datetime
from collections import defaultdict
from operator_mapping import get_operator_alias

DB_PATH = "/Users/zax/SDP/SDP Prod Mgmt Engine/qc_sheets.db"
CSV_PATH = "/Users/zax/SDP/SDP Prod Mgmt Engine/Detailed_12-27-2025_____.csv"

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
    "Jimenez, Bernadino": "Bernie",
    "Martinez, Zeferino": "Zeferino",
    "Membreno, Jacinta": "Carolina",
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
    """Load times worked from CSV file (timeclock data)."""
    csv_times = defaultdict(lambda: defaultdict(float))
    
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            employee = row.get('Employee', '').strip()
            date_str = row.get('Date', '').strip()
            hours_str = row.get('Hours', '').strip()
            
            if not employee or not date_str or date_str in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']:
                continue
            
            date = parse_date(date_str)
            if not date:
                continue
            
            try:
                hours = float(hours_str) if hours_str else 0.0
            except:
                hours = 0.0
            
            if hours > 0:
                csv_times[employee][date] += hours
    
    return csv_times

def get_qc_times():
    """Load times worked from QC database (actual work performed)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    qc_times = defaultdict(lambda: defaultdict(float))
    qc_by_dept = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))  # date -> dept -> operator -> hours
    
    cursor.execute("""
        SELECT 
            entry_date,
            operator,
            department,
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
        date, operator, department, total_time, process_time = row
        
        if not operator or not date:
            continue
        
        raw_time = total_time if total_time else (process_time if process_time else None)
        
        if raw_time and raw_time > 0:
            minutes = normalize_time_to_minutes(raw_time)
            if minutes:
                hours = minutes / 60.0
                
                normalized = get_operator_alias(operator)
                if normalized:
                    qc_times[normalized][date] += hours
                    if department:
                        qc_by_dept[date][department][normalized] += hours
    
    conn.close()
    return qc_times, qc_by_dept

def map_employee_to_operator(employee_name):
    """Map CSV employee name to canonical operator name."""
    if employee_name in EMPLOYEE_NAME_MAPPING:
        return EMPLOYEE_NAME_MAPPING[employee_name]
    
    if ', ' in employee_name:
        last, first = employee_name.split(', ', 1)
        normalized = get_operator_alias(first)
        if normalized:
            return normalized
    
    return None

def analyze_operational_impact(qc_by_dept):
    """Analyze operational impact: multiple operators per department per day."""
    print("\n" + "=" * 80)
    print("OPERATIONAL IMPACT ANALYSIS: Multiple Operators per Department")
    print("=" * 80)
    
    # Analyze by department
    dept_analysis = defaultdict(lambda: {
        'dates': defaultdict(set),
        'total_dates': 0,
        'dates_with_multiple_ops': 0,
        'max_operators': 0,
        'avg_operators': []
    })
    
    for date, depts in qc_by_dept.items():
        for dept, operators in depts.items():
            if len(operators) > 0:
                dept_analysis[dept]['dates'][date].update(operators.keys())
                dept_analysis[dept]['total_dates'] += 1
                if len(operators) > 1:
                    dept_analysis[dept]['dates_with_multiple_ops'] += 1
                dept_analysis[dept]['max_operators'] = max(dept_analysis[dept]['max_operators'], len(operators))
                dept_analysis[dept]['avg_operators'].append(len(operators))
    
    for dept in sorted(dept_analysis.keys()):
        data = dept_analysis[dept]
        avg_ops = sum(data['avg_operators']) / len(data['avg_operators']) if data['avg_operators'] else 0
        pct_multiple = (data['dates_with_multiple_ops'] / data['total_dates'] * 100) if data['total_dates'] > 0 else 0
        
        print(f"\n{dept}:")
        print(f"  Total dates with activity: {data['total_dates']}")
        print(f"  Dates with multiple operators: {data['dates_with_multiple_ops']} ({pct_multiple:.1f}%)")
        print(f"  Average operators per day: {avg_ops:.2f}")
        print(f"  Maximum operators (single day): {data['max_operators']}")
        
        # Show examples of days with multiple operators
        multi_op_dates = [(date, ops) for date, ops in data['dates'].items() if len(ops) > 1]
        if multi_op_dates:
            print(f"  Example dates with multiple operators:")
            for date, ops in sorted(multi_op_dates)[:5]:
                print(f"    {date}: {', '.join(sorted(ops))}")

def compare_times():
    """Compare CSV timeclock vs QC work performed."""
    print("=" * 80)
    print("TIME COMPARISON: Timeclock (CSV) vs Work Performed (QC)")
    print("=" * 80)
    print("\nKey Understanding:")
    print("  - CSV = Timeclock data (all hours worked, including breaks, setup, etc.)")
    print("  - QC = Actual work performed (production work logged in QC sheets)")
    print("  - Difference = Non-production time (setup, maintenance, breaks, admin, etc.)")
    
    csv_times = get_csv_times()
    qc_times, qc_by_dept = get_qc_times()
    
    # Build comparison
    all_employees = set()
    all_dates = set()
    
    for emp, dates in csv_times.items():
        all_employees.add(emp)
        all_dates.update(dates.keys())
    
    for op, dates in qc_times.items():
        all_dates.update(dates.keys())
    
    comparisons = []
    
    for employee in sorted(all_employees):
        operator = map_employee_to_operator(employee)
        if not operator:
            continue
        
        employee_dates = csv_times.get(employee, {})
        operator_dates = qc_times.get(operator, {})
        
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
    
    print(f"\nTotal comparisons: {len(comparisons)}")
    print(f"Date range: {min(all_dates)} to {max(all_dates)}")
    
    # Group by employee
    by_employee = defaultdict(list)
    for comp in comparisons:
        by_employee[comp['employee']].append(comp)
    
    print("\n" + "=" * 80)
    print("PER-OPERATOR PERFORMANCE ANALYSIS")
    print("=" * 80)
    print("\nThis analysis measures:")
    print("  - Timeclock hours (CSV) = Total time at work")
    print("  - Work performed hours (QC) = Actual production work logged")
    print("  - Performance Ratio = QC hours / CSV hours (higher = more productive)")
    print("  - Non-production time = CSV - QC (setup, breaks, admin, etc.)")
    
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
        performance_ratio = (total_qc / total_csv * 100) if total_csv > 0 else 0
        avg_pct_diff = sum(abs(c['pct_diff']) for c in comps) / len(comps) if comps else 0
        
        print(f"\n{employee} ({operator}):")
        print(f"  Total CSV days (days worked): {total_csv_days}")
        print(f"  Total QC days (days with QC entries): {total_qc_days}")
        print(f"  Comparison days (overlap): {comparison_days}")
        if days_worked_no_qc > 0:
            pct_missing = (days_worked_no_qc / total_csv_days * 100) if total_csv_days > 0 else 0
            print(f"  ⚠️  Days worked but NO QC entries: {days_worked_no_qc} ({pct_missing:.1f}% of working days)")
        print(f"  Total timeclock hours (comparison days only): {total_csv:.2f}")
        print(f"  Total work performed hours (comparison days only): {total_qc:.2f}")
        print(f"  Non-production time: {total_diff:.2f} hours ({total_diff/total_csv*100:.1f}%)" if total_csv > 0 else "  Non-production time: N/A")
        print(f"  Performance ratio: {performance_ratio:.1f}% (work performed / timeclock)")
        print(f"  Average daily difference: {avg_pct_diff:.1f}%")
        
        # Performance interpretation
        if performance_ratio >= 70:
            perf_status = "✅ Excellent"
        elif performance_ratio >= 50:
            perf_status = "✅ Good"
        elif performance_ratio >= 30:
            perf_status = "⚠️ Moderate"
        else:
            perf_status = "⚠️ Low"
        
        print(f"  Performance status: {perf_status}")
    
    # Overall statistics
    print("\n" + "=" * 80)
    print("OVERALL STATISTICS")
    print("=" * 80)
    
    all_csv_total = sum(c['csv_hours'] for c in comparisons)
    all_qc_total = sum(c['qc_hours'] for c in comparisons)
    all_diff_total = all_csv_total - all_qc_total
    overall_performance = (all_qc_total / all_csv_total * 100) if all_csv_total > 0 else 0
    
    print(f"Total timeclock hours: {all_csv_total:.2f}")
    print(f"Total work performed hours: {all_qc_total:.2f}")
    print(f"Total non-production time: {all_diff_total:.2f} hours")
    print(f"Overall performance ratio: {overall_performance:.1f}%")
    print(f"Overall % difference: {all_diff_total/all_csv_total*100:.1f}%" if all_csv_total > 0 else "N/A")
    
    # Operational impact analysis
    analyze_operational_impact(qc_by_dept)
    
    # Employees with no QC data
    print("\n" + "=" * 80)
    print("EMPLOYEES WITH TIMECLOCK DATA BUT NO QC WORK LOGGED")
    print("=" * 80)
    print("Note: Operator turnover may explain missing QC data after certain dates.")
    
    for employee in sorted(all_employees):
        operator = map_employee_to_operator(employee)
        if operator and operator not in qc_times:
            csv_total = sum(csv_times[employee].values())
            csv_dates = sorted(csv_times[employee].keys())
            first_date = csv_dates[0] if csv_dates else "N/A"
            last_date = csv_dates[-1] if csv_dates else "N/A"
            print(f"{employee} ({operator}): {csv_total:.2f} hours, {first_date} to {last_date}")

if __name__ == "__main__":
    compare_times()
