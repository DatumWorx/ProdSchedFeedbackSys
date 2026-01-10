# QC Data Analysis Specification

## Overview

This document captures the complete specification for QC (Quality Control) data analysis and utilization reporting. The system generates operator utilization reports from the past 30 days of QC data, showing shift utilization percentages based on a 450-minute standard shift.

## Report Purpose

Generate utilization reports for operators showing:
- Shift utilization percentages
- Daily work patterns
- Performance metrics
- Distribution analysis

## Standard Shift Definition

- **Standard Shift Duration**: 450 minutes (7.5 hours)
- **Utilization Calculation**: `(actual_minutes / 450) * 100`

## Data Sources

### Input Files

- **Format**: CSV files
- **Naming Convention**: `{OperatorName}_qc_entries_30days.csv`
- **Location**: Same directory as the reporting script
- **Character Handling**: Operator names are sanitized by replacing spaces and slashes with underscores

### CSV File Structure

Each CSV file contains QC entries with the following fields:

| Field Name | Type | Description |
|------------|------|-------------|
| `total_time_minutes` | Float | Total time worked in minutes for the entry |
| `parts` | Float/Integer | Number of parts processed |
| `work_date` | String | Date of the work entry (YYYY-MM-DD format) |
| `shift_utilization_pct` | String | Utilization percentage as string (e.g., "63.33%") |

## Operators Tracked

The system tracks the following operators:

1. Bernardino
2. Caleb
3. Carolina
4. David
5. Eric
6. Evelyn
7. Filiberto
8. Gary
9. Heather
10. Jeff
11. Jesus
12. Joe
13. Juana
14. Lisandro
15. Marissa
16. Rut
17. Temp
18. Zulema

## Operator Names and Aliases

QC sheets contain many variations of operator names. The system uses a mapping system to standardize these variations to canonical operator names.

### Known Operators (Canonical Names)

The following are the standardized operator names used in the system:

- Andrea
- Bernardino
- Carolina
- Cesar
- Dani
- David
- Eric
- Eva
- Evelyn
- Filiberto
- Gary
- Heather
- Hector
- Ibis
- Irma
- Isidro
- Jesus
- Joe
- Juana
- Kaleb
- Larry
- Maia
- Maria
- Marissa
- Michelle
- Mike Archer
- Nova
- Ondray
- Rafael
- Ruth
- Will
- Zach
- Zeferino
- Zulema

### Common Initials and Aliases

The following mappings are used to standardize operator name variations found in QC sheets:

#### Initials to Full Names

| Initials | Full Name | Notes |
|----------|-----------|-------|
| Mm | Maria | |
| Is | Isidro | |
| Ic | Isidro | Variant |
| Zb | Zulema | |
| Zm | Zulema | Variant |
| Z | Zulema | Note: "Z" is Zach, not Zulema (Zach always writes full name) |
| Zf | Zeferino | |
| Z,f | Zulema and Filiberto | Variant with punctuation |
| Jc | Jesus | |
| Je | Jesus | Variant |
| Jm | Jesus | Variant |
| Jb | Jesus | Variant |
| Bj | Bernardino | |
| Ea | Evelyn | |
| Eve | Evelyn | Variant |
| Rm | Ruth | |
| Rrm | Ruth | Variant |
| Rut | Ruth | Variant |
| Rc | Rafael | |
| Re | Rafael | Variant |
| R,c | Rafael | Variant with punctuation |
| Fh | Filiberto | |
| F.h | Filiberto | Variant with punctuation |
| F;h | Filiberto | Variant with punctuation |
| F,h | Filiberto | Variant with punctuation |
| fh | Filiberto | Lowercase variant |
| f.h | Filiberto | Lowercase variant |
| f;h | Filiberto | Lowercase variant |
| f,h | Filiberto | Lowercase variant |
| Gb | Gary | |
| Ks | Kaleb | |
| Ep | Eric | |
| Wl | Will | |
| Lf | Larry | |
| N | Nova | |
| Ivi | Ibis | |
| Zule | Zulema | |
| Dr | David | |
| Ma | Mike Archer | |
| C | Cesar | |
| Cj | Cesar | Variant |
| Em | Zulema | Based on context in data |

