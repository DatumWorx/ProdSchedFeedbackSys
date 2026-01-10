# Time Comparison: CSV vs QC Database

**Date:** 2025-12-27  
**Analysis:** Comparison of times worked from Detailed CSV against QC database entries

---

## Executive Summary

- **Total CSV hours:** 2,512.31 hours
- **Total QC hours:** 2,367.66 hours  
- **Overall difference:** 144.65 hours (5.8% higher in CSV)
- **Total comparisons:** 295 date-employee pairs

The overall difference is relatively small (5.8%), suggesting the two systems are generally aligned. However, there are significant individual discrepancies that warrant investigation.

---

## Key Findings

### 1. Overall Alignment ✅

The two systems show reasonable alignment at the aggregate level:
- CSV shows 5.8% more hours overall
- This suggests most time is being captured in both systems

### 2. Individual Employee Discrepancies ⚠️

Several employees show significant differences between CSV and QC data:

| Employee | CSV Hours | QC Hours | Difference | % Diff |
|----------|-----------|----------|------------|--------|
| **Evelyn Barrientos** | 259.78 | 127.00 | +132.78 | +51.1% |
| **Gary Benton** | 348.53 | 205.24 | +143.29 | +41.1% |
| **Ruth Cruz** | 482.54 | 713.74 | -231.20 | -47.9% |
| **Zulema Flores** | 77.13 | 30.16 | +46.97 | +60.9% |
| **Bernadino Jimenez** | 369.95 | 256.84 | +113.11 | +30.6% |
| **Jesus Magdaleno** | 65.45 | 32.93 | +32.52 | +49.7% |
| **David Ramirez** | 813.53 | 958.34 | -144.81 | -17.8% |
| **Kaleb Starkey** | 69.79 | 35.15 | +34.64 | +49.6% |

**Observations:**
- Most employees show CSV hours > QC hours (suggesting not all time worked is logged in QC)
- Ruth Cruz and David Ramirez show QC hours > CSV hours (suggesting possible double-counting or operator misattribution in QC)

### 3. Employees Missing QC Data ❌

The following employees have CSV time entries but no matching QC data:

| Employee | CSV Hours | Operator Code | Notes |
|----------|-----------|---------------|-------|
| **Ondray Box** | 218.21 | Ondray | No QC entries found |
| **Cesar Carbajar** | 176.56 | Cesar | No QC entries found |
| **Joe Downard** | 727.46 | Joe | No QC entries found |
| **Jeff Evanichko** | 2,323.21 | Jeff | No QC entries found |
| **Marissa Merrell** | 579.17 | Marissa | No QC entries found |
| **Andrea Morales** | 264.70 | Andrea | No QC entries found |
| **Juana Ramirez** | 443.46 | Juana | No QC entries found |
| **Heather Willey** | 411.61 | Heather | No QC entries found |

**Total missing QC hours:** 4,725.38 hours

**Possible reasons:**
- These employees may not log QC entries (e.g., supervisors, material handlers)
- Operator codes may not match between systems
- QC entries may use different name formats

### 4. Operators with QC Data but No CSV Matches ⚠️

The following operators have QC entries but no matching CSV time entries:

| Operator | QC Hours | Notes |
|----------|----------|-------|
| **Jesus** (ambiguous) | 439.15 | Could be Jesus Baltazar or Jesus Magdaleno |
| **Mike Archer** | 726.17 | Not in CSV employee list |
| **Rafael** | 483.87 | Not in CSV employee list |
| **Filiberto + Others** | 481.45 | Group entries |
| **Bernie + Others** | 510.99 | Group entries |
| **Irma + Others** | 223.92 | Group entries |
| **Maria + Others** | 185.10 | Group entries |
| **Evelyn + Others** | 73.82 | Group entries |

**Total unmatched QC hours:** ~3,000+ hours

**Possible reasons:**
- Group entries ("+ Others") can't be matched to individual CSV entries
- Some operators may not be in the CSV (contractors, temps)
- Name mapping issues between systems

