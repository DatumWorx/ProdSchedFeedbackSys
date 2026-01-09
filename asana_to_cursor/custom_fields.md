# Asana Custom Fields

Complete reference of all custom fields used in SDP's Asana workspace, including GIDs, types, descriptions, and use cases.

## Complete Custom Field GIDs

| Field Name | GID | Type | Description |
|------------|-----|------|-------------|
| **Prod Dept** | `1210998867548457` | enum | Machine assignment |
| **Total Time** | `1211050097902110` | number | Production time in minutes |
| **Qty Parts** | `1211521540574994` | number | Quantity of parts |
| **Process Time** | `1212346791922304` | number | Process time per part in minutes (decimal) |
| **Scheduled PPM** | `1211333073103705` | number | Scheduled parts per minute |
| **Actual PPM** | `1211333010718834` | number | Actual parts per minute |
| **Productivity** | `1211049984069827` | number | % Productive Time |
| **Shifts** | `1211050228588906` | number | Shifts required (calculated) |
| **Est Start Date** | `1211594523120745` | date | Estimated start date |
| **Est Due Date** | `1211594524354161` | date | Estimated finish date |
| **Material ETA** | `1211672583413996` | date | Material expected arrival |
| **Material Release Date** | `1211672583413994` | date | Material release date |
| **Week of Month** | `1211620141144998` | multi_enum | Week 1-5 |
| **Percentage Complete** | `1211673243352085` | number | Task completion % |
| **Priority Level** | `1209787164865143` | enum | Rush/Late/Early |
| **Productivity Level** | `1211045079573156` | enum | Performance indicator |
| **Pick Status** | `1210985723045925` | enum | Material pick status |
| **Ship Skid** | `1211124727504039` | enum | Shipping status |
| **Material** | `1209784439507743` | enum | Material type/status |
| **Material Status** | `1211046701466913` | enum | Material availability |
| **Stock to Pull** | `1211046700778270` | text | Stock material info |
| **Pick List** | `1210985723045923` | text | Pick list reference |
| **When** | `1211527445792832` | enum | This Week/Month |
| **Category** | `1211732168463750` | enum | Long Run/Normal/Small/Rush/Sample |
| **Minutes Available** | `1211740930099678` | number | Available minutes based on shifts |

## Prod Dept Enum Options

### Water Jets
- `1210998867548458` - M2 (green)
- `1210998867548459` - M3 (blue-green)

### Routers
- `1210998867548460` - Router 1 (orange)
- `1211508172555238` - Router 2 (orange)
- `1211508172555239` - Router 3 (orange)
- `1211528045458546` - Router 4 (orange)
- `1212240217329860` - Router 5 (orange)
- `1211546679421213` - Contour (orange)
- `1210998867548467` - Mill (magenta)

### Presses
- `1210998867548461` - Press 1 (yellow-green)
- `1211528045458547` - Press 2 (yellow-green)
- `1211528045458548` - AutoPress (yellow-green)
- `1211528045458549` - Roller Press (yellow-green)

### Assembly
- `1210998867548462` - Assembly 1 (yellow)
- `1211528045458550` - Assembly 2 (yellow)

### Saws
- `1210998867548463` - Saws (blue)
- `1211528045458551` - Saws 2 (blue)
- `1211740966267077` - Drills (blue)

### Sampling/Specialty
- `1210998867548464` - Paint
- `1210998867548465` - Converting/Skiving
- `1210998867548466` - Soft Foam
- `1211022164209460` - Laser (red)
- `1211527732687273` - Stepcraft (aqua)
- `1211603356077729` - Sampling (pink)

### Other
- `1211375021403967` - Red 1
- `1210998867548468` - Shipping (purple)
- `1211017456492162` - Material Handling (yellow)

## Field Use Cases

### Scheduling Fields
- **Prod Dept**: Required for grouping tasks by machine and department
- **Process Time**: Time per part in minutes (decimal) - source field for calculations
- **Total Time**: Required for calculating estimated start/due dates (calculated as Process Time × Qty Parts)
- **Est Start Date**: Calculated by scheduling algorithm
- **Est Due Date**: Calculated by scheduling algorithm
- **Shifts**: Calculated from buffered minutes (bufferedMinutes / 450)

