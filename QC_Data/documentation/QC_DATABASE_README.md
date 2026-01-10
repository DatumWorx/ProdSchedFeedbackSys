# SDP QC Sheets Database

## Overview

This database contains all QC (Quality Control) sheet data imported from Excel files in the OneDrive QC FORMS directory. The database enables efficient querying and analysis of production QC data.

## Database Location

**Database File**: `qc_sheets.db` (SQLite format)

## Import Summary

- **Total Files Processed**: 985 Excel files
- **Successfully Imported**: 982 files
- **Failed Imports**: 3 files
- **Total QC Entries**: 4,216 entries
- **Unique Operators**: 301
- **Unique Work Orders**: 270
- **Unique Customers**: Various

## Database Schema

### Table: `qc_entries`

Main table containing all QC entry data.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| source_file | TEXT | Original Excel filename |
| work_order | TEXT | Work order/PO number |
| customer_name | TEXT | Customer name |
| entry_date | DATE | Date of QC entry |
| operator | TEXT | Operator code/name |
| part_name | TEXT | Part name/number |
| start_time | TIME | Start time |
| finish_time | TIME | Finish time |
| process_time | REAL | Process time in hours |
| total_time | REAL | Total time in hours |
| material | TEXT | Material used |
| material_size | TEXT | Material size |
| total_parts | INTEGER | Total parts produced |
| yield_status | TEXT | Yield status (SCRAP, DEFECT, etc.) |
| scrap_count | INTEGER | Number of scrapped parts |
| defects_count | INTEGER | Number of defective parts |
| notes | TEXT | Additional notes |
| department | TEXT | Department (WaterJet, Router, Saw, Press, Assembly) |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Record update timestamp |

### Table: `qc_files`

Metadata about imported files.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| filename | TEXT | Excel filename (unique) |
| file_path | TEXT | Full file path |
| file_size | INTEGER | File size in bytes |
| last_modified | TIMESTAMP | File modification time |
| total_entries | INTEGER | Number of entries imported |
| imported_at | TIMESTAMP | Import timestamp |
| import_status | TEXT | 'success' or 'error' |
| error_message | TEXT | Error message if import failed |

## Indexes

The following indexes are created for performance:
- `idx_entry_date` - On entry_date
- `idx_operator` - On operator
- `idx_part_name` - On part_name
- `idx_work_order` - On work_order
- `idx_department` - On department
- `idx_source_file` - On source_file

## Usage

### Rebuilding the Database

To rebuild the database from scratch:

```bash
cd "/Users/zax/SDP/SDP Prod Mgmt Engine"
python3 build_qc_database.py
```

This will:
1. Delete the existing database (if present)
2. Scan the QC FORMS directory for Excel files
3. Parse each file and import QC entries
4. Generate import statistics

### Running Analysis

Use the analysis script to explore the data:

```bash
python3 analyze_qc_data.py
```

This provides:
- Basic statistics
- Top operators by entry count
- Top customers
- Department statistics
- Yield analysis (scrap/defects)
- Time analysis
- Recent activity

### Custom SQL Queries

You can run custom SQL queries:

```bash
python3 analyze_qc_data.py query "SELECT * FROM qc_entries WHERE operator = 'JE' LIMIT 10"
```

Or use SQLite directly:

```bash
sqlite3 qc_sheets.db
```

Example queries:

```sql
-- Find all entries for a specific operator
SELECT * FROM qc_entries WHERE operator = 'JE' ORDER BY entry_date DESC;

-- Calculate total parts by department
SELECT department, SUM(total_parts) as total_parts
FROM qc_entries
WHERE department IS NOT NULL
GROUP BY department;

-- Find entries with scrap
SELECT entry_date, operator, part_name, total_parts, scrap_count
FROM qc_entries
WHERE scrap_count > 0
ORDER BY entry_date DESC;

-- Average parts per hour by operator
SELECT operator, 
       AVG(CAST(total_parts AS FLOAT) / NULLIF(total_time, 0)) as parts_per_hour
FROM qc_entries
WHERE total_parts IS NOT NULL AND total_time > 0
GROUP BY operator
ORDER BY parts_per_hour DESC;
```

## Data Quality Notes

- Some entries may have missing or incomplete data
- Date range includes some outliers (dates before 2000 or after 2100 should be filtered)
- Department detection is based on operator codes and part names - may not be 100% accurate
- Work order extraction from filenames uses pattern matching - some may be missed

## Files

- `build_qc_database.py` - Script to build/rebuild the database
- `analyze_qc_data.py` - Analysis and query tool
- `qc_sheets.db` - SQLite database file
- `QC_DATABASE_README.md` - This file

## Future Enhancements

Potential improvements:
- Add data validation and cleaning
- Improve department detection accuracy
- Add more sophisticated analysis functions
- Create visualization scripts
- Add export functionality (CSV, Excel)
- Implement incremental updates (only import new/changed files)
