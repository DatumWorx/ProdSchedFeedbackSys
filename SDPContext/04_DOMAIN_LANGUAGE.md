# Domain Language

## Production Metrics & Terminology

### PPM (Parts Per Minute)
- **Scheduled PPM**: Target production rate set during subtask creation (Quantity ÷ Process Time)
- **Actual PPM**: Real production rate calculated from production data (parts ÷ time worked)
- **PPM Comparison**: Used to measure productivity (Actual vs Scheduled)

### Productivity Metrics
- **% Productive Time**: Percentage of actual productive time vs ideal/scheduled time
- **Productivity %**: (Actual PPM ÷ Scheduled PPM) × 100
- **Ideal vs Actual**: Comparison between planned and real performance

### Capacity Metrics
- **Total Time**: Process Time × Quantity (calculated in minutes)
- **Minutes Available**: Total capacity for a department/day
- **Minutes Scheduled**: Time allocated to scheduled tasks
- **Capacity Utilization**: (Minutes Scheduled ÷ Minutes Available) × 100
- **Utilization vs Payroll Hours**: Comparison of scheduled capacity to actual labor hours

### Quality Metrics
- **QC Completion Rate**: Percentage of jobs with completed QC entries
- **Defects per Job/Operator**: Quality performance tracking
- **Scrap Counts**: Material waste tracking

### Performance Metrics
- **PO On-Time / Early %**: Primary customer satisfaction metric
- **Schedule Adherence**: Percentage of jobs completed as scheduled
- **Bottleneck Identification**: Finding capacity constraints in production flow

## Scheduling Terminology

### Scheduling Layers
- **Planning Layer**: Production Manager - weeks out, capacity commitment and allocation
- **Scheduling Layer**: Production Supervisor - days out, routing-based scheduling with offsets
- **Sequencing Layer**: Department Lead - today, real-time task sequencing within scheduled windows

### Scheduling Concepts
- **Backward Scheduling**: Working backward from due dates using total time (minutes)
- **Sequential Scheduling**: Tasks scheduled in sequence with 15-minute changeover windows
- **Start/End Date Windows**: Range of dates for department execution (Scheduling Layer)
- **Capacity Commitment**: Week-level allocation of production capacity (Planning Layer)
- **At-Risk Tasks**: Tasks with insufficient time between today and due date

### Work Schedule Terminology
- **Working Minutes**: 510 minutes/day (8.5 hours - 60 minutes breaks)
- **Effective Capacity**: 450 minutes/day after breaks
- **90% Capacity Rule**: Multi-day jobs use 405 minutes/day (90% of 450) for backward scheduling
- **20% Buffer**: Applied to production time calculations for safety margin
- **Changeover Windows**: 15-minute windows between sequential tasks

## Task & Workflow Terminology

### Task Types
- **Work Order (WO)**: Engineering-created task with "- WO" suffix, contains PDF work order document
- **Subtask**: Production task created by Subtask-Generator_SDP, represents a part/department job
- **Production Task**: General term for tasks operators execute on production floor

### Task Lifecycle Stages
- **SDP Calendar**: Entry point for Sales team to submit new orders
- **Scheduling Project**: Where work orders are moved after Engineering creates them, where automation tools operate
- **Department Projects**: Where subtasks are created and production floor operators access their jobs
- **Job Started**: Custom field set when operator starts a job via ProductionData
- **Mid-Check**: Data entry point during production (parts count, time tracking)

### Task Custom Fields
- **Scheduled PPM**: Target production rate (set by Subtask-Generator, read by ProductionData)
- **Total Time**: Process Time × Quantity in minutes (set by Subtask-Generator, used by SchedulingCalculatorTool)
- **Process Time**: Time per part in minutes (input for Total Time and Scheduled PPM calculations)
- **Prod Dept**: Production department assignment (used by all systems for filtering)
- **Job Started**: Timestamp when operator starts job (set by ProductionData)
- **Start/Due Dates**: Calculated dates (set by SchedulingCalculatorTool, read by all systems)
- **Actual PPM**: Real production rate (set by ProductionData, analyzed by Scheduler)
- **Productivity**: Percentage (Actual PPM ÷ Scheduled PPM)
- **Percentage Complete**: Job completion percentage
- **Shifts**: Number of shifts required (calculated as (Total Time × 1.2) ÷ 450 with 20% buffer)

## Department & Machine Terminology

### Departments
- **Water Jets**: Department name (also "WaterJet" in some contexts)
- **Routers**: Router department
- **Saws**: Saw department
- **Presses**: Press department
- **Assembly**: Assembly department
- **Sampling**: Specialized department for sample orders

### Machine Naming
- **Water Jets**: M2, M3 (machine identifiers)
- **Routers**: Machines 1-5 (numbered routers)
- **Presses**: Press 1, Press 2
- **Assembly**: Assembly 1, Assembly 2
- **Mill**: Separate from Routers (Routers cannot move to Mill)

### Machine Interchangeability Terms
- **Fully Interchangeable**: Machines can be used interchangeably in both directions
- **Bidirectional**: Tasks can move between machines in either direction
- **One-Way Only**: Tasks can move in one direction but not reverse (e.g., M2 → M3 but not M3 → M2)
- **No Interchangeability**: Machines cannot be substituted (e.g., Routers cannot move to Mill)