#### Common Name Variations

| Variation | Standardized Name |
|-----------|-------------------|
| Garry | Gary |
| Miche | Michelle |
| Michelee | Michelle |
| Michhe | Michelle |
| Iirma | Irma |
| Irm | Irma |
| Sulema | Zulema |

### Multiple Operator Entries

When multiple operators work together, entries may appear in various formats:

- **Separator Formats**: Uses `+`, `/`, `,`, `-`, `&` as separators
- **Examples**:
  - `Bj+Jc` → "Bernardino + Others"
  - `Irma+3` → "Irma + Others" (3 additional operators)
  - `Maria, Ibis, Zulema` → "Maria + Others"
  - `Ea-jc` → "Evelyn + Others"
  - `Jesus,gary` → "Jesus + Others"

### Common Multiple Operator Patterns

| Pattern | Standardized | Notes |
|---------|--------------|-------|
| `Bj+Jc` | Bernardino + Others | |
| `Bj+jc+zf` | Bernardino + Others | |
| `Irma+3` | Irma + Others | Number indicates additional operators |
| `Mm+2` | Maria + Others | |
| `Ea+1` | Evelyn + Others | |
| `Jesus +2` | Jesus + Others | |
| `Zf +1` | Zeferino + Others | |
| `Is, Mm` | Isidro + Others | Comma separator |
| `Evelyn-zulema` | Evelyn + Others | Dash separator |
| `Michelle/ivy/ruth` | Michelle + Others | Slash separator |
| `Eva & Michelle` | Eva + Others | Ampersand separator |

### Special Cases

