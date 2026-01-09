# Asana Blueprint

Complete inventory of SDP's Asana workspace structure, including projects, sections, custom fields, automations, dependencies, and data flow.

## System Overview

### Purpose
SDP is a custom packaging manufacturer specializing in fabricated XLPE, PE, PCORR, HDPE, UHMW, foam dunnage, and related materials. The production scheduling system automates production scheduling using Asana, calculating estimated start/due dates for production tasks based on capacity, departments, and work order dependencies.

### Architecture
- **Source of Truth:** Asana (tasks, custom fields, project structure)
- **Scheduling Engine:** Calculates dates based on capacity, buffers, and dependencies
- **Integration:** n8n workflows, Node.js backend, MySQL database for analytics
- **Workflow:** Tasks → Work Orders → POs (hierarchical coordination)

### Key Features
- ✅ Calculate estimated start/due dates for tasks
- ✅ Track completed tasks and use completion times for cursor initialization
- ✅ Apply 20% buffer to production time
- ✅ Calculate shifts from minutes
- ✅ Respect weekday schedule and break times
- ✅ Group tasks by machine (Prod Dept) and department project
- ✅ Sequential scheduling within groups (cursor model)
- ✅ Coordinate parent task (work order) due dates with children
- ✅ Coordinate PO task due dates with work orders
- ✅ Filter tasks by due date (only schedule tasks with due_on)

## Projects

### Department Projects

| Department | Project GID | Environment Variable |
|------------|------------|---------------------|
| Water Jets | `1209296874456267` | `WATER_JETS_PROJECT_GID` |
| Routers | `1211016974304211` | `ROUTERS_PROJECT_GID` |
| Saws | `1211016974322485` | `SAWS_PROJECT_GID` |
| Presses | `1211016974322479` | `PRESSES_PROJECT_GID` |
| Assembly | `1211016974322491` | `ASSEMBLY_PROJECT_GID` |
| Sampling | `1211017167732352` | `SAMPLING_PROJECT_GID` |

### Other Projects

| Project | GID | Environment Variable |
|---------|-----|---------------------|
| Scheduling | `1210976309014176` | `SCHEDULING_PROJECT_GID` |
| Purchasing & Receiving | `1149833832265064` | `PURCHASING_PROJECT_GID` |
| SDP Calendar | `1208514675798267` | `SDP_CALENDAR_PROJECT_GID` |

### Workspace
- **Workspace GID:** `1139018700565569`
- **Environment Variable:** `ASANA_WORKSPACE_GID`

## Custom Fields

See `custom_fields.md` for complete custom field reference including:
- All field GIDs and types
- Prod Dept enum options for all machines
- Field descriptions and use cases

## Sections

Sections are used within projects to organize tasks. Common sections include:
- Active tasks
- Completed tasks
- Waiting on materials
- Quality control
- Shipping

## Automations

### Scheduling Automation
- Calculates estimated start/due dates based on:
  - Machine capacity (Prod Dept)
  - Department project membership
  - Total Time (minutes)
  - 20% buffer factor
  - Work schedule (7:00 AM - 3:30 PM, Monday-Friday)

### Work Order Coordination
- Identifies work orders by "- WO" in title within Scheduling project
- Updates parent work order due dates with latest child est due date
- Coordinates PO task due dates with work orders

### Task Filtering
- Only processes tasks with `due_on != null`
- Separates completed tasks from incomplete tasks
- Groups by machine (Prod Dept) + department project

## Dependencies

### Hierarchical Structure
1. **PO Tasks** (top level)
   - Contain multiple Work Orders
   - Due date coordinated with latest work order est due date

2. **Work Orders** (middle level)
   - Identified by "- WO" in title
   - In Scheduling project
   - Contain multiple production tasks
   - Due date coordinated with latest child est due date

3. **Production Tasks** (leaf level)
   - Assigned to specific machines (Prod Dept)
   - In department projects (Water Jets, Routers, Saws, etc.)
   - Have Total Time, Est Start Date, Est Due Date

### Task Relationships
- **Parent-Child:** Work orders contain production tasks as subtasks
- **Project Membership:** Tasks can belong to multiple projects (department + Scheduling)
- **Machine Assignment:** Tasks assigned to machines via Prod Dept custom field

## Data Flow

### Scheduling Flow

1. **Fetch Tasks**
   - Get all tasks from department projects
   - Filter by `due_on != null`
   - Separate completed vs incomplete

