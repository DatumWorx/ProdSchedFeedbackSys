# Workflow Summary — New PO → Shipping

Complete workflow summary for SDP's production scheduling system from Purchase Order creation through shipping.

## Workflow Overview

```
New PO Created
    ↓
Work Orders Created (with "- WO" in title)
    ↓
Production Tasks Created (in department projects)
    ↓
Tasks Assigned to Machines (Prod Dept)
    ↓
Scheduling Algorithm Runs
    ↓
Est Start/Est Due Dates Calculated
    ↓
Work Order Due Dates Coordinated
    ↓
PO Due Dates Coordinated
    ↓
Production Begins (Est Start Date reached)
    ↓
Operators Update Progress (Actual PPM, % Complete)
    ↓
Tasks Completed
    ↓
QC Checks (if applicable)
    ↓
Shipping
```

## Detailed Workflow Steps

### 1. PO Creation

**Trigger:** New customer order received

**Actions:**
- Create PO task in Scheduling project (`1210976309014176`)
- Set Material ETA and Material Release Date if known
- Set Priority Level and Category
- Create initial due date based on customer requirements

**Custom Fields Set:**
- Material ETA
- Material Release Date
- Priority Level
- Category

### 2. Work Order Creation

**Trigger:** PO task created or updated

**Actions:**
- Create Work Order tasks (with "- WO" in title) in Scheduling project
- Link Work Orders as subtasks of PO task
- Set initial due dates based on PO requirements

**Identification:**
- Work orders have "- WO" in task title
- Located in Scheduling project
- Are subtasks of PO task

### 3. Production Task Creation

**Trigger:** Work Order created

**Actions:**
- Create production tasks in appropriate department projects:
  - Water Jets (`1209296874456267`)
  - Routers (`1211016974304211`)
  - Saws (`1211016974322485`)
  - Presses (`1211016974322479`)
  - Assembly (`1211016974322491`)
  - Sampling (`1211017167732352`)
- Link production tasks as subtasks of Work Order
- Assign to machines via Prod Dept custom field
- Set Total Time (minutes) based on production requirements
- Set due_on date based on Work Order requirements

**Required Fields:**
- Prod Dept (machine assignment)
- Total Time (minutes)
- due_on (due date)

### 4. Scheduling Algorithm Execution

**Trigger:** Scheduled run (e.g., daily, hourly) or manual trigger

**Process:**
1. **Fetch Tasks**
   - Get all tasks from department projects
   - Filter by `due_on != null`
   - Separate completed vs incomplete tasks

2. **Track Completions**
   - Find most recent completion time per machine/department
   - Use for cursor initialization

3. **Group Tasks**
   - Group by Machine (Prod Dept) + Department Project
   - Example: "Water Jets:M2", "Routers:Router 1"

4. **Sort Tasks**
   - Within each group, sort by due date (earliest first)

5. **Initialize Cursor**
   - Last completion time for machine (if available)
   - Earliest due date in group (if no completion)
   - Existing cursor position (if already scheduled)
   - Default: "now" at 7:00 AM

6. **Calculate Dates**
   For each task in group:
   - Get Total Time (minutes)
   - Apply 20% buffer: `bufferedMinutes = totalMinutes * 1.2`
   - Calculate shifts: `shifts = bufferedMinutes / 450`
   - Set Est Start Date = cursor position
   - Calculate Est Due Date = Est Start + buffered minutes
   - Move cursor to Est Due Date for next task
   - Respect weekday schedule (Monday-Friday, 7:00 AM - 3:30 PM)
   - Skip weekends

7. **Update Tasks**
   - Update Est Start Date custom field
   - Update Est Due Date custom field
   - Update Shifts custom field

### 5. Work Order Coordination

**Trigger:** After production task scheduling

**Process:**
- Find all Work Orders (tasks with "- WO" in title in Scheduling project)
- For each Work Order, find all child production tasks
- Update Work Order Est Due Date with latest child Est Due Date
- Update Work Order due_on with latest child Est Due Date

**Purpose:** Ensure Work Order due dates reflect actual production timeline

### 6. PO Coordination

**Trigger:** After Work Order coordination

