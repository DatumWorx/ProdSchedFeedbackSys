# SDP Business Context Pack

## Purpose

This Business Context Pack provides **institutional memory for AI**: a way to carry *intent, constraints, language, and priorities* forward so every new Cursor project starts aligned instead of rediscovering the business from scratch.

**Core Idea**: One authoritative, compact, structured "Business Context Capsule" that:
- Is **stable** (doesn't change every week)
- Is **machine-readable** (LLMs can reason over it)
- Is **human-readable** (you can sanity-check it)
- Can be **dropped into Cursor** and instantly orient the AI

Think of it as: **README + Operating Manual + Constraints + Vocabulary + North Star**

## Folder Structure

```
/SDPContext/
├── 00_CONTEXT_SUMMARY.md        ← START HERE (MANDATORY)
├── 01_BUSINESS_MODEL.md
├── 02_OPERATIONS_REALITY.md
├── 03_TECH_STACK_AND_CONSTRAINTS.md
├── 04_DOMAIN_LANGUAGE.md
├── 05_DECISION_PRINCIPLES.md
├── 06_KNOWN_FAILURE_MODES.md
└── README.md                     ← This file
```

## How to Use This Pack

### For New Cursor Projects

1. **Copy the `/SDPContext/` folder** into your new Cursor repository
2. Start every Cursor session with:
   > "Use the files in /SDPContext as authoritative business context for this project."
3. The AI will now understand SDP's business model, operational reality, technical constraints, and decision principles

### For Existing Projects

1. Reference these files when making decisions or building features
2. Update files as business context evolves (especially stable core files)
3. Use domain language consistently across code and documentation

## File Descriptions

### 00_CONTEXT_SUMMARY.md (MANDATORY)
**Purpose**: Instant orientation. If an LLM reads *only this*, it should "get" SDP.

**Contents**:
- What SDP is
- How SDP makes money
- What's broken today
- What SDP is building toward
- Non-negotiables
- Three-layer scheduling model
- Current transformation status

**When to Use**: Always. This is the first file any AI agent should read.

---

### 01_BUSINESS_MODEL.md
**Purpose**: Prevent AI from making "startup SaaS" assumptions.

**Contents**:
- Revenue model (custom manufacturing, high-mix low-volume)
- Cost structure (labor, materials, capacity)
- Margin protection mechanisms
- Business success metrics
- Business model characteristics

**When to Use**: When building features that affect revenue, costs, or margins.

---

### 02_OPERATIONS_REALITY.md
**Purpose**: Ground AI in physical constraints.

**Contents**:
- Departments & machines (with interchangeability rules)
- Work schedule & capacity (7 AM - 3:30 PM, breaks, capacity)
- Organizational hierarchy
- Complete order-to-production workflow
- Operational constraints & variability
- What cannot be automated (yet)

**When to Use**: When building scheduling, capacity planning, or production management features.

---

### 03_TECH_STACK_AND_CONSTRAINTS.md
**Purpose**: Prevent tool drift and tech chaos.

**Contents**:
- Core systems (Asana, SharePoint - non-negotiable)
- Allowed technologies (Python, Node.js, Next.js, Vue.js, etc.)
- Integration expectations
- Discouraged technologies
- Configuration management
- Code organization constraints

**When to Use**: When choosing technologies, designing integrations, or making technical decisions.

---

### 04_DOMAIN_LANGUAGE.md
**Purpose**: Teach AI how *SDP talks*.

**Contents**:
- Production metrics & terminology (PPM, productivity, capacity)
- Scheduling terminology (layers, backward scheduling, windows)
- Task & workflow terminology (work orders, subtasks, department projects)
- Department & machine terminology
- Business process terminology
- Naming conventions

**When to Use**: When writing code, documentation, or communicating with stakeholders.

---

### 05_DECISION_PRINCIPLES.md
**Purpose**: Encode leadership judgment.

**Contents**:
- Core principles (clarity over cleverness, respect shop-floor reality)
- Organizational principles (three-layer model, data flows)
- Technical principles (integration over isolation)
- Business principles (margin protection, on-time delivery)
- Design principles (tool activation point, feedback loops)
- Decision-making framework

**When to Use**: When making design decisions, evaluating trade-offs, or determining approach.

---

### 06_KNOWN_FAILURE_MODES.md
**Purpose**: Institutional memory to prevent repeating mistakes.

**Contents**:
- Past attempts that failed (scheduling failures, fragmented data, manual overhead)
- Approaches that were rejected (separate task systems, ignoring constraints)
- Cultural landmines (changing too much, ignoring tribal knowledge)
- Common failure patterns to avoid
- Lessons learned summary
- Failure mode prevention checklist

**When to Use**: When evaluating new approaches, designing systems, or making architectural decisions.

## Integration with Cursor

### Best Practice Workflow

1. Create a **`/SDPContext/`** folder in every new Cursor repo
2. Drop in at least:
   - `00_CONTEXT_SUMMARY.md`
   - `03_TECH_STACK_AND_CONSTRAINTS.md`
3. Start every Cursor session with:
   > "Use the files in /SDPContext as authoritative business context for this project."

That's it. You've just given Cursor **organizational memory**.

## Why This Structure Works

| One Big Doc            | Context Pack   |
| ---------------------- | -------------- |
| Hard to maintain       | Modular        |
| AI loses signal        | High signal    |
| People don't update it | Easy to evolve |
| Context drifts         | Stable core    |

## Forward-Looking Vision

What you're building is the foundation for:
- **SDPAgent** consuming these files as system context
- MCP servers serving context dynamically
- Versioned business memory (2024 vs 2026 SDP)
- Re-usable consulting accelerators for Datum Works

You're not just capturing context—you're **productizing understanding**.

## Maintenance

### When to Update Files

- **00_CONTEXT_SUMMARY.md**: When core business model or direction changes
- **01_BUSINESS_MODEL.md**: When revenue/cost structure shifts significantly
- **02_OPERATIONS_REALITY.md**: When departments, machines, or workflows change
- **03_TECH_STACK_AND_CONSTRAINTS.md**: When core systems or technology decisions change
- **04_DOMAIN_LANGUAGE.md**: When terminology or naming conventions evolve
- **05_DECISION_PRINCIPLES.md**: When leadership judgment or principles shift
- **06_KNOWN_FAILURE_MODES.md**: When new failures are discovered or patterns emerge

### Update Philosophy

- **Stable Core**: 00_CONTEXT_SUMMARY.md should change rarely
- **Evolving Context**: Other files can evolve as business context changes
- **Balance**: Don't update so frequently that context becomes unstable, but update when reality changes

## Related Documentation

- `/docs/context/PROJECT_CONTEXT.md` - Detailed project ecosystem documentation
- `/docs/context/PROJECT_ECOSYSTEM_ANALYSIS.md` - Technical analysis of SDP projects
- `/docs/context/SCHEDULING_SYSTEM_REVIEW.md` - Current state and future state of scheduling
- `/docs/context/SCHEDULING_WORKFLOW_CONTEXT.md` - Detailed scheduling workflow

---

*Last Updated: 2025-01-27*
*Purpose: Provide stable business context foundation for all SDP projects*
*Maintained By: Datum Works / SDP Development Team*
