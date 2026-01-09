# Business Context – Special Design Products (SDP)

## What This Company Is
Special Design Products is a custom packaging manufacturer specializing in engineered foam and plastic dunnage solutions for industrial customers.

## How We Actually Make Money
- High-mix, low-volume custom jobs
- Margins are protected by accurate scheduling, material timing, and labor utilization
- Missed dates and poor sequencing destroy trust and margin
- Revenue drivers: Custom job orders from industrial customers
- Cost drivers: Labor, materials, machine capacity, schedule inaccuracy

## What Is Broken Today
- Scheduling precision depends on tribal knowledge
- Data exists but is fragmented (QC sheets, Asana, spreadsheets)
- Production expectations are sometimes misaligned with reality
- Manual subtask creation consumes majority of management time
- Asana Timeline view unusable due to not accounting for breaks/offshift
- QC data tracked in separate spreadsheets, disconnected from Asana
- Multiple disconnected tools, no unified view

## What We Are Building Toward
- Data-driven scheduling and capacity planning
- Clear ownership: Supervisors schedule, Leads execute, PM oversees
- AI-assisted planning, validation, and reporting
- Integrated production management system (ProdMgmtAPP) bringing all tools together
- Automated workflows replacing manual coordination
- Real-time visibility into production status across all departments
- **Unified Scheduler Tool (Scheduler2.0)**: Combines subtask generation, scheduling calculations, production metrics, and catch-up utilities in one interface
- **Attachment Management**: Automated catch-up tools for ensuring subtasks have required PDF/Excel attachments
- **Production Planning Tools**: Interactive calculators for production metrics, capacity analysis, and what-if scenarios
- **Data Completeness**: Tools to identify and fix missing attachments, ensuring production floor has all required documentation

## Non-Negotiables
- Must work with Asana (central task management system)
- Must respect shop-floor reality
- Clarity beats cleverness
- Must maintain data flow between systems
- Must enable cross-departmental visibility
- Must account for actual work schedule constraints (7 AM - 3:30 PM, breaks, capacity)

## Three-Layer Scheduling Model
- **Planning Layer** (Production Manager - Weeks Out): Capacity commitment and allocation
- **Scheduling Layer** (Production Supervisor - Days Out): Routing-based scheduling with offsets
- **Sequencing Layer** (Department Lead - Today): Real-time task sequencing within scheduled windows

## Current Transformation Status
Transitioning from manual, spreadsheet-based processes to integrated, automated production management system. Multiple specialized tools work together with Asana as the central coordination hub.

**Scheduler2.0** provides a unified interface combining:
- **Subtask Generator**: Automated subtask creation with BOM calculation and custom field population
- **Schedule Calculator**: Realistic scheduling with work hours, breaks, and capacity constraints (preview mode)
- **Production Calculator**: Interactive tool for production metrics, capacity analysis, and projections
- **PO Search**: Quick task discovery by PO number across Asana projects
- **Attachment Fixer**: Catch-up utility to identify and attach missing PDF/Excel files to subtasks
- **Recalculate Function**: Update derived custom fields (Total Time, Scheduled PPM, Shifts) when Process Time changes
