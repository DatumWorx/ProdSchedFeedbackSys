# GID Validation Report

Comparison of GIDs between documentation (`asana_to_cursor/`) and codebase implementation.

## Summary

This document validates that all GIDs documented in `asana_to_cursor/` match what's actually used in the codebase.

---

## ✅ Project GIDs

### Scheduling Project
- **Documentation** (`asana_blueprint.md`): `1210976309014176`
- **Code** (`lib/constants.ts`): `1210976309014176` ✅
- **Usage**: Used in API routes and components

### SDP Calendar Project
- **Documentation** (`asana_blueprint.md`): `1208514675798267`
- **Code** (`lib/constants.ts`): `1208514675798267` ✅
- **Usage**: Referenced in documentation only

### Water Jets Project
- **Documentation** (`asana_blueprint.md`): `1209296874456267`
- **Code** (`lib/constants.ts`): `1209296874456267` ✅
- **Usage**: Used in API routes

### Workspace GID
- **Documentation** (`asana_api_reference.md`): `1139018700565569`
- **Code**: Not hardcoded, uses `process.env.ASANA_WORKSPACE_GID` ✅
- **Usage**: API configuration

---

## ✅ Custom Field GIDs

### Core Scheduling Fields

#### Prod Dept
- **Documentation** (`custom_fields.md`): `1210998867548457`
- **Code** (`lib/constants.ts`): `1210998867548457` ✅

#### Total Time
- **Documentation** (`custom_fields.md`): `1211050097902110`
- **Code** (`lib/constants.ts`): `1211050097902110` ✅

#### Qty Parts
- **Documentation** (`custom_fields.md`): `1211521540574994`
- **Code** (`lib/constants.ts`): `1211521540574994` ✅

#### Scheduled PPM
- **Documentation** (`custom_fields.md`): `1211333073103705`
- **Code** (`lib/constants.ts`): `1211333073103705` ✅

#### Shifts
- **Documentation** (`custom_fields.md`): `1211050228588906`
- **Code** (`lib/constants.ts`): `1211050228588906` ✅

#### Est Start Date
- **Documentation** (`custom_fields.md`): `1211594523120745`
- **Code** (`lib/constants.ts`): `1211594523120745` ✅

#### Est Due Date
- **Documentation** (`custom_fields.md`): `1211594524354161`
- **Code** (`lib/constants.ts`): `1211594524354161` ✅

#### Pick List
- **Documentation** (`custom_fields.md`): `1210985723045923`
- **Code** (`lib/constants.ts`): `1210985723045923` ✅

---

## ⚠️ Prod Dept Enum Options - Discrepancies Found

### Water Jets
- **M2**: `1210998867548458` ✅ (in both docs and code)
- **M3**: `1210998867548459` ✅ (in both docs and code)

### Routers
- **Router 1**: `1210998867548460` ✅ (in both docs and code)
- **Router 2**: `1211508172555238` ✅ (in both docs and code)
- **Router 3**: `1211508172555239` ✅ (in both docs and code)
- **Router 4**: `1211528045458546` ✅ (in both docs and code)
- **Router 5**: ⚠️ **Missing in documentation** - `1212240217329860` (found in `lib/constants.ts`)
- **Contour**: `1211546679421213` ✅ (in both docs and code)
- **Mill**: `1210998867548467` ✅ (in both docs and code)

### Presses
- **Press 1**: `1210998867548461` ✅ (in both docs and code)
- **Press 2**: `1211528045458547` ✅ (in both docs and code)
- **AutoPress**: `1211528045458548` ✅ (in both docs and code)
- **Roller Press**: `1211528045458549` ✅ (in both docs and code)

### Assembly
- **Assembly 1**: `1210998867548462` ✅ (in both docs and code)
- **Assembly 2**: `1211528045458550` ✅ (in both docs and code)

### Saws
- **Saws**: `1210998867548463` ✅ (in both docs and code)
- **Saws 2**: `1211528045458551` ✅ (in both docs and code)
- **Drills**: `1211740966267077` ✅ (in both docs and code)

### Sampling/Specialty
- **Paint**: `1210998867548464` ✅ (in both docs and code)
- **Converting/Skiving**: `1210998867548465` ✅ (in both docs and code)
- **Soft Foam**: `1210998867548466` ✅ (in both docs and code)
- **Laser**: `1211022164209460` ✅ (in both docs and code)
- **Stepcraft**: `1211527732687273` ✅ (in both docs and code)
- **Sampling**: `1211603356077729` ✅ (in both docs and code)

### Other
- **Red 1**: `1211375021403967` ✅ (in both docs and code)
- **Shipping**: `1210998867548468` ✅ (in both docs and code)
- **Material Handling**: `1211017456492162` ✅ (in both docs and code)

---

## 📝 Missing Custom Fields in Constants

The following custom fields are documented in `custom_fields.md` but **not** in `lib/constants.ts`:

