#!/usr/bin/env python3
"""
Import operators from Employees.md into the SQLite database.
Parses the markdown file and extracts operator information.
"""

import sqlite3
import json
import re
from pathlib import Path
from datetime import datetime

# Paths
WORKSPACE_ROOT = Path(__file__).parent.parent.parent
DB_PATH = WORKSPACE_ROOT / 'QC_Data' / 'databases' / 'qc_unified.db'
EMPLOYEES_MD = WORKSPACE_ROOT / 'Employees.md'

def parse_employee_line(line):
    """
    Parse a line from Employees.md to extract employee information.
    
    Example formats:
    - **Jesus Baltazar** - Operator (Assembly, Saws) | [[...]]
    - **Evelyn Barrientos** - Supervisor of Presses and Assembly | [[...]]
    - **Gary Benton** - Operator (Routers) | [[...]]
    - **Bernadino Jimenez** - Lead (Saws)
    - **David Ramirez** - Material Handler | [[...]]
    """
    # Remove markdown link at the end if present (| [[...]])
    line = re.sub(r'\s+\|\s+\[\[.*?\]\]$', '', line)
    
    # Match pattern: - **Name** - Role Info
    pattern = r'^-\s+\*\*(.+?)\*\*\s*-\s*(.+)$'
    match = re.match(pattern, line)
    
    if not match:
        return None
    
    name = match.group(1).strip()
    role_info = match.group(2).strip()
    
    # Extract role and departments
    # Patterns to match:
    # 1. "Operator (Assembly, Saws)"
    # 2. "Supervisor of Presses and Assembly"
    # 3. "Lead (Saws)"
    # 4. "Mentor (Sampling, Paint, Routers)"
    # 5. "Material Handler"
    # 6. "Operator (Sampling Department)"
    
    departments = []
    role = role_info
    
    # Try to extract departments from parentheses first
    dept_pattern = r'\(([^)]+)\)'
    dept_match = re.search(dept_pattern, role_info)
    
    if dept_match:
        # Extract departments from parentheses (comma or "and" separated)
        dept_text = dept_match.group(1)
        # Split by comma (with optional space) or "and"
        # Handle both "Assembly, Saws" and "Sampling Department"
        departments = [d.strip() for d in re.split(r',\s*|\s+and\s+', dept_text) if d.strip()]
        # Remove parentheses content from role
        role = re.sub(r'\s*\([^)]+\)', '', role_info).strip()
    else:
        # Check for "of X and Y" or "of X, Y, and Z" pattern (e.g., "Supervisor of Waterjets, Routers, and Saws")
        of_pattern = r'\sof\s+(.+)$'
        of_match = re.search(of_pattern, role_info, re.IGNORECASE)
        if of_match:
            dept_text = of_match.group(1)
            # Split by comma or "and" (handle "and" after comma)
            # Remove "and" if it appears at the end after a comma
            dept_text = re.sub(r',\s+and\s+', ', ', dept_text)
            departments = [d.strip() for d in re.split(r',\s*|\s+and\s+', dept_text) if d.strip()]
            # Remove "of X and Y" from role
            role = re.sub(r'\s+of\s+.*$', '', role_info, flags=re.IGNORECASE).strip()
    
    # Normalize role names (Title Case: capitalize first letter of each word)
    if role:
        role = ' '.join(word.capitalize() for word in role.split())
    
    # Determine primary department (first one mentioned, or None)
    primary_dept = None
    if departments:
        primary_dept = departments[0]
    
    # Normalize department names - preserve capitalization but standardize some
    # Handle variations like "WaterJets" vs "Waterjets", "assembly" vs "Assembly"
    # Note: Asana uses "Presses" (plural), "Water Jets" (two words), etc.
    dept_normalizations = {
        'assembly': 'Assembly',
        'presses': 'Presses',
        'press': 'Presses',  # Normalize singular to plural
        'routers': 'Routers',
        'saws': 'Saws',
        'waterjets': 'Water Jets',  # Normalize to match Asana department name
        'water jets': 'Water Jets',
        'mill': 'Mill',
        'sampling': 'Sampling',
        'sampling department': 'Sampling',  # Handle "Sampling Department" -> "Sampling"
        'paint': 'Paint'
    }
    
    normalized_departments = []
    for dept in departments:
        dept_lower = dept.lower().strip()
        # Check for special cases first
        if 'sampling' in dept_lower and 'department' in dept_lower:
            normalized_departments.append('Sampling')
        elif dept_lower in dept_normalizations:
            normalized_departments.append(dept_normalizations[dept_lower])
        else:
            # Capitalize first letter of each word
            normalized_departments.append(' '.join(word.capitalize() for word in dept.split()))
    
    # Normalize primary_dept as well
    if primary_dept:
        primary_lower = primary_dept.lower().strip()
        if 'sampling' in primary_lower and 'department' in primary_lower:
            primary_dept = 'Sampling'
        elif primary_lower in dept_normalizations:
            primary_dept = dept_normalizations[primary_lower]
        else:
            primary_dept = ' '.join(word.capitalize() for word in primary_dept.split())
    
    return {
        'name': name,
        'role': role,
        'primary_dept': primary_dept,
        'certified_departments': normalized_departments,
        'date_of_hire': None,  # Not available in MD file
        'pay_rate': None  # Not available in MD file
    }