1. **"Jc"**: Maps to "Jesus", not "Carolina" (despite "Jc" potentially being Carolina's initials, historical data shows "Jc" refers to Jesus).

2. **"Bj"**: Maps to "Bernardino", not "Bernie" (though "Bernie" may be used in some contexts).

3. **"Ma"**: Maps to "Mike Archer", a specific operator name.

4. **Number Suffixes**: Patterns like `+3`, `+2`, `+1` indicate additional operators beyond the named one. These are standardized to "Operator + Others".

### Operator Name Standardization Process

The system uses the following process to standardize operator names:

1. **Direct Mapping**: Check if the raw name exists in the mapping table
2. **Case-Insensitive Matching**: Match variations like "Garry" → "Gary"
3. **Initial Expansion**: Expand initials using the initial mappings table
4. **Multiple Operator Parsing**: Parse entries with multiple operators and standardize to "PrimaryOperator + Others"
5. **Fuzzy Matching**: Attempt fuzzy matching with known operator names

### Non-Operator Entries

The following patterns are **NOT** operators and should be filtered out:

- Part descriptions: "Assembly", "Die:2935", "Cut Down To 5\""
- Measurements: ".125\" Over", "1.25\" Thickness Needed"
- Process types: "Deburr", "Press", "Saw Down To 1 Inch"
- Material specifications: "Used 3\" Sheet", "1.25\" Sheet Used"
- Department names: "Press", "Saws", "Routers", "Waterjets"
- Other data: "Top Half", "Bottom Half", "Psa", "Upsi 108031"

### Operator Alias Database Structure

The system maintains an `operator_aliases` table with the following structure:

- **raw_name**: Operator name as it appears in QC sheets (e.g., "Mm", "Bj+Jc")
- **alias**: Standardized alias for querying (e.g., "Maria", "Bernardino + Others")
- **is_primary**: Boolean indicating if this is the primary alias for the operator
- **confidence**: Enum ('high', 'medium', 'low') indicating confidence in the mapping

### Complete Mapping Reference

For a complete list of all operator name mappings found in QC sheets, refer to the `operator_mapping.json` file, which contains:

- **mappings**: All raw name to alias mappings (182+ mappings)
- **known_operators**: List of all known canonical operator names
- **initial_mappings**: Initial to full name mappings
- **needs_review**: Entries that require manual review (often non-operators)

### Usage in Reporting

When generating reports:

1. **Raw Names Preserved**: Original operator names from QC sheets are preserved in `operator_raw` field
2. **Alias Lookup**: Reports use aliases for grouping and aggregation
3. **Backward Compatibility**: The `operator` column mirrors `operator_raw` for compatibility
4. **Views**: Database views provide both raw and alias columns for flexibility

## Data Processing Logic

### Data Parsing Functions

#### `parse_float(value)`
- **Purpose**: Parse float values from CSV entries
- **Handling**: 
  - Empty strings → 0.0
  - None values → 0.0
  - Invalid values → 0.0

#### `parse_utilization_pct(value)`
- **Purpose**: Parse utilization percentage from string format
- **Input Format**: String like "63.33%"
- **Output**: Float value (e.g., 63.33)
- **Handling**: 
  - Empty strings → None
  - Invalid values → None

### Statistics Calculation

#### Core Metrics

For each operator, the system calculates:

1. **Total Entries**: Count of all QC entries
2. **Total Minutes**: Sum of all `total_time_minutes` values
3. **Total Hours**: `total_minutes / 60`
4. **Total Parts**: Sum of all `parts` values
5. **Days Worked**: Count of unique dates with minutes > 0

#### Utilization Metrics

1. **Average Utilization**: Mean of all entry-level utilization percentages
   - Formula: `sum(utilization_values) / count(utilization_values)`
   - Where each utilization = `(entry_minutes / 450) * 100`

2. **Minimum Utilization**: Lowest utilization percentage across all entries

3. **Maximum Utilization**: Highest utilization percentage across all entries

4. **Average Daily Utilization**: Mean utilization calculated per day worked
   - Groups entries by `work_date`
   - Calculates daily total minutes
   - Formula: `(daily_minutes / 450) * 100` per day
   - Average of all daily utilizations

#### Utilization Distribution

Counts entries falling into utilization ranges:

- **Under 50%**: Entries with utilization < 50%
- **50-100%**: Entries with utilization >= 50% and < 100%
- **100-110%**: Entries with utilization >= 100% and < 110%
- **Over 110%**: Entries with utilization >= 110%

### Daily Data Grouping

Entries are grouped by `work_date` with the following aggregations:
- **Daily Minutes**: Sum of minutes for that date
- **Daily Entries**: Count of entries for that date
- **Daily Parts**: Sum of parts for that date

## Report Sections

### 1. Utilization Summary

**Purpose**: Overview of all operators' utilization metrics

**Columns**:
- Operator
- Days Worked
- Total Hours
- Avg Util % (average utilization across all entries)
- Min Util % (minimum utilization)
- Max Util % (maximum utilization)
- Avg Daily Util % (average of daily utilization percentages)
- Entries (total number of QC entries)

**Sorting**: By operator name (as listed in OPERATORS array)

### 2. Utilization Distribution

**Purpose**: Show distribution of utilization percentages across entry ranges

**Columns**:
- Operator
- < 50% (count of entries)
- 50-100% (count of entries)
- 100-110% (count of entries)
- > 110% (count of entries)
- Total Entries

**Note**: Based on individual entries, not daily totals

### 3. Top Operators by Total Hours

**Purpose**: Highlight top performers by total hours worked

**Columns**:
- Operator
- Days (days worked)
- Total Hours
- Avg Util % (average utilization)
- Avg Daily Util % (average daily utilization)
- Entries (total entries)
- Parts (total parts processed, formatted with commas)

**Sorting**: 
- Descending by total hours
- Limited to top 10 operators

## Data Validation

### Missing Data Handling

- **Missing CSV Files**: Operator shows as 0 days worked, 0.0 hours, N/A for all percentages
- **Empty Entries**: Treated as 0 minutes, 0 parts
- **Invalid Dates**: Entries without valid dates are still counted in totals but not in daily calculations
- **Zero Minutes**: Entries with 0 minutes are not included in utilization calculations

### Error Handling

- **File Read Errors**: Logged to console, operator data returns empty list
- **Invalid Float Values**: Default to 0.0
- **Invalid Percentage Strings**: Return None, excluded from utilization calculations

## Output Format

### Display Options

The system supports two output formats:

1. **Tabulated Format** (if `tabulate` library is available)
   - Uses `tablefmt='grid'`
   - Right-aligned numbers
   - Professional table appearance

2. **Simple Format** (fallback)
   - Pipe-separated columns
   - Fixed-width columns
   - Basic text alignment

### Report Header

```
====================================================================================================
Operator Utilization Report - Past 30 Days
====================================================================================================
Report Generated: YYYY-MM-DD HH:MM:SS
Standard Shift: 450 minutes (7.5 hours)
====================================================================================================
```

### Report Footer

```
====================================================================================================
Report Complete
====================================================================================================
```

## Implementation Notes

### Dependencies

- **Required**: Python 3, csv module, collections.defaultdict, datetime
- **Optional**: `tabulate` library for enhanced table formatting

### File Structure

```
utilization_report_30days.py
├── OPERATORS list (operator names)
├── parse_float() function
├── parse_utilization_pct() function
├── load_operator_data() function
├── calculate_utilization_stats() function
└── main() function
```

### Key Algorithms

1. **Data Loading**: 
   - Iterate through OPERATORS list
   - Load corresponding CSV file for each operator
   - Parse CSV using csv.DictReader

2. **Statistics Calculation**:
   - Group entries by date
   - Calculate entry-level and daily-level metrics
   - Aggregate totals and averages
   - Count distribution buckets

3. **Report Generation**:
   - Generate summary table for all operators
   - Generate distribution table
   - Sort and filter top 10 operators
   - Format and display tables

## Data Flow

```
CSV Files → Load Data → Parse Entries → Calculate Statistics → Generate Reports → Display Tables
```

## Future Enhancements

Potential improvements for the reporting system:

1. **Date Range Selection**: Allow custom date ranges instead of fixed 30 days
2. **Export Options**: CSV, Excel, PDF export capabilities
3. **Visualizations**: Charts and graphs for utilization trends
4. **Comparative Analysis**: Compare operators, time periods, or shifts
5. **Alerting**: Flag operators below threshold utilization
6. **Historical Trends**: Track utilization over time
7. **Shift Analysis**: Separate analysis for different shift types
8. **Part Type Breakdown**: Utilization by part type or category

## Integration Points

When moving this to another application, consider:

1. **Data Source**: Replace CSV file loading with database queries or API calls
2. **Operator Management**: Make operator list configurable/dynamic
3. **Configuration**: Externalize standard shift duration (450 minutes)
4. **Caching**: Implement caching for frequently accessed data
5. **Real-time Updates**: Consider streaming data updates
6. **Authentication**: Add user access controls
7. **Scheduling**: Automated report generation
8. **Notifications**: Email or dashboard notifications for reports

## Calculation Examples

### Example 1: Entry-Level Utilization

- Entry has 300 minutes
- Utilization = (300 / 450) * 100 = 66.67%

### Example 2: Daily Utilization

- Day has 3 entries: 200, 250, 300 minutes
- Daily total = 750 minutes
- Daily utilization = (750 / 450) * 100 = 166.67%

### Example 3: Average Utilization

- 5 entries with utilizations: 50%, 60%, 70%, 80%, 90%
- Average = (50 + 60 + 70 + 80 + 90) / 5 = 70%

## Data Quality Considerations

1. **Completeness**: Ensure all operators have corresponding CSV files
2. **Consistency**: Verify date formats are consistent
3. **Accuracy**: Validate that minutes don't exceed reasonable limits
4. **Timeliness**: Ensure data is current (30-day window)
5. **Duplicates**: Check for duplicate entries in source data
