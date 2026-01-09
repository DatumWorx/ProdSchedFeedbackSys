# Asana Custom Fields Review

**Date**: 2025-01-27  
**Purpose**: Review all Asana custom fields for name and value changes, inconsistencies, and missing definitions

## Summary

This document reviews all Asana custom field references across the codebase to identify:
- Name discrepancies
- GID mismatches
- Missing field definitions in constants
- Fields used in code but not documented
- Fields documented but not in constants

---

## Custom Fields in Constants (`lib/constants.ts`)

### Currently Defined Fields

| Constant Name | Field Name (Asana) | GID | Type | Status |
|--------------|-------------------|-----|------|--------|
| `PROD_DEPT` | Prod Dept | `1210998867548457` | enum | ✅ Verified |
| `TOTAL_TIME` | Total Time | `1211050097902110` | number | ✅ Verified |
| `SCHEDULED_PPM` | Scheduled PPM | `1211333073103705` | number | ✅ Verified |
| `QTY_PARTS` | Qty Parts | `1211521540574994` | number | ✅ Verified |
| `SHIFTS` | Shifts | `1211050228588906` | number | ✅ Verified |
| `PICK_LIST` | Pick List | `1210985723045923` | text | ✅ Verified |
| `EST_START_DATE` | Est Start Date | `1211594523120745` | date | ✅ Verified |
| `EST_DUE_DATE` | Est Due Date | `1211594524354161` | date | ✅ Verified |
| `PROCESS_TIME` | Process Time (Minutes Decimal) | `1212346791922304` | number | ✅ Verified |

**Note**: All GIDs match documentation in `asana_to_cursor/custom_fields.md`

---

## Custom Fields Documented but NOT in Constants

### Production Tracking Fields (Used by ProductionData)

| Field Name | GID | Type | Used In Code | Should Add? |
|-----------|-----|------|--------------|-------------|
| **Actual PPM** | `1211333010718834` | number | Referenced in docs, SDPContext | ⚠️ Consider |
| **Productivity** | `1211049984069827` | number | Referenced in docs, SDPContext | ⚠️ Consider |
| **Percentage Complete** | `1211673243352085` | number | Referenced in docs, SDPContext | ⚠️ Consider |
| **Job Started** | *Unknown GID* | date/timestamp | Referenced in SDPContext | ❓ Need GID |

**Analysis**: These fields are referenced in documentation and SDPContext files but not currently used in Scheduler2.0 code. They are used by ProductionData tool. Consider adding if Scheduler2.0 needs to read these values.

### Material Management Fields

| Field Name | GID | Type | Used In Code | Should Add? |
|-----------|-----|------|--------------|-------------|
| **Material ETA** | `1211672583413996` | date | Referenced in docs only | ❌ Not needed |
| **Material Release Date** | `1211672583413994` | date | Referenced in docs only | ❌ Not needed |

**Analysis**: These fields are documented but not used in Scheduler2.0. They're part of material management workflow, not scheduling.

### Other Documented Fields

| Field Name | GID | Type | Used In Code | Should Add? |
|-----------|-----|------|--------------|-------------|
| **Productivity Level** | `1211045079573156` | enum | Referenced in docs only | ❌ Not needed |
| **Week of Month** | `1211620141144998` | multi_enum | Referenced in docs only | ❌ Not needed |
| **Priority Level** | `1209787164865143` | enum | Referenced in docs only | ❌ Not needed |
| **Minutes Available** | `1211740930099678` | number | Referenced in docs only | ❌ Not needed |

**Analysis**: These are planning/status fields not used in scheduling calculations.

---

## Field Name Consistency Check

### Name Format Comparison

| Constants Name | Asana Field Name (docs) | Code Usage | Status |
|---------------|------------------------|-----------|--------|
| `EST_START_DATE` | Est Start Date | Used by GID only | ✅ OK |
| `EST_DUE_DATE` | Est Due Date | Used by GID only | ✅ OK |
| `PROD_DEPT` | Prod Dept | Used by GID only | ✅ OK |
| `TOTAL_TIME` | Total Time | Used by GID only | ✅ OK |
| `SCHEDULED_PPM` | Scheduled PPM | Used by GID only | ✅ OK |
| `QTY_PARTS` | Qty Parts | Used by GID only | ✅ OK |
| `SHIFTS` | Shifts | Used by GID only | ✅ OK |
| `PICK_LIST` | Pick List | Used by GID only | ✅ OK |
| `PROCESS_TIME` | Process Time (Minutes Decimal) | Used by GID only | ✅ OK |

**Analysis**: All fields are accessed by GID in code, so name format differences don't cause issues. The constant names use underscores (snake_case) which is standard for constants, while Asana field names use spaces and title case.

---

## Field Name Usage in Code

### Fields Accessed by Name (Not GID)

**Python Backend** (`python-backend/api_wrapper.py`, `python-backend/utils.py`):
- `"Prod Dept"` - Used in config, accessed by name
- `"Total Time"` - Used in config, accessed by name