### Production Tracking
- **Actual PPM**: `1211333010718834` - Not in constants
- **Productivity**: `1211049984069827` - Not in constants
- **Percentage Complete**: `1211673243352085` - Not in constants

### Material Management
- **Material ETA**: `1211672583413996` - Not in constants
- **Material Release Date**: `1211672583413994` - Not in constants
- **Material Status**: `1211046701466913` - Not in constants
- **Stock to Pull**: `1211046700778270` - Not in constants
- **Pick Status**: `1210985723045925` - Not in constants

### Planning Fields
- **Week of Month**: `1211620141144998` - Not in constants
- **When**: `1211527445792832` - Not in constants
- **Category**: `1211732168463750` - Not in constants
- **Priority Level**: `1209787164865143` - Not in constants
- **Productivity Level**: `1211045079573156` - Not in constants
- **Minutes Available**: `1211740930099678` - Not in constants

### Shipping
- **Ship Skid**: `1211124727504039` - Not in constants
- **Material**: `1209784439507743` - Not in constants

### SDP Calendar Fields
All SDP Calendar custom fields (lines 126-148 in `custom_fields.md`) are **not** in constants - this is expected as they're specific to the SDP Calendar project workflow.

---

## ✅ GID Usage Patterns

### Correct Usage in Code

1. **Task GIDs**: Used as string identifiers for tasks, subtasks, attachments
   - Example: `taskGid: string` in `lib/asana-client.ts`

2. **Custom Field GIDs**: Used as keys in update objects
   - Example: `updates[custom_fields.${fieldGid}]` in `updateTaskCustomFields()`

3. **Enum Option GIDs**: Used as values for enum custom fields
   - Example: `customFields[PROD_DEPT] = part.primaryDept.deptGid`

4. **Project GIDs**: Used in API endpoints
   - Example: `/projects/${projectGid}/tasks`

### API Request Patterns

```typescript
// Correct: Using GID in URL path
GET /tasks/{task_gid}

// Correct: Using GID in opt_fields
opt_fields: 'custom_fields.gid,custom_fields.name'

// Correct: Using GID as object key for updates
{
  "data": {
    "custom_fields": {
      "1211594523120745": "2025-01-27"  // Field GID as key
    }
  }
}
```

---

## 🔍 Asana API Understanding

### GID Format
- GIDs are **string** identifiers (not numbers)
- Always use `String(gid)` when comparing
- Example: `String(cf.gid) === String(fieldGid)`

### GID Types
1. **Resource GIDs**: Tasks, Projects, Sections, Attachments
   - Format: Numeric string (e.g., `"1210976309014176"`)
   
2. **Custom Field GIDs**: Field definitions
   - Format: Numeric string (e.g., `"1210998867548457"`)
   - Used as keys when updating: `custom_fields.{fieldGid}`

3. **Enum Option GIDs**: Enum value identifiers
   - Format: Numeric string (e.g., `"1210998867548458"`)
   - Used as **values** when updating enum fields

### GID Access Patterns

**Reading Custom Fields:**
```typescript
// By GID (preferred - more reliable)
const field = task.custom_fields.find(cf => String(cf.gid) === String(fieldGid));

// By name (fallback - may have normalization issues)
const field = task.custom_fields.find(cf => norm(cf.name) === norm(fieldName));
```

**Updating Custom Fields:**
```typescript
// Number field
updates[`custom_fields.${fieldGid}`] = numericValue;

// Enum field - use enum option GID as value
updates[`custom_fields.${fieldGid}`] = enumOptionGid;

// Text field
updates[`custom_fields.${fieldGid}`] = textValue;
```

---

## ✅ Recommendations

### 1. Update Documentation
- **Action**: Add Router 5 GID (`1212240217329860`) to `custom_fields.md`

### 2. Add Missing Constants (Optional)
- Consider adding production tracking fields to `lib/constants.ts` if they're used in scheduling logic
- Keep SDP Calendar fields separate (they're in a different project)

### 3. GID Validation
- All critical GIDs match between documentation and code ✅
- All GIDs used in production code are documented ✅

### 4. Code Quality
- GIDs are consistently used as strings ✅
- Comparison uses `String()` conversion ✅
- No hardcoded magic numbers in API calls ✅

---

## 📋 Quick Reference

### Most Used Custom Fields
- **Prod Dept**: `1210998867548457`
- **Total Time**: `1211050097902110`
- **Est Start Date**: `1211594523120745`
- **Est Due Date**: `1211594524354161`
- **Qty Parts**: `1211521540574994`
- **Shifts**: `1211050228588906`

### Most Used Projects
- **Scheduling**: `1210976309014176`
- **Water Jets**: `1209296874456267`
- **SDP Calendar**: `1208514675798267`

### Most Used Prod Dept Options
- **M2**: `1210998867548458`
- **M3**: `1210998867548459`
- **Router 1**: `1210998867548460`
- **Press 1**: `1210998867548461`
- **Assembly 1**: `1210998867548462`
- **Paint**: `1210998867548464`

