# Quality Control (QC) System Index

#qc #quality-control #index #system

> **QC Documentation Hub**: All quality control-related documentation in one place

## Core QC Documentation

### Schema & Database
- [[qc_app_schema]] - QC application schema and requirements
- [[QC_DATABASE_README]] - QC database documentation
- [[QC_DATA_ANALYSIS_SPECIFICATION]] - QC data analysis specifications
- [[QC_DATE_PARSING_FIX]] - Date parsing fixes and improvements

### Reporting
- [[OBSIDIAN_REPORTING_GUIDE]] - Obsidian reporting system guide
- [[REPORTING_QUICK_START]] - Quick start guide for reporting
- [[Reports/README]] - Reports directory index

---

## QC Data Flow

### Hierarchy
```
Operators → Leads → Supervisor → Production Manager
```

**Reference**: [[SDP_Production_Summary#QC Data Flow]]

### Data Types
- Start/Mid/Stop timestamps
- Parts produced counts
- Downtime categories (machine, material shortage, training, etc.)
- Defects and scrap counts
- Setup and changeover times
- Issue/delay notes
- Operator PPM (Parts Per Minute) actual

---

## QC Reports

### Main Reports
- [[Reports/QC_Report_2025]] - 2025 QC comprehensive report
- [[Reports/Analysis_Report_2025]] - 2025 analysis report
- [[Reports/DETAILED_TIME_COMPARISON_REPORT]] - Detailed time comparison

### Analysis Reports
- [[Reports/WORK_LOGGING_GAP_ANALYSIS]] - Work logging gap analysis
- [[Reports/OPERATOR_MISATTRIBUTION_ANALYSIS]] - Operator misattribution analysis
- [[Reports/DATA_ENTRY_ERRORS_ANALYSIS]] - Data entry errors analysis
- [[Reports/DATE_STANDARDIZATION_REPORT]] - Date standardization report
- [[Reports/ILLOGICAL_DATA_REVIEW_2025-12-23]] - Illogical data review

### Employee Reports
- [[Reports/Clean]] - Clean employee reports directory
- [[Reports/Raw]] - Raw employee reports directory
- See [[Employees]] for employee list

---

## QC Processes

### Entry Process
1. **Operators**: Log QC data (start/mid/stop times, counts, defects)
2. **Leads**: Review and ensure accuracy
3. **Supervisor**: Conduct 1st checks, enforce mid/final QC checks
4. **Production Manager**: Review for performance and improvement actions

**Reference**: [[SDP_Role_Context]] for role-specific QC responsibilities

### Quality Checks
- **Start Check**: Initial quality verification
- **Mid Check**: Mid-production quality check
- **Final Check**: Final quality verification before completion

**Reference**: [[SDP_Production_Summary#OEE & Loss Categories]]

---

## QC Metrics & KPIs

### Key Metrics
- **QC Completion Rate**: % of tasks with complete QC data
- **Operator PPM**: Actual parts per minute
- **% Productive Time**: Actual vs Ideal
- **Defect Rate**: Defects per parts produced
- **Scrap Rate**: Scrap per parts produced

**Reference**: [[SDP_Production_Summary#KPI & Capacity Dashboards]]

### OEE Categories
- Unplanned Stops
- Planned Stops
- Small Stops
- Slow Cycles
- Production Defects

**Reference**: [[SDP_Production_Summary#OEE & Loss Categories]]

---

## Database & Data Management

### Database Structure
- **Main Table**: `qc_entries` - QC entry data with cleaned/standardized fields
- **Summary Tables**: `operator_stats`, `work_order_summary`, `daily_summary`

**Reference**: [[OBSIDIAN_REPORTING_GUIDE#Database Schema]]

### Data Standardization
- Operator names standardized
- Time converted to minutes
- Utilization calculated (450-minute standard shift)
- Date standardization

**Reference**: [[QC_DATE_PARSING_FIX]] and [[Reports/DATE_STANDARDIZATION_REPORT]]

---

## Reporting System

### Obsidian Reports
- **Generated Reports**: Markdown files with Mermaid charts
- **Database**: `qc_cleaned_2025.db` - Cleaned SQLite database
- **Scripts**: `build_cleaned_database.py`, `generate_obsidian_report.py`

**Reference**: [[OBSIDIAN_REPORTING_GUIDE]]

### Report Sections
- Executive Summary
- Overview Statistics
- Top Operators
- Top Work Orders
- Top Customers
- Department Statistics
- Daily Trends (Mermaid charts)
- Utilization Distribution (pie chart)
- Yield Analysis

**Reference**: [[OBSIDIAN_REPORTING_GUIDE#Report Sections]]

---

## Testing & Validation

### Testing Reports
- [[Testing_Reports/README]] - Testing reports index
- [[Testing_Reports/Database_Comparison_Report]] - Database comparison
- [[Testing_Reports/Clean_vs_Raw_Comparison_Findings]] - Clean vs raw comparison
- [[Testing_Reports/Before_Fix_Examples]] - Before fix examples
- [[Testing_Reports/After_Fix_Examples]] - After fix examples

---

## Related Documentation

### System Overview
- [[SDP_Production_Summary]] - Complete system overview
- [[SDP_Role_Context]] - Role definitions and QC responsibilities
- [[integrated_production_app_v1]] - Build plan including QC application

### Utilization & Performance
- [[UTILIZATION_ASSESSMENT_README]] - Utilization assessment
- [[UTILIZATION_REPORTING_README]] - Utilization reporting
- [[Reports/Utilization/Utilization_Assessment_2025]] - 2025 utilization assessment

---

## Quick Reference

### QC Entry Requirements
- Start/Mid/Stop timestamps
- Parts produced counts
- Defects and scrap counts (if applicable)
- Downtime categories (if applicable)
- Issue/delay notes (if applicable)

### Data Quality
- Standardized operator names
- Valid dates
- Time in minutes
- Calculated utilization percentages

---

**Navigation**: Return to [[00 - MOC (Map of Content)]] | See [[SDP_Production_Summary]] for system overview

**Last Updated**: 2025-01-27

