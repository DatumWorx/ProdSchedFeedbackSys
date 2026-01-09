# Known Failure Modes

## Past Attempts That Failed

### Scheduling System Failures

**Problem**: Asana Timeline view was unusable due to not accounting for breaks and offshift time.

**Why It Failed**:
- Asana's default scheduling assumes continuous work hours
- Didn't account for breaks (10:00-10:15 AM, 12:00-12:30 PM, 2:00-2:15 PM)
- Didn't account for actual work schedule (7 AM - 3:30 PM)
- Timeline view showed unrealistic dates

**Solution**: SchedulingCalculatorTool accounts for actual capacity (450 minutes/day after breaks) and work schedule constraints.

**Lesson**: Scheduling tools must account for real-world constraints, not theoretical capacity.

---

### Fragmented Data Systems

**Problem**: Data existed but was fragmented across QC sheets, Asana, and spreadsheets.

**Why It Failed**:
- No single source of truth
- Manual coordination required to connect data
- Disconnected systems created information silos
- Production expectations misaligned with reality

**Solution**: Integration with Asana as central hub, ProductionData feeds metrics back to Asana, ProdMgmtAPP will provide unified view.

**Lesson**: Integration beats isolation. Data must flow between systems.

---

### Manual Subtask Creation Overhead

**Problem**: Majority of manager's time spent manually creating subtasks.

**Why It Failed**:
- Manual process didn't scale
- Human error in calculations (Total Time, Scheduled PPM, Shifts)
- Time-consuming repetitive work
- Couldn't keep up with workload

**Solution**: Subtask-Generator_SDP automates subtask creation with BOM calculation, Total Time, Scheduled PPM calculations.

**Lesson**: Automate repetitive, error-prone manual work to free up management time for value-added activities.

---

### Advanced Scheduler Without Support

**Problem**: Scheduler project had advanced features (capacity balancing, machine interchangeability, PDF time extraction) but was too advanced for its time and didn't have the support it needed.

**Why It Failed**:
- Too sophisticated for current state of operations
- Didn't have clear integration path
- Significant investment but limited adoption
- Advanced features not needed yet

**Current Status**: Functional but standalone. Logic should eventually be integrated into ProdMgmtAPP when operations are ready.

**Lesson**: Build for current needs, not hypothetical future needs. Advanced features need organizational readiness and support structure.

---

## Approaches That Were Rejected

### Separate Task Management Systems

**Rejection**: Creating custom task management systems instead of using Asana.

**Why Rejected**:
- Asana already established and used by Sales, Engineering, Production
- Integration would be complex
- Would create duplicate systems
- People already trained on Asana

**Principle**: Asana is source of truth - integrate with it, don't replace it.

---

### Ignoring Machine Interchangeability Rules

**Rejection**: Treating all machines within a department as fully interchangeable.

**Why Rejected**:
- Doesn't reflect physical reality (e.g., Routers can't move to Mill)
- Water Jets have one-way interchangeability (M2 → M3, but not reverse)
- Ignoring these rules causes scheduling errors
- Leads to unrealistic capacity allocations

**Principle**: Systems must respect shop-floor reality, including machine-specific constraints.

---

### Theoretical Capacity Calculations

**Rejection**: Using theoretical capacity (8.5 hours = 510 minutes) without accounting for breaks.

**Why Rejected**:
- Creates unrealistic schedules
- Asana Timeline view becomes unusable
- Leads to missed deadlines
- Doesn't match actual production capacity

**Principle**: Use effective capacity (450 minutes/day after breaks) and account for real-world constraints.

---

### Over-Automation of Business Processes

**Rejection**: Attempting to automate Sales order entry and Engineering work order creation.

**Why Rejected**:
- These are core business functions requiring human judgment and expertise
- Engineering program development requires technical creativity
- Sales customer communication requires relationship management
- Automation would break workflows that depend on human expertise

**Principle**: Some processes need documentation and context for AI agents, not automation. Know the difference.

---

### Standalone Solutions Without Integration

**Rejection**: Building tools that don't integrate with existing ecosystem.

