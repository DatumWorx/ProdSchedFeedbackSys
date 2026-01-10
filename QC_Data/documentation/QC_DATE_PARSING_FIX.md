# QC Sheet Date Parsing Fix

## Issue Summary

The time comparison reports were only showing results until July 2025, despite the database containing entries through December 2025. Investigation revealed that:

1. **Excel Format Change**: Around July 2025, the QC sheet Excel files changed format
2. **Date Parsing Gap**: The database builder (`build_qc_database.py`) was not handling Excel serial number dates (floats)
3. **Data Loss**: When `openpyxl` reads dates with `data_only=True`, if cells aren't formatted as dates in Excel, they're returned as floats (Excel serial numbers)
4. **Result**: Rows with date values as floats were being skipped entirely, causing missing data

## Root Cause

The date parsing logic in `build_qc_database.py` only handled:
- `datetime` objects
- `date` objects  
- `string` dates

It did **NOT** handle:
- `float` values (Excel serial numbers)

When Excel files changed format around July, dates started being stored/read as serial numbers instead of formatted date values, causing those rows to be skipped.

## Fix Applied

Added handling for Excel serial number dates in `build_qc_database.py`:

```python
elif isinstance(date_val, (int, float)):
    # Handle Excel serial number dates
    # Excel epoch: December 30, 1899
    excel_epoch = date(1899, 12, 30)
    days = int(date_val)
    entry_date = excel_epoch + timedelta(days=days)
    # Validate the date is reasonable (between 2000 and 2100)
    if entry_date.year < 2000 or entry_date.year > 2100:
        entry_date = None  # Skip invalid dates
```

## Database Issues Found

The existing database contains some incorrectly parsed dates:
- `1900-01-07` (from "GE PO 390338640.xlsx")
- `2925-02-28` (from "Richfield 61311.xlsx")
- `2925-04-30` (from "VCI-SC PO 300183.xlsx")
- `2925-11-15` (from "Precision MHE PO 26752.xlsx" - 115 entries affected)

These dates are filtered out by the comparison script's date range filter (`entry_date > '2000-01-01' AND entry_date < '2100-01-01'`), but they indicate the parsing issue existed before.

## Next Steps

1. **Rebuild the Database**: Run `build_qc_database.py` to re-import all QC sheets with the fixed date parsing
2. **Verify Results**: Check that dates after July 2025 are now properly imported
3. **Clean Bad Data**: Consider removing or correcting the incorrectly parsed dates (1900, 2925) from the database

## Testing

To verify the fix works:

```sql
-- Check date range after rebuild
SELECT MIN(entry_date) as min_date, MAX(entry_date) as max_date, COUNT(*) 
FROM qc_entries 
WHERE entry_date IS NOT NULL 
AND entry_date >= '2000-01-01' 
AND entry_date < '2100-01-01';

-- Check for entries after July 2025
SELECT COUNT(*) 
FROM qc_entries 
WHERE entry_date >= '2025-07-09' 
AND entry_date < '2100-01-01';
```

## Files Modified

- `build_qc_database.py`: Added Excel serial number date handling (lines 227-251)