---

## Detailed Analysis by Employee

### Evelyn Barrientos
- **31 dates compared**
- CSV consistently shows ~8.5 hours/day
- QC shows much lower hours (often 1-6 hours/day)
- **Pattern:** CSV > QC by ~50% overall
- **Likely cause:** Not all work is logged in QC sheets, or some work doesn't require QC entries

### Gary Benton
- **41 dates compared**
- Similar pattern to Evelyn: CSV ~8.5h/day, QC much lower
- Many days show QC < 2 hours when CSV shows 8+ hours
- **Pattern:** CSV > QC by ~41% overall
- **Likely cause:** Not all work requires QC entries

### Ruth Cruz
- **59 dates compared**
- **Unique:** QC hours > CSV hours overall (-47.9%)
- Some days show QC = 6-7 hours when CSV = 8+ hours
- Some days show QC < 1 hour when CSV = 8+ hours
- **Pattern:** Inconsistent - some days QC > CSV, some days CSV > QC
- **Likely cause:** Possible operator misattribution in QC (group entries assigned to Ruth)

### David Ramirez
- **94 dates compared** (most comparisons)
- Similar to Ruth: QC hours > CSV hours (-17.8%)
- Many days show QC = 2-6 hours when CSV = 8+ hours
- **Pattern:** QC consistently higher than CSV
- **Likely cause:** Material handler work may be logged differently, or group entries misattributed

### Kaleb Starkey
- **8 dates compared**
- CSV shows ~8.5-9.8 hours/day
- QC shows 1-7 hours/day
- **Pattern:** CSV > QC by ~50% overall
- **Likely cause:** Sampling department work may not always require QC entries

---

## Recommendations

### 1. Investigate Missing QC Data
- **Priority:** High
- **Action:** Review why 8 employees with significant CSV hours have no QC entries
- **Questions:**
  - Do these roles require QC entries?
  - Are operator codes matching correctly?
  - Are QC entries using different name formats?

### 2. Review Operator Misattribution
- **Priority:** High
- **Action:** Investigate cases where QC hours > CSV hours (Ruth Cruz, David Ramirez)
- **Focus:** Check for group entries ("+ Others") that may be incorrectly attributed

### 3. Standardize Time Tracking
- **Priority:** Medium
- **Action:** Ensure all work that requires QC entries is being logged
- **Consider:** Training or process improvements to improve QC entry completion

### 4. Improve Name Mapping
- **Priority:** Medium
- **Action:** Review and improve operator name mapping between CSV and QC systems
- **Focus:** Handle group entries and ambiguous names (e.g., "Jesus")

### 5. Data Quality Monitoring
- **Priority:** Low
- **Action:** Set up automated alerts for significant discrepancies (>20% difference)
- **Benefit:** Early detection of data quality issues

---

## Technical Notes

### Unit Conversion
The QC database contains mixed units (hours and minutes). The comparison script uses `normalize_time_to_minutes()` to handle this:
- Values > 24 → Treated as minutes
- Values ≤ 8 → Treated as hours (multiplied by 60)
- Values 8-24 → Heuristics applied

### Date Range
- CSV data: 1/10/2025 to 9/9/2025 (259 unique dates)
- QC data: Various dates (some entries outside CSV range)

### Employee Name Mapping
CSV uses "Last, First" format (e.g., "Baltazar, Jesus")
QC uses operator codes/initials (e.g., "JB", "JE")
Mapping handled via `operator_mapping.py` module

---

## Files Generated

- **Script:** `compare_times_vs_qc.py`
- **Report:** `Reports/TIME_COMPARISON_CSV_VS_QC.md`

---

## Next Steps

1. Review missing QC data for 8 employees
2. Investigate operator misattribution for Ruth Cruz and David Ramirez
3. Consider process improvements for QC entry completion
4. Review operator name mapping for group entries