**TypeScript/JavaScript** (`components/POSearchTab.tsx`):
- `"Total Time"` - Accessed by name: `getCustomFieldNumber(task, 'Total Time')`
- `"Qty Parts"` - Accessed by name: `getCustomFieldNumber(task, 'Qty Parts')`
- `"Shifts"` - Accessed by name: `getCustomFieldNumber(task, 'Shifts')`
- `"Prod Dept"` - Accessed by name: `getCustomFieldByValue(task, 'Prod Dept')`

**Analysis**: These name-based lookups are fallback methods. The code should prefer GID-based lookups for reliability, but name-based lookups work as fallback.

---

## GID Validation

### All GIDs Match Documentation ✅

All custom field GIDs in `lib/constants.ts` match the GIDs documented in `asana_to_cursor/custom_fields.md`:

- ✅ `PROD_DEPT`: `1210998867548457` matches docs
- ✅ `TOTAL_TIME`: `1211050097902110` matches docs
- ✅ `SCHEDULED_PPM`: `1211333073103705` matches docs
- ✅ `QTY_PARTS`: `1211521540574994` matches docs
- ✅ `SHIFTS`: `1211050228588906` matches docs
- ✅ `PICK_LIST`: `1210985723045923` matches docs
- ✅ `EST_START_DATE`: `1211594523120745` matches docs
- ✅ `EST_DUE_DATE`: `1211594524354161` matches docs
- ✅ `PROCESS_TIME`: `1212346791922304` - **Note**: Not in custom_fields.md table, but documented in code comment

---

## Missing Field: Process Time

**Issue**: `PROCESS_TIME` GID `1212346791922304` is defined in constants but **not listed in the main custom_fields.md table**.

**Status**: ⚠️ Documentation Gap

**Recommendation**: Add Process Time to `asana_to_cursor/custom_fields.md`:

```markdown
| **Process Time** | `1212346791922304` | number | Process time per part in minutes (decimal) |
```

---

## Field Value Changes

### No Value Changes Detected ✅

All custom field GIDs are consistent across:
- `lib/constants.ts`
- `asana_to_cursor/custom_fields.md`
- Code usage (API routes, components)
- Python backend config

**No discrepancies found in field values or GIDs.**

---

## Recommendations

### 1. Add Missing Documentation
- [ ] Add `PROCESS_TIME` field to `asana_to_cursor/custom_fields.md` main table

### 2. Consider Adding Production Tracking Fields (Optional)
If Scheduler2.0 needs to read production tracking data:
- [ ] Add `ACTUAL_PPM` constant: `1211333010718834`
- [ ] Add `PRODUCTIVITY` constant: `1211049984069827`
- [ ] Add `PERCENTAGE_COMPLETE` constant: `1211673243352085`
- [ ] Find and add `JOB_STARTED` GID if needed

**Note**: Only add these if Scheduler2.0 will read these values. Currently they're only written by ProductionData.

### 3. Standardize Field Access (Optional)
- [ ] Consider updating `POSearchTab.tsx` to use GID constants instead of field names for more reliable lookups
- [ ] Python backend already supports both GID and name-based lookups (good)

### 4. Add Comments to Constants
- [ ] Add field type comments to `CUSTOM_FIELDS` object for clarity:
  ```typescript
  export const CUSTOM_FIELDS = {
    PROD_DEPT: '1210998867548457', // enum
    TOTAL_TIME: '1211050097902110', // number
    // etc.
  };
  ```

---

## Summary of Findings

### ✅ No Critical Issues Found
- All GIDs match between code and documentation
- All field names are consistent (format differences are cosmetic)
- No value changes detected

### ⚠️ Minor Issues
1. **Process Time missing from docs**: GID `1212346791922304` not in custom_fields.md table
2. **Production tracking fields**: Documented but not in constants (may be intentional if not used)

### 📝 Recommendations
1. Add Process Time to documentation
2. Consider adding production tracking fields if needed for future features
3. Optional: Standardize field access patterns

---

## Field Usage Matrix

| Field | In Constants | In Docs | Used in Code | Status |
|-------|--------------|---------|--------------|--------|
| Prod Dept | ✅ | ✅ | ✅ | Complete |
| Total Time | ✅ | ✅ | ✅ | Complete |
| Scheduled PPM | ✅ | ✅ | ✅ | Complete |
| Qty Parts | ✅ | ✅ | ✅ | Complete |
| Shifts | ✅ | ✅ | ✅ | Complete |
| Pick List | ✅ | ✅ | ✅ | Complete |
| Est Start Date | ✅ | ✅ | ✅ | Complete |
| Est Due Date | ✅ | ✅ | ✅ | Complete |
| Process Time | ✅ | ⚠️ Partial | ✅ | Needs doc update |
| Actual PPM | ❌ | ✅ | ❌ | Not used in Scheduler2.0 |
| Productivity | ❌ | ✅ | ❌ | Not used in Scheduler2.0 |
| Percentage Complete | ❌ | ✅ | ❌ | Not used in Scheduler2.0 |

---

*Review completed: 2025-01-27*

