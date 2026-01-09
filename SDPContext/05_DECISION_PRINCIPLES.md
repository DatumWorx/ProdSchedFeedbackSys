# Decision Principles

## Core Principles

### Clarity Over Cleverness
**Principle**: Prioritize clear, understandable solutions over clever or complex ones.

**Application**:
- Code should be readable and maintainable
- Systems should be explainable to non-technical users
- Documentation should be accessible
- Avoid over-engineering when simple solutions work

**Why**: SDP needs systems that people can understand, maintain, and trust. Clever solutions that no one can explain become liabilities.

### Respect Shop-Floor Reality
**Principle**: Systems must account for actual operational constraints, not theoretical ideals.

**Application**:
- Schedule calculations must include breaks, changeover time, actual capacity
- Machine interchangeability rules reflect physical reality, not convenience
- Department-specific requirements (material handling, tooling) must be considered
- Actual PPM feedback improves scheduling accuracy

**Why**: Systems that ignore reality fail in production. Theoretical capacity doesn't match real-world execution.

### Asana as Source of Truth
**Principle**: Asana is the central coordination hub - all tools must integrate with it, not replace it.

**Application**:
- All production management tools read from and write to Asana
- Custom fields coordinate data across systems
- Tasks flow through Asana projects (SDP Calendar → Scheduling Project → Department Projects)
- Don't create separate task management systems

**Why**: Asana is already established and used by Sales, Engineering, and Production. Integration is better than replacement.

## Organizational Principles

### Three-Layer Ownership Model
**Principle**: Clear ownership at each layer: Planning (PM) → Scheduling (Supervisor) → Sequencing (Lead).

**Application**:
- **Planning Layer** (Production Manager): Weeks out, capacity commitment and allocation
- **Scheduling Layer** (Production Supervisor): Days out, routing-based scheduling with offsets (requires PM approval)
- **Sequencing Layer** (Department Lead): Today, real-time task sequencing within scheduled windows

**Why**: Clear ownership prevents confusion, enables accountability, and distributes workload appropriately.

### Data Flows Upward, Priorities Flow Downward
**Principle**: Production metrics flow up the hierarchy; capacity commitments and priorities flow down.

**Application**:
- Operators feed actual performance data (PPM, productivity) upward
- Managers set capacity commitments and priorities that flow down
- Systems should support this bidirectional information flow
- Real-time visibility enables better decision-making at each layer

**Why**: This reflects how the organization actually makes decisions. Systems should support, not contradict, this flow.

### Automation Where It Adds Value, Documentation Where It Doesn't
**Principle**: Not everything needs automation. Some processes need documentation and context for AI agents.

**Application**:
- **Automate**: Subtask creation, scheduling calculations, production tracking
- **Document**: Sales order entry, Engineering work order creation, QC review processes
- **Provide Context**: Business processes that require human judgment and expertise

**Why**: Over-automation can break workflows. Some processes need human expertise; systems should support, not replace, that expertise.

## Technical Principles

### Integration Over Isolation
**Principle**: Tools should work together, not in isolation. Design for integration from the start.

**Application**:
- All tools integrate with Asana (central hub)
- Data flows between systems (ProductionData → SchedulingCalculatorTool feedback loop)
- ProdMgmtAPP will be integration hub for all tools
- Avoid standalone solutions that don't connect to ecosystem

**Why**: Fragmented tools create data silos and coordination overhead. Integration enables visibility and efficiency.

### Modular Over Monolithic
**Principle**: Build specialized tools that work together, not one giant system.

**Application**:
- Separate repositories for specialized tools (Subtask-Generator, SchedulingCalculatorTool, ProductionData)
- Each tool has clear purpose and integration points
- ProdMgmtAPP brings tools together in unified interface, but tools remain modular
- Clear separation of concerns

**Why**: Modular tools are easier to maintain, understand, and evolve. One giant system is hard to change.

### Stable Core, Evolving Extensions
**Principle**: Core business context should be stable; tools and features evolve on top.