**Why Rejected**:
- Creates data silos
- Requires manual coordination
- Doesn't enable visibility
- Duplicates effort

**Principle**: Integration over isolation. Tools must work together.

---

## Cultural Landmines

### Changing Too Much At Once

**Problem**: Attempting to transform entire system simultaneously.

**Why It Fails**:
- Overwhelms users
- Too many moving parts
- Hard to identify what's working vs. what's broken
- Creates resistance to change

**Approach**: Modular transformation - one tool at a time, integrate gradually.

---

### Ignoring Tribal Knowledge

**Problem**: Dismissing undocumented expertise as "not scalable" without capturing it first.

**Why It Fails**:
- Loses critical operational knowledge
- Systems don't account for real constraints
- Creates solutions that don't work in practice
- Frustrates experienced employees

**Approach**: Document tribal knowledge, incorporate into systems, respect expertise.

---

### Perfect Solution Syndrome

**Problem**: Waiting for perfect solution instead of solving immediate problems.

**Why It Fails**:
- Nothing gets built
- Problems persist
- Opportunity cost of delay
- Perfect is the enemy of good

**Approach**: Build working solutions that solve real problems, iterate based on feedback.

---

### Technology-Driven Solutions

**Problem**: Choosing technology first, then trying to fit business to it.

**Why It Fails**:
- Solutions don't match business needs
- Users don't adopt
- Creates friction instead of efficiency
- Wastes time and money

**Approach**: Understand business needs first, then choose appropriate technology.

---

## Common Failure Patterns to Avoid

### Building Before Understanding

**Failure**: Starting to code before understanding business context, workflows, and constraints.

**Prevention**: Use Business Context Pack, document workflows, understand domain language, respect shop-floor reality.

---

### Ignoring Feedback Loops

**Failure**: Building one-way systems that don't learn from actual performance.

**Prevention**: Implement feedback loops (ProductionData → SchedulingCalculatorTool), track metrics, use actual data to improve.

---

### Assuming Standardization

**Failure**: Building systems that assume standardized processes when business is high-mix, low-volume.

**Prevention**: Design for flexibility, support variability, accommodate custom work orders, respect uniqueness of each job.

---

### Duplicating Instead of Integrating

**Failure**: Creating duplicate systems instead of integrating with existing tools.

**Prevention**: Integrate with Asana, SharePoint, existing tools. Avoid standalone solutions.

---

### Over-Engineering Solutions

**Failure**: Building complex solutions when simple ones work.

**Prevention**: Clarity over cleverness. Build minimum viable solution, iterate based on actual needs.

---

## Lessons Learned Summary

1. **Account for Real Constraints**: Breaks, work schedules, machine rules - not theoretical capacity
2. **Integrate, Don't Isolate**: Tools must work together, Asana is source of truth
3. **Automate Repetitive Work**: Manual subtask creation, scheduling calculations - automate these
4. **Document, Don't Automate Everything**: Sales, Engineering workflows need documentation, not automation
5. **Respect Expertise**: Tribal knowledge has value - capture and incorporate it
6. **Build Modularly**: One tool at a time, integrate gradually
7. **Feedback Loops Matter**: Systems must learn from actual performance
8. **Clarity Over Cleverness**: Simple, understandable solutions beat complex ones
9. **Current Needs First**: Build for today's problems, not hypothetical future needs
10. **Understand Before Building**: Business context is foundation for good solutions

## Failure Mode Prevention Checklist

When starting a new project or feature, ask:

- [ ] Does this account for actual operational constraints?
- [ ] Does this integrate with Asana (or other established systems)?
- [ ] Have we documented the workflow before automating?
- [ ] Are we building for current needs or hypothetical future?
- [ ] Is this clear and maintainable, or overly clever?
- [ ] Does this respect shop-floor reality?
- [ ] Are we duplicating existing functionality?
- [ ] Does this support the three-layer model (Planning → Scheduling → Sequencing)?
- [ ] Have we captured tribal knowledge before replacing it?
- [ ] Are we trying to change too much at once?

If answers reveal potential failure modes, reconsider the approach.