## Process Terminology

### Workflow Stages
- **Order Entry**: Sales team submits orders to SDP Calendar
- **Work Order Creation**: Engineering creates work orders from PO PDF/CAD files
- **Subtask Creation**: Automated creation of production subtasks from work orders
- **Scheduling**: Calculation of realistic start/end dates based on capacity
- **Production Execution**: Operators execute tasks on production floor
- **Production Tracking**: Collection of actual production metrics (PPM, productivity, QC)
- **Feedback Loop**: Actual PPM data feeding back to scheduling system

### Data Flow Terms
- **Data Flows Upward**: Operators → Leads → Supervisor → Manager
- **Priorities Flow Downward**: Manager → Supervisor → Leads → Operators
- **Scheduling Flows**: Planning → Scheduling → Sequencing → Execution
- **Tool Activation Point**: When work orders enter Scheduling Project, automation tools activate

## Business Process Terminology

### Business Processes (Documentation & Context Needed)
- **Sales Order Entry**: Sales team workflow for submitting orders to SDP Calendar
- **Engineering Work Order Creation**: Engineering review of PO PDF/CAD files and program development
- **Work Order Review and Approval**: Engineering review process before moving to Scheduling Project

### Automation Opportunities
- **Subtask Creation**: Automated subtask generation with BOM calculation
- **Scheduling**: Automated date calculations based on capacity
- **Production Tracking**: Automated QC data collection and PPM calculations
- **Attachment Management**: Automated catch-up tools for ensuring subtask attachment completeness
- **Field Recalculation**: Automated updates to derived custom fields when source values change

## Naming Conventions

### Task Naming
- **Work Orders**: Task title ends with " - WO" to identify as work order
- **Department Projects**: Named by department (Water Jets, Routers, Saws, Presses, Assembly, Sampling)

### Project Naming
- **SDP Calendar**: Entry point project (`1208514675798267`)
- **Scheduling Project**: Production management project (`1210976309014176`)
- **Department Projects**: Named by department (Water Jets, Routers, etc.)

### Code/Repository Naming
- **Subtask-Generator_SDP**: Tool for automated subtask creation
- **SchedulingCalculatorTool**: Tool for calculating realistic schedules
- **ProductionData**: Tool for tracking production metrics
- **SDPAgent**: AI assistant for SDP workflows
- **ProdMgmtAPP**: Central management platform (target architecture)
- **Scheduler2.0**: Unified Next.js application combining Subtask-Generator, Schedule Calculator, Production Calculator, PO Search, and Attachment Fixer

## Internal Language & Context

### Key Phrases
- **"Tribal Knowledge"**: Scheduling precision that depends on undocumented expertise
- **"Fragmented Data"**: Data exists but is separated across QC sheets, Asana, spreadsheets
- **"Misaligned Expectations"**: Production expectations sometimes don't match reality
- **"Central Coordination Hub"**: Asana's role as source of truth for task management
- **"Three-Layer Model"**: Planning → Scheduling → Sequencing organizational structure

### Decision-Making Language
- **"Clarity beats cleverness"**: Non-negotiable principle for system design
- **"Respect shop-floor reality"**: Systems must account for actual operational constraints
- **"Tool Activation Point"**: Critical concept that automation only begins when work orders are in Scheduling Project

## Catch-Up & Data Quality Terminology

### Attachment Management
- **Attachment Fixer**: Catch-up utility for identifying and attaching missing PDF/Excel files to subtasks
- **Incomplete Subtask**: Subtask missing required PDF or Excel attachment
- **Parent Work Order**: Work order task that contains subtasks and source attachments
- **Intelligent Matching**: Algorithm-based suggestion of best-matching attachments based on subtask name similarity
- **Attachment Completeness**: Data quality metric ensuring all subtasks have required documentation

### Field Recalculation
- **Recalculate Function**: Updates derived custom fields (Total Time, Scheduled PPM, Shifts) when Process Time changes
- **Derived Fields**: Custom fields calculated from source values (e.g., Total Time from Process Time × Quantity)
- **Source Field**: Input field used for calculations (e.g., Process Time, Quantity)

## Production Planning Terminology

### Production Calculator
- **What-If Scenarios**: Interactive analysis by adjusting variables to see production projections
- **Capacity Utilization**: (Minutes Scheduled ÷ Minutes Available) × 100
- **Time to Complete**: Projected time remaining based on current production rate
- **Parts Produced in Time**: Projected parts that can be produced in available time
- **Performance Analysis**: Comparison of actual vs scheduled production metrics

### Task Discovery
- **PO Search**: Tool for finding tasks by PO number across Asana projects
- **Task Discovery**: Process of locating work orders and related subtasks in Asana
- **Cross-Project Search**: Searching for tasks across multiple Asana projects simultaneously

## Scheduling Modes

### Schedule Calculation Types
- **Backward Scheduling**: Calculate start date working backward from due date (default mode)
- **Forward Scheduling**: Calculate finish/end date working forward from start date
- **Run Next**: Schedule task immediately after the last task in current sequence
- **Preview Mode**: Show schedule calculations without pushing updates to Asana

## Domain Language Summary

**Key Principle**: When building for SDP, use SDP's language. Don't introduce generic terms when SDP-specific terminology exists. The domain language reflects how the business actually operates, not how software typically works.