### Production Tracking Fields
- **Qty Parts**: Quantity of parts to produce
- **Process Time**: Time per part in minutes (used to calculate Total Time and Scheduled PPM)
- **Scheduled PPM**: Planned parts per minute (calculated as Qty Parts ÷ Total Time)
- **Actual PPM**: Actual parts per minute achieved
- **Productivity**: % Productive Time (Actual PPM / Ideal PPM)
- **Percentage Complete**: Task completion percentage

### Material Management Fields
- **Material ETA**: Expected arrival date of materials
- **Material Release Date**: Date materials are released for production
- **Material Status**: Current availability status
- **Pick Status**: Status of material picking
- **Stock to Pull**: Information about stock materials
- **Pick List**: Reference to pick list

### Planning Fields
- **Week of Month**: Week assignment (1-5)
- **When**: This Week/Month indicator
- **Category**: Long Run/Normal/Small/Rush/Sample
- **Priority Level**: Rush/Late/Early priority
- **Minutes Available**: Available minutes based on shifts

### Shipping Fields
- **Ship Skid**: Shipping status indicator

## Required Fields for Scheduling

1. **due_on** (due date) - Only tasks with due dates are scheduled
2. **Total Time** (custom field) - Production time in minutes
3. **Prod Dept** (custom field) - Machine assignment

## Optional but Recommended Fields

- **Qty Parts** - Quantity of parts
- **Scheduled PPM** - Parts per minute
- **Parent task** - For work order coordination

## SDP Calendar Custom Fields

Custom fields specific to the SDP Calendar project (`1208514675798267`). These fields track order status, production workflow, and business operations.

| Field Name | GID | Type | Description |
|------------|-----|------|-------------|
| **Quote Status** | `1210978788003198` | enum | Quote attachment status |
| **Buy / Reship?** | `1210767898335457` | enum | Buy/reship indicator |
| **Job Progress** | `1192131306359057` | enum | Overall job/production status |
| **Design Status** | `1210728499644462` | enum | Work order design completion status |
| **Total Estimated Time** | `1210762517515377` | text | Total estimated production time |
| **Job Priority** | `1208514675798271` | enum | Job priority level (Hot/Rush) |
| **Material Status** | `1210762517515397` | enum | Material availability status (SDP Calendar) |
| **Scheduling Status** | `1210762517515438` | enum | Scheduling completion status |
| **Confirmation** | `1210767608443957` | enum | Order confirmation status |
| **Tooling Needed?** | `1210772968375743` | enum | Tooling requirement indicator |
| **Final Review** | `1210767898335418` | enum | Final review/release status |
| **QC Status** | `1192764337004258` | enum | Quality control status |
| **Rejected Cost** | `1211841045563718` | number | Cost of rejected items |
| **Shipping Method** | `1192761161396299` | enum | Shipping method selection |
| **FREIGHT COST** | `1208592190330343` | number | Freight/shipping cost |
| **Invoicing** | `1208514675798446` | enum | Invoicing status |
| **Checked to Customer Print** | `1211017491600831` | enum | Print verification status |
| **Late / Early?** | `1211486746151950` | enum | Delivery timing indicator |
| **Delay Reason** | `1211215090952401` | enum | Reason for production delay |
| **Total PO Amount** | `1210974999949313` | number | Total purchase order amount |

### SDP Calendar Field Enum Options

#### Quote Status (`1210978788003198`)
- `1210978788003199` - Quote Attachment Needed (cool-gray)
- `1210978788003200` - Quote Attachment NOT Needed (green)
- `1210978788003201` - Quote Attached (green)
- `1210978788003239` - No Quote Record (red)

#### Job Progress (`1192131306359057`)
- `1210772971190820` - Information Needed (blue)
- `1192131306557803` - Production Pending (yellow)
- `1210768090060377` - In Production (cool-gray)
- `1211318261641447` - Sample PO (magenta)
- `1211409677642322` - Done - Sample PO (green)
- `1192131306426716` - Done (green)
- `1192131306557815` - Partial Done (yellow-green)
- `1210777853485906` - Production Late (red)
- `1210931873181872` - Done - Late (yellow-orange)
- `1210776480822080` - Hold - Pending Approval (hot-pink)
- `1192131306562024` - Buy / Reship (blue-green)
- `1211307140127823` - Buy / Reship + Production (cool-gray)