def import_operators():
    """Import operators from Employees.md into the database."""
    
    if not EMPLOYEES_MD.exists():
        print(f"✗ Employees.md not found at: {EMPLOYEES_MD}")
        return
    
    # Parse the markdown file
    print(f"Reading {EMPLOYEES_MD}...")
    with open(EMPLOYEES_MD, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    operators = []
    
    for line in lines:
        line_stripped = line.strip()
        
        # Skip empty lines and headers
        if not line_stripped or line_stripped.startswith('#') or line_stripped.startswith('---') or line_stripped.startswith('>'):
            continue
        
        # Check if this is an employee line (starts with "- **")
        if line_stripped.startswith('- **'):
            employee_info = parse_employee_line(line_stripped)
            if employee_info:
                operators.append(employee_info)
                print(f"  Parsed: {employee_info['name']} - {employee_info['role']}")
                if employee_info['certified_departments']:
                    print(f"    Departments: {', '.join(employee_info['certified_departments'])}")
            else:
                print(f"  Warning: Failed to parse line: {line_stripped}")
    
    print(f"\n✓ Parsed {len(operators)} operators from Employees.md")
    
    # Import into database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        inserted = 0
        updated = 0
        
        for op in operators:
            # Check if operator already exists
            cursor.execute("SELECT id FROM operators WHERE name = ?", (op['name'],))
            existing = cursor.fetchone()
            
            # Convert certified_departments to JSON string
            certified_json = json.dumps(op['certified_departments']) if op['certified_departments'] else None
            
            if existing:
                # Update existing operator
                cursor.execute("""
                    UPDATE operators 
                    SET role = ?,
                        primary_dept = ?,
                        certified_departments = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE name = ?
                """, (
                    op['role'],
                    op['primary_dept'],
                    certified_json,
                    op['name']
                ))
                updated += 1
                print(f"  Updated: {op['name']}")
            else:
                # Insert new operator
                cursor.execute("""
                    INSERT INTO operators (
                        name, date_of_hire, pay_rate, role, 
                        primary_dept, certified_departments
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    op['name'],
                    op['date_of_hire'],
                    op['pay_rate'],
                    op['role'],
                    op['primary_dept'],
                    certified_json
                ))
                inserted += 1
                print(f"  Inserted: {op['name']}")
        
        conn.commit()
        print(f"\n✓ Import complete: {inserted} inserted, {updated} updated")
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM operators")
        total = cursor.fetchone()[0]
        print(f"  Total operators in database: {total}")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Import failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    import_operators()