**Process:**
- Find all PO tasks in Scheduling project
- For each PO, find all child Work Orders
- Update PO Est Due Date with latest Work Order Est Due Date
- Update PO due_on with latest Work Order Est Due Date

**Purpose:** Ensure PO due dates reflect actual production timeline

### 7. Production Execution

**Trigger:** Est Start Date reached

**Process:**
- Operators begin work on tasks
- Update Actual PPM (Actual Parts Per Minute) as work progresses
- Update Percentage Complete
- Update Productivity (% Productive Time)

**Custom Fields Updated:**
- Actual PPM
- Productivity
- Percentage Complete

### 8. Task Completion

**Trigger:** Production work finished

**Process:**
- Mark task as completed (`completed = true`)
- Set completed_at timestamp
- Final Actual PPM and Productivity values recorded

**Impact:**
- Completed task completion time used for future cursor initialization
- Task removed from active scheduling queue

### 9. QC Checks

**Trigger:** Task completed (if QC required)

**Process:**
- Quality control checks performed
- QC data recorded (may be in separate QC system or Asana)
- Tasks flagged for rework if issues found

**Note:** QC workflow may vary by department and product type.

### 10. Shipping

**Trigger:** QC passed (if applicable) or task completed

**Process:**
- Update Ship Skid status
- Task moved to shipping section or Shipping project
- Shipping information recorded

**Custom Fields Updated:**
- Ship Skid

## Schedule Constraints

- **Production Hours:** 7:00 AM - 3:30 PM Monday-Friday
- **Breaks:**
  - 10:00-10:15 AM (15 min morning break)
  - 12:00-12:30 PM (30 min lunch)
  - 2:00-2:15 PM (15 min afternoon break)
- **Net Production Time:** 450 minutes per day (7.5 hours)
- **Buffer Factor:** 1.2 (20% buffer applied to all production time)

## Key Business Rules

1. **Only schedule tasks with due dates:** Tasks with `due_on != null` are scheduled
2. **Group by machine + department:** Tasks grouped by Prod Dept (machine) and department project
3. **Sort by due date:** Within each group, tasks sorted by due date (earliest first)
4. **Apply 20% buffer:** All production time buffered by 20%
5. **Respect work schedule:** Only schedule Monday-Friday, 7:00 AM - 3:30 PM
6. **Skip breaks:** Breaks automatically excluded from production time
7. **Coordinate parents:** Parent tasks (work orders) updated with latest child est due date
8. **Coordinate POs:** PO tasks updated with latest work order est due date

## Hierarchical Structure

```
PO Task (Scheduling project)
  ├── Work Order 1 (Scheduling project, "- WO" in title)
  │   ├── Production Task 1 (Department project, assigned to machine)
  │   ├── Production Task 2 (Department project, assigned to machine)
  │   └── Production Task 3 (Department project, assigned to machine)
  ├── Work Order 2 (Scheduling project, "- WO" in title)
  │   ├── Production Task 4 (Department project, assigned to machine)
  │   └── Production Task 5 (Department project, assigned to machine)
  └── Work Order 3 (Scheduling project, "- WO" in title)
      └── Production Task 6 (Department project, assigned to machine)
```

## Data Flow

1. **Downward Flow (Creation):**
   - PO → Work Orders → Production Tasks

2. **Upward Flow (Coordination):**
   - Production Tasks Est Due → Work Order Est Due
   - Work Order Est Due → PO Est Due

3. **Scheduling Flow:**
   - Production Tasks → Grouped by Machine + Department
   - Sorted by due date
   - Scheduled sequentially within groups
   - Dates calculated and updated

4. **Production Flow:**
   - Est Start Date reached → Production begins
   - Actual PPM and Productivity updated
   - Task completed → Completion time recorded

## KPIs Tracked

- **PPM Scheduled vs PPM Actual:** Compare scheduled vs actual parts per minute
- **% Productive Time:** Actual PPM / Ideal PPM
- **Minutes Scheduled per Week:** Total scheduled production time
- **Shifts Required per Week:** Calculated from minutes (buffered minutes / 450)
- **Over/Under Capacity per Department:** Capacity utilization analysis
- **Work Order Throughput:** Number of work orders completed per period
- **On-Time Delivery:** Percentage of POs delivered on time
