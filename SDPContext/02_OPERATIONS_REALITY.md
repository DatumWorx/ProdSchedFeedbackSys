# Operations Reality

## Physical Operations Structure

### Departments & Machines

**Production Departments**:
- **Water Jets**: Machines M2, M3 (M2 → M3 allowed, but not reverse)
- **Routers**: Machines 1-5 (fully interchangeable, but NO routers can move to Mill)
- **Saws**: Department-specific machines
- **Presses**: Press 1 ↔ Press 2 (bidirectional interchangeability)
- **Assembly**: Assembly 1 ↔ Assembly 2 (bidirectional interchangeability)
- **Sampling**: Specialized department for sample orders

**Machine Interchangeability Rules**:
- Routers 1-5: Fully interchangeable (bidirectional), but NO routers can move to Mill
- Water Jets: M2 → M3 allowed (one-way only), M3 → M2 NOT allowed
- Presses: Press 1 ↔ Press 2 (bidirectional)
- Assembly: Assembly 1 ↔ Assembly 2 (bidirectional)
- Saws: No interchangeability rules defined

### Work Schedule & Capacity

**Standard Work Schedule**:
- **Hours**: 7:00 AM - 3:30 PM (15:30) Monday-Friday
- **Breaks**:
  - 10:00-10:15 AM (15 min)
  - 12:00-12:30 PM (30 min)
  - 2:00-2:15 PM (15 min)
- **Total Working Minutes**: 510 minutes/day (8.5 hours - 60 minutes breaks)
- **Effective Capacity**: 450 minutes/day after breaks
- **Multi-Day Jobs**: Use 405 minutes/day (90% of 450) for backward scheduling
- **20% Buffer**: Applied to production time calculations

**Capacity Constraints**:
- Department-specific capacity (minutes/day)
- Sequential scheduling with 15-minute changeover windows
- No production on weekends
- Work schedule awareness required for all scheduling calculations

## Organizational Hierarchy

```
General Manager
      ↓
├── Sales Director
│      ↓
│   └── Sales Team (Order Entry - SDP Calendar)
├── Operations Manager
│      ↓
│   ├── Engineering Team (Work Order Creation - PO PDF/CAD → Scheduling Project)
│   ├── Production Manager (Planning Layer - Weeks Out)
│   ├── Purchasing Agent
│   └── Estimator
└── Accountant
      ↓
Production Supervisor (Scheduling Layer - Days Out)
      ↓
Department Leads (Sequencing Layer - Today)
  - WaterJet, Router, Saw, Press, Assembly
      ↓
Production Operators (Execution - Access via Department Asana Projects)
```

### Role Responsibilities

**Production Manager**:
- Planning Layer (weeks out)
- Capacity commitment and allocation
- Week-of-production assignments
- 24-hour scheduling responses to new orders

**Production Supervisor**:
- Scheduling Layer (days out)
- Routing-based scheduling with offsets
- Start/end date windows for departments
- Requires Production Manager approval
- Accounts for material availability, dependencies

**Department Leads**:
- Sequencing Layer (today)
- Real-time task sequencing within scheduled windows
- Priority management within department
- Operator assignment
- Daily execution adjustments

**Production Operators**:
- Execution layer
- Access jobs via department Asana projects
- Track production metrics (job starts, mid-checks, QC data)
- Feed actual performance data back to scheduling system

## Order-to-Production Workflow

### Complete Workflow Stages

1. **Sales Team** → Submits new orders to **SDP Calendar** project
   - Creates initial order tasks in SDP Calendar
   - Provides customer requirements and order details
   - Attaches customer documents (PO PDFs, specifications)

2. **Engineering Team** → Processes orders from SDP Calendar
   - Reviews PO PDF and CAD files provided with the order
   - Develops CNC machine programs based on CAD files
   - Creates PDF Work Order (WO) document with production instructions
   - Attaches PDF WO to a subtask on the SDP Calendar project (task title ends with " - WO")
   - Moves the work order task to the **Scheduling Project**

3. **Scheduling Project** → Automated tools take over
   - Work orders identified by "- WO" suffix in task title
   - Work orders organized in sections: "Scheduling (date)" and "Sub-Task, QC Sheet"

4. **Subtask-Generator_SDP (Scheduler2.0)** → Creates production subtasks
   - Creates subtasks per part/department
   - Calculates BOM, Total Time, Scheduled PPM
   - Each subtask added to respective Asana department project (Water Jets, Routers, Saws, Presses, Assembly, Sampling)
   - **Recalculate Function**: Updates derived custom fields (Total Time, Scheduled PPM, Shifts) when Process Time changes without recreating subtasks