2. **Group Tasks**
   - Group by Machine (Prod Dept) + Department Project
   - Sort within groups by due date (earliest first)

3. **Initialize Cursor**
   - Last completion time for machine (if available)
   - Earliest due date in group (if no completion)
   - Existing cursor position (if already scheduled)
   - Default: "now" at 7:00 AM

4. **Calculate Dates**
   - Get Total Time (minutes)
   - Apply 20% buffer: `bufferedMinutes = totalMinutes * 1.2`
   - Calculate shifts: `shifts = bufferedMinutes / 450`
   - Set Est Start = cursor position
   - Calculate Est Due = Est Start + buffered minutes
   - Move cursor to Est Due for next task

5. **Coordinate Parents**
   - Update work order est due dates with latest child
   - Update PO est due dates with latest work order

6. **Update Asana**
   - Update task custom fields (Est Start Date, Est Due Date, Shifts)
   - Update parent task due dates

### Production Flow

1. **New Order** → Creates PO task in Scheduling project
2. **PO** → Creates Work Order tasks (with "- WO" in title)
3. **Work Order** → Creates production tasks in department projects
4. **Production Tasks** → Assigned to machines (Prod Dept), scheduled
5. **Production** → Operators complete tasks, update Actual PPM
6. **QC** → Quality control checks (if applicable)
7. **Shipping** → Task moved to shipping status

## Department Structure

### Departments and Machines

#### Water Jets
- **Machines:** M2, M3
- **KPI Focus:** % Productive Time, Scheduling vs Actual PPM, Weekly throughput planning

#### Routers
- **Machines:** Router 1, Router 2, Router 3, Router 4, Router 5, Mill, Contour
- **KPI Focus:** Productivity, process time accuracy, utilization

#### Saws
- **Machines:** Saw 1, Saw 2, Drill Presses (x3)
- **KPI Focus:** Operator capacity, saw-station load balancing, drill-press flow

#### Presses
- **Machines:** AutoPress, Press 1, Press 2, Roller Press
- **KPI Focus:** Real % productive time, schedule accuracy, job sequencing

#### Assembly
- **Stations:** Assembly 1, Assembly 2
- **KPI Focus:** Workload leveling, preventing end-of-month overload, dependency timing

#### Sampling / Specialty
- **Areas:** Paint, Converting/Skiving, Soft Foam, Sampling, Laser
- **KPI Focus:** Small batch speed, prototype cycle times, rapid start/stop

### Department Mapping

**Machine to Department:**
```typescript
function mapMachineToDepartment(machine: string): string {
  const value = machine.toLowerCase();
  
  if (['m2', 'm3', 'water jets', 'waterjets'].includes(value)) return 'Water Jets';
  if (['router 1', 'router 2', 'router 3', 'router 4', 'contour', 'mill', 'routers'].includes(value)) return 'Routers';
  if (['saws', 'saws 2', 'drills', 'drill press 1', 'drill press 2', 'drill press 3'].includes(value)) return 'Saws';
  if (['press 1', 'press 2', 'autopress', 'roller press', 'presses'].includes(value)) return 'Presses';
  if (['assembly 1', 'assembly 2', 'assembly'].includes(value)) return 'Assembly';
  if (['paint', 'converting/skiving', 'soft foam', 'sampling', 'laser', 'stepcraft', 'sampling dept'].includes(value)) return 'Sampling Dept';
  
  return null;
}
```

## Schedule Constraints

- **Production Schedule:** 7:00 AM - 3:30 PM Monday-Friday
- **Breaks:**
  - 10:00-10:15 AM (15 min)
  - 12:00-12:30 PM (30 min lunch)
  - 2:00-2:15 PM (15 min)
- **Net Production Time:** 450 minutes per day (7.5 hours)
- **Buffer Factor:** 1.2 (20% buffer applied to all production time)

## Business Rules

1. **Only schedule tasks with due dates:** Tasks with `due_on` are only given an estimated start date and estimated end date
2. **Group by machine + department:** Tasks are grouped by Prod Dept (machine) and department project
3. **Sort by due date:** Within each group, tasks are sorted by due date (earliest first)
4. **Apply 20% buffer:** All production time is buffered by 20%
5. **Respect work schedule:** Only schedule Monday-Friday, 7:00 AM - 3:30 PM
6. **Skip breaks:** Breaks are automatically excluded from production time
7. **Coordinate parents:** Parent tasks (work orders) are updated with latest child est due date
8. **Coordinate POs:** PO tasks are updated with latest work order est due date