#### Design Status (`1210728499644462`)
- `1210762517515379` - WO Not Started (cool-gray)
- `1210728499644464` - WO In Progress (yellow-orange)
- `1210728499644463` - WO Complete (green)
- `1210728499644465` - WO ON HOLD - Info Needed (red)
- `1210762517515383` - WO ON HOLD - CAD Needed (red)
- `1210762517515384` - WO ON HOLD - Prints Needed (red)
- `1210810332350935` - WO Revisions Needed (red)

#### Material Status (`1210762517515397`)
- `1210762517515398` - Material Not Requested (cool-gray)
- `1210762517515399` - Material Requested (green)
- `1211386497959716` - Material Needed (red)
- `1210762517515400` - Material In Stock (green)
- `1210767608443967` - Material In Stock + Requested (green)
- `1211438987472119` - Scrap Material (green)
- `1210932360496341` - Checking On Materials (yellow-orange)

#### Scheduling Status (`1210762517515438`)
- `1210762517515439` - Scheduled (green)
- `1210762517515440` - Not Scheduled (red)

#### Confirmation (`1210767608443957`)
- `1210767608443958` - Good To Confirm (yellow)
- `1210767895462265` - Confirmed (green)
- `1210782771769801` - Hold From Confirming (red)
- `1210845776572053` - Confirmation Not Needed (orange)
- `1211153844810058` - Needs Reconfirmed (orange)

#### Final Review (`1210767898335418`)
- `1210767898335419` - Released (green)
- `1210767898335420` - Hold (red)
- `1210991742367488` - Revisions Needed (yellow-orange)
- `1210767898335421` - WO Revisions Needed (orange)
- `1210767898335423` - Material Revisions Needed (yellow-orange)
- `1210767898335424` - Scheduling Revisions Needed (yellow)
- `1210868677903014` - Canceled/Hold By Customer (red)
- `1210991742367470` - Accidental Duplicate (hot-pink)

#### QC Status (`1192764337004258`)
- `1192764337200996` - QC Needed (yellow)
- `1192764337068845` - QC Complete (green)
- `1208137590937355` - QC Rejected (red)
- `1192764337070915` - QC Hold (orange)
- `1210804197201662` - QC Rejected From Customer (red)

#### Shipping Method (`1192761161396299`)
- `1192761161396305` - SDP Box (blue)
- `1210768212677084` - SDP SUV (blue)
- `1192761161461855` - LTL (red)
- `1192761161590891` - CPU (cool-gray)
- `1192761161590929` - UPS / FedEX (yellow)
- `1193014777472075` - UPS / FedEX COLLECT (yellow-green)
- `1195426380672161` - Other (blue-green)
- `1200022877605849` - MTB (magenta)
- `1202406540010889` - LTL COLLECT (hot-pink)
- `1204779949113411` - STRAIGHT SHOT CARRIER (pink)
- `1206254019630638` - WE EXPIDITE VAN (cool-gray)
- `1207777338739837` - CHEROKEE EXPRESS (none)
- `1210773996483080` - FTL (orange)
- `1210823683909953` - LTL (Return) (yellow-orange)

#### Invoicing (`1208514675798446`)
- `1208514675798447` - SHIPPED COMPLETE (green)
- `1208514675798448` - PARTIAL SHIP (blue)
- `1208514675798449` - FIRST ARTICLE SHIPPED (yellow)
- `1208514675798450` - DELAY ORDER CONFIRMED (yellow-orange)

#### Delay Reason (`1211215090952401`)
- `1211215090952402` - Material Delay (red)
- `1211215090952405` - Production Delay (red)
- `1211215090952403` - Process Delay (red)
- `1211215090952404` - Maintenance Delay (red)
- `1211215090952408` - Shipping Delay (red)
- `1211215090952410` - Customer Delay (red)

## Field Access Patterns

See `asana_api_reference.md` for code examples on how to:
- Read custom field values by GID or name
- Extract number, string, and date values
- Handle enum and multi_enum fields
- Update custom field values via API