**Application**:
- Business Context Pack (this folder) provides stable foundation
- Tools can evolve and change
- Core principles remain constant
- Domain language stays consistent

**Why**: Changing everything at once creates chaos. Stable foundation enables confident evolution.

## Business Principles

### Margin Protection Through Accuracy
**Principle**: Accurate scheduling, material timing, and labor utilization protect margins.

**Application**:
- Realistic capacity calculations prevent overcommitment
- Actual PPM feedback improves scheduling accuracy
- Material availability coordination prevents waste and delays
- Better sequencing maximizes productive time

**Why**: Missed dates and poor sequencing destroy trust and margin. Accuracy protects profitability.

### On-Time Delivery Drives Success
**Principle**: PO On-Time / Early % is primary customer satisfaction metric.

**Application**:
- Scheduling tools prioritize realistic date calculations
- Systems track schedule adherence
- Feedback loops improve accuracy over time
- Capacity planning prevents overcommitment

**Why**: Customer trust and repeat business depend on reliability. On-time delivery is non-negotiable.

### High-Mix, Low-Volume Flexibility
**Principle**: Each job is unique - systems must support flexibility and variability.

**Application**:
- Scheduling must handle custom work orders
- Machine interchangeability rules enable flexibility
- Department-specific requirements must be accommodated
- Quality is critical - defects are costly in custom work

**Why**: SDP's business model requires flexibility. Systems that assume standardization will fail.

## Design Principles

### Tool Activation Point Clarity
**Principle**: Automation tools only activate when work orders are in Scheduling Project.

**Application**:
- Sales and Engineering workflows are business processes (documentation needed)
- Production management tools operate on Scheduling Project tasks
- Clear handoff point: Engineering moves work orders to Scheduling Project
- Don't automate pre-Scheduling Project workflows without business process development

**Why**: This reflects actual workflow. Trying to automate before proper handoff creates confusion.

### Department Project Access Pattern
**Principle**: Production floor operators access jobs via department-specific Asana projects.

**Application**:
- Subtask-Generator creates subtasks in department projects (Water Jets, Routers, etc.)
- Each department has its own Asana project
- ProductionData tracks metrics via department projects
- Operators see only their department's tasks

**Why**: This is how production floor actually works. Systems should match reality, not impose different structure.

### Feedback Loops for Continuous Improvement
**Principle**: Actual performance data should feed back to improve scheduling accuracy.

**Application**:
- ProductionData collects actual PPM → should feed SchedulingCalculatorTool
- Scheduler analyzes patterns for capacity balancing
- QC data informs quality improvements
- Schedule adherence metrics inform capacity planning

**Why**: One-way systems don't learn. Feedback loops enable improvement and accuracy.

## Communication Principles

### Clear Communication Beats Perfect Systems
**Principle**: Even perfect systems fail if people don't understand how to use them.

**Application**:
- Document workflows clearly
- Provide context for AI agents
- Training materials for production floor
- Clear ownership and responsibilities

**Why**: Adoption requires understanding. Systems that confuse people don't get used.

### Context Over Code
**Principle**: Understanding business context is more valuable than writing code.

**Application**:
- Business Context Pack provides foundation
- Documentation explains "why" not just "how"
- Domain language reflects business reality
- Systems built on understanding work better

**Why**: Code without context creates solutions that don't fit. Context enables right solutions.

## Decision-Making Framework

When making decisions for SDP systems, ask:

1. **Does this respect shop-floor reality?** (breaks, capacity, machine rules)
2. **Does this integrate with Asana?** (source of truth, not replacement)
3. **Does this support the three-layer model?** (Planning → Scheduling → Sequencing)
4. **Does this improve accuracy?** (scheduling, material timing, labor utilization)
5. **Is this clear and maintainable?** (clarity over cleverness)
6. **Does this protect margins?** (on-time delivery, accurate scheduling)

If the answer to these questions is "yes", you're aligned with SDP's decision principles.
