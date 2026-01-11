#!/usr/bin/env python3
"""Quick script to verify operators in the database."""

import sqlite3
import json
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).parent.parent.parent
DB_PATH = WORKSPACE_ROOT / 'QC_Data' / 'databases' / 'qc_unified.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT name, role, primary_dept, certified_departments, date_of_hire, pay_rate
    FROM operators
    ORDER BY name
""")

print("=" * 80)
print("OPERATORS DATABASE - VERIFICATION")
print("=" * 80)
print()

for row in cursor.fetchall():
    name, role, primary_dept, certified_json, date_of_hire, pay_rate = row
    certified = json.loads(certified_json) if certified_json else []
    
    print(f"Name: {name}")
    print(f"  Role: {role or 'N/A'}")
    print(f"  Primary Dept: {primary_dept or 'N/A'}")
    print(f"  Certified Departments: {', '.join(certified) if certified else 'None'}")
    print(f"  Date of Hire: {date_of_hire or 'Not set'}")
    print(f"  Pay Rate: {pay_rate or 'Not set'}")
    print()

cursor.execute("SELECT COUNT(*) FROM operators")
total = cursor.fetchone()[0]
print(f"Total operators: {total}")

conn.close()
