# Task Lifecycle

Complete workflow from New Order → PO → Subtasks → Scheduling → Production → QC → Shipping

## Lifecycle Overview

```
New Order
    ↓
PO Task (in Scheduling project)
    ↓
Work Order Tasks (with "- WO" in title, in Scheduling project)
    ↓
Production Tasks (in department projects, assigned to machines)
    ↓
Scheduling (calculate Est Start/Est Due dates)
    ↓
Production (operators complete tasks)
    ↓
QC (quality control checks)
    ↓
Shipping
```

## Stage 1: New Order

**Location:** Scheduling project or Purchasing & Receiving project

**Characteristics:**
- Created when new customer order is received
- Contains order details, customer information
- May have Material ETA and Material Release Date

**Custom Fields:**
- Material ETA
- Material Release Date
- Priority Level
- Category (Long Run/Normal/Small/Rush/Sample)

## Stage 2: PO (Purchase Order) Task

**Location:** Scheduling project (`1210976309014176`)

**Characteristics:**
- Top-level task representing a purchase order
- Contains multiple Work Orders as subtasks
- Due date coordinated with latest work order est due date

**Custom Fields:**
- Est Due Date (calculated from work orders)
- Priority Level
- Material Status

**Identification:**
- Typically named with PO number or customer order reference

## Stage 3: Work Order Tasks

**Location:** Scheduling project (`1210976309014176`)

**Characteristics:**
- Identified by "- WO" in task title
- Middle-level task containing production tasks as subtasks
- Due date coordinated with latest child production task est due date

**Custom Fields:**
- Est Due Date (calculated from production tasks)
- Priority Level
- Category

**Identification:**
```typescript
function isWorkOrder(task: AsanaTask, schedulingProjectGid: string): boolean {
  const hasWOTitle = !!(task.name && (task.name.includes('- WO') || task.name.includes(' - WO')));
  const isInSchedulingProject = task.memberships?.some(
    m => m?.project?.gid === schedulingProjectGid
  ) || task.projects?.some(
    p => p.gid === schedulingProjectGid
  ) || false;
  return hasWOTitle && isInSchedulingProject;
}
```

## Stage 4: Production Tasks

**Location:** Department projects (Water Jets, Routers, Saws, Presses, Assembly, Sampling)

**Characteristics:**
- Leaf-level tasks assigned to specific machines
- Have production time (Total Time in minutes)
- Scheduled based on machine capacity and dependencies

**Required Custom Fields:**
- **Prod Dept** (machine assignment) - Required
- **Total Time** (minutes) - Required
- **due_on** (due date) - Required for scheduling

**Calculated Custom Fields:**
- **Est Start Date** - Calculated by scheduling algorithm
- **Est Due Date** - Calculated by scheduling algorithm
- **Shifts** - Calculated from buffered minutes (bufferedMinutes / 450)

**Optional Custom Fields:**
- Qty Parts
- Scheduled PPM
- Material Status
- Pick Status

**Scheduling Process:**
1. Tasks grouped by Machine (Prod Dept) + Department Project
2. Sorted by due date (earliest first)
3. Cursor initialized from last completion time or earliest due date
4. Est Start = cursor position
5. Est Due = Est Start + buffered minutes (Total Time * 1.2)
6. Cursor moves to Est Due for next task

## Stage 5: Scheduling

**Algorithm:**
1. **Track Completions:** Find most recent completion time per machine/department from completed tasks
2. **Group Tasks:** Tasks grouped by Machine (Prod Dept) + Department Project
3. **Sort Tasks:** Tasks within each group sorted by due date (earliest first)
4. **Initialize Cursor:** 
   - Last completion time for machine (if available)
   - Earliest due date in group (if no completion)
   - Existing cursor position (if already scheduled)
   - Default: "now" at 7:00 AM
5. **Calculate Dates:** For each task:
   - Get Total Time (minutes)
   - Apply 20% buffer: `bufferedMinutes = totalMinutes * 1.2`
   - Calculate shifts: `shifts = bufferedMinutes / 450`
   - Set Est Start = cursor position
   - Calculate Est Due = Est Start + buffered minutes
   - Move cursor to Est Due for next task
6. **Coordinate Parents:** Update work order est due dates with latest child
7. **Coordinate POs:** Update PO est due dates with latest work order

**Schedule Constraints:**
- Production Schedule: 7:00 AM - 3:30 PM Monday-Friday
- Breaks: 10:00-10:15 AM, 12:00-12:30 PM, 2:00-2:15 PM
- Net Production Time: 450 minutes per day (7.5 hours)
- Buffer Factor: 1.2 (20% buffer)

## Stage 6: Production

**Location:** Department projects, assigned to specific machines

**Characteristics:**
- Operators work on tasks during scheduled time
- Update Actual PPM (Actual Parts Per Minute) as work progresses
- Update Percentage Complete
- Mark task as completed when finished

**Custom Fields Updated:**
- **Actual PPM** - Actual parts per minute achieved
- **Productivity** - % Productive Time (Actual PPM / Ideal PPM)
- **Percentage Complete** - Task completion percentage
- **completed** - Set to true when task is finished
- **completed_at** - Timestamp of completion

**Completion Tracking:**
- Completed tasks are used to initialize cursor for future scheduling
- Most recent completion time per machine is used as starting point

## Stage 7: QC (Quality Control)

**Location:** Department projects or dedicated QC project

**Characteristics:**
- Quality control checks performed on completed production tasks
- May create QC log entries
- Tasks may be flagged for rework if issues found

**Custom Fields:**
- Quality sheet completion status
- QC notes or references

**Note:** QC workflow details may vary by department and product type.

## Stage 8: Shipping

**Location:** Department projects or Shipping project

**Characteristics:**
- Tasks ready for shipping
- Shipping status updated
- May be moved to Shipping project or section

**Custom Fields:**
- **Ship Skid** - Shipping status indicator
- **completed** - Task marked complete after shipping

## Task Filtering Rules

### For Scheduling
- Only processes tasks with `due_on != null`
- Separates completed tasks from incomplete tasks
- Groups by machine (Prod Dept) + department project
- Work orders identified by "- WO" in title in Scheduling project

### For Production
- Tasks with Est Start Date in past or present are ready for production
- Tasks filtered by department project membership
- Tasks filtered by machine assignment (Prod Dept)

## Hierarchical Coordination

### Work Order Coordination
- Work orders are tasks with "- WO" in title in Scheduling project
- Parent tasks (work orders) are updated with latest child est due date
- Ensures work order due dates reflect actual production timeline

### PO Coordination
- PO tasks are updated with latest work order est due date
- Ensures PO due dates reflect actual production timeline
- Hierarchical coordination: Tasks → Work Orders → POs

## Data Validation

### Required Fields for Scheduling
1. `due_on` (due date)
2. `Total Time` (minutes) custom field
3. `Prod Dept` (machine assignment) custom field

### Optional but Recommended
- `Qty Parts` (quantity)
- `Scheduled PPM` (parts per minute)
- Parent task (for work order coordination)

### Error Handling
1. **Missing fields:** Skip tasks without required fields, log warnings
2. **Invalid dates:** Validate date formats, handle timezone issues
3. **Missing projects:** Log warnings for tasks not in expected projects
