# QC Data Package

This folder contains all Quality Control (QC) data, analysis scripts, reports, and documentation for the SDP Production Management System.

## Structure

### `/databases`
Contains the QC database files and schema:
- `qc_unified.db` - Main unified QC database
- `qc_unified.db.backup_*` - Database backup files from various points in time
- `qc_unified_database_schema.sql` - Database schema definition

### `/scripts`
Python scripts for QC data analysis and processing:
- `analyze_qc_data.py` - General QC data analysis
- `build_qc_database.py` - Builds the QC database
- `build_unified_qc_database.py` - Builds the unified QC database
- `compare_times_vs_qc.py` - Compares time data with QC entries
- `compare_times_vs_qc_operational.py` - Operational comparison of times vs QC
- `export_filiberto_qc_entries.py` - Exports QC entries for specific operator
- `investigate_qc_entry_matching.py` - Investigates QC entry matching logic
- `validate_unified_database.py` - Validates the unified database structure

### `/reports`
QC-related analysis reports and exports:
- `QC_Report_2025.md` - Main QC report for 2025
- `QC_Report_2025 1.md` - Additional QC report variant
- `QC_ENTRY_MATCHING_INVESTIGATION.md` - Investigation report on entry matching
- `TIME_COMPARISON_CSV_VS_QC.md` - Comparison of time data (CSV) vs QC data
- `Filiberto_QC_Entries_Export.csv` - Exported QC entries for Filiberto

### `/documentation`
QC system documentation and specifications:
- `02 - Quality Control (QC) System Index.md` - Main QC system index/overview
- `qc_app_schema.md` - QC application schema documentation
- `QC_DATA_ANALYSIS_SPECIFICATION.md` - Specification for QC data analysis
- `QC_DATABASE_README.md` - Database documentation
- `QC_DATE_PARSING_FIX.md` - Documentation on date parsing fixes
- `qc_matching_investigation_report.txt` - Text report on QC matching investigation

## Usage

### Running Analysis Scripts

Most scripts are located in the `/scripts` directory. To run them, navigate to the project root and execute:

```bash
python QC_Data/scripts/script_name.py
```

### Accessing the Database

The main database file is located at:
```
QC_Data/databases/qc_unified.db
```

### Reading Reports

All QC reports are in Markdown format (except CSV exports) and can be viewed in any Markdown viewer or text editor.

## Notes

- Database backups are preserved to allow rollback if needed
- All scripts assume they are run from the project root directory
- Report files may reference paths relative to the original project structure