5. **SchedulingCalculatorTool (Scheduler2.0)** → Calculates realistic schedules
   - Works backward from due dates using total time (minutes)
   - Accounts for breaks, changeover time, work schedule
   - Preview mode: Shows schedule projections without pushing to Asana
   - Supports forward scheduling (start date → finish date) and "Run Next" sequential scheduling
   - Calendar and Gantt view visualizations

6. **Production Floor Execution** → Operators access tasks via department Asana projects
   - Operators see subtasks in their department's Asana project
   - ProductionData interface allows operators to start jobs, enter mid-check data

7. **ProductionData** → Tracks production metrics
   - Calculates actual PPM, productivity %
   - Updates Asana custom fields (Actual PPM, Productivity, Percentage Complete)

8. **Feedback Loop** → ProductionData actual PPM → SchedulingCalculatorTool
   - For future schedule adjustments (needs implementation)
   - Improves scheduling accuracy based on actual performance

### Supporting Tools & Catch-Up Utilities

**Scheduler2.0 Unified Interface** provides multiple tools in one application:

9. **Production Calculator (Scheduler2.0)** → Interactive production planning tool
   - Calculate production metrics: Total Time, Scheduled PPM, Actual PPM, Productivity %, Shifts
   - Capacity analysis: Minutes available, minutes scheduled, capacity utilization
   - What-if scenarios: Adjust variables to see production projections instantly
   - Performance analysis: Compare actual vs scheduled performance
   - Supports production planning and capacity decisions

10. **PO Search (Scheduler2.0)** → Task discovery and navigation
    - Search for tasks by PO number across Asana projects
    - Quick access to work orders and related subtasks
    - View task details, custom fields, dates, and project memberships
    - Improves workflow efficiency for finding and reviewing orders

11. **Attachment Fixer (Scheduler2.0)** → Data completeness catch-up tool
    - Identifies subtasks missing PDF or Excel attachments
    - Groups subtasks by PO number and work order for efficient review
    - Intelligent PDF matching: Suggests best-matching attachments based on subtask name similarity
    - Manual attachment selection: Dropdown to choose from parent work order attachments
    - One-click attachment: Attaches files directly to subtasks
    - Automatic cleanup: Removes subtasks from list after successful attachment
    - **Workflow Impact**: Ensures production floor has all required documentation before execution begins
    - **Data Quality**: Addresses gaps in attachment completeness that could delay production

## Operational Constraints & Variability

### Where Variability Exists
- **Production Rates**: Actual PPM can vary from scheduled PPM
- **Material Availability**: Material timing affects schedule execution
- **Machine Availability**: Maintenance, breakdowns, setup time
- **Operator Productivity**: Varies by operator, job complexity, experience
- **Changeover Time**: 15-minute windows between sequential tasks
- **Quality Issues**: Defects requiring rework or scrap

### What Cannot Be Automated (Yet)
- **Engineering Program Development**: Requires technical expertise and creativity
- **Sales Customer Communication**: Relationship management and requirements gathering
- **Production Execution**: Physical manufacturing work
- **Quality Decisions**: Human judgment on QC review and approval
- **Material Procurement**: Requires vendor relationships and negotiation
- **Operator Assignment**: Leads make sequencing decisions based on real-time conditions

### Department-Specific Requirements
- **WaterJet**: Material handler visibility required
- **Router**: Tooling inventory, router-bed consumables
- **Saw**: Drill/counterbore path visibility
- **Press**: Die/tooling access, press setup notes
- **Assembly**: Upstream component readiness visibility

## Data Flow Reality

### Data Flows Upward
- Operators → Leads → Supervisor → Manager
- Production metrics, QC data, schedule adherence

### Priorities Flow Downward
- Manager → Supervisor → Leads → Operators
- Capacity commitments, schedule windows, daily priorities

### Scheduling Flows
- Planning → Scheduling → Sequencing → Execution
- Week-level → Day-level → Hour-level → Real-time

### Tool Activation Point
**Critical Understanding**: All production management tools (Subtask-Generator, SchedulingCalculatorTool, etc.) **only operate on work orders that are in the Scheduling Project**. 

- Pre-Scheduling: Sales and Engineering workflows (business processes)
- Scheduling Project: Automation begins
- Department Projects: Production execution (operators access jobs via department-specific Asana projects)

### Catch-Up and Data Quality Tools

**Attachment Fixer** operates on subtasks in the "Sub-Task, QC Sheet" section of the Scheduling Project:
- Scans all department projects for incomplete subtasks (subtasks without PDF/Excel attachments)
- Matches subtasks to parent work orders by PO number
- Enables bulk attachment of missing files to ensure data completeness
- **Workflow Impact**: Prevents production delays from missing documentation, ensures operators have required files before job execution

**Recalculate Function** enables field updates without recreating subtasks:
- Updates Total Time, Scheduled PPM, and Shifts when Process Time changes
- Maintains subtask history and relationships
- **Workflow Impact**: Allows corrections to production estimates without disrupting existing subtask structure
