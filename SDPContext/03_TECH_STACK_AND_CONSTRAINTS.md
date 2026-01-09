# Tech Stack and Constraints

## Core Systems (Non-Negotiable)

### Asana (Central Task Management)
- **Role**: Source of truth for all task tracking, timeline visualization, project coordination
- **Used By**: Sales Team, Engineering Team, SDPAgent, SchedulingCalculatorTool, Scheduler, Subtask-Generator_SDP, ProductionData, ProdMgmtAPP, **Scheduler2.0**
- **Key Projects**:
  - **SDP Calendar** (`1208514675798267`): Entry point for Sales team to submit new orders
  - **Scheduling Project** (`1210976309014176`): Where Engineering moves work orders and where all production management tools operate
  - **Department Projects**: Water Jets, Routers, Saws, Presses, Assembly, Sampling - where subtasks are created and production floor operators access their jobs
  - **New Hire Processing** (`1211374095809348`): New hire onboarding workflow
  - **HR Daily Tasks** (`1210845426757456`): HR operations (pay increases, PTO, terminations)
  - **Leadership Meetings** (`1208504221925720`): Weekly Wednesday leadership meetings
- **Integration Pattern**: All production management tools must integrate with Asana API
- **Custom Fields**: Shared across systems (Scheduled PPM, Total Time, Prod Dept, Job Started, Actual PPM, etc.)

### SharePoint (Document Management)
- **Role**: Document storage, version control, HR/management documents
- **Used By**: SDPAgent
- **Integration**: Microsoft Graph API
- **Document Libraries**: Reviews, position descriptions, SOPs, pay increases

## Allowed Technologies

### Backend
- **Python**: Primary backend language for most services
  - Flask (ProductionData)
  - FastAPI (SDPAgent)
  - Standard libraries: requests, pypdf/PyPDF2, python-dotenv
- **Node.js/Express**: For ProdMgmtAPP backend (future integration target)

### Frontend
- **Next.js**: Used by SchedulingCalculatorTool, Subtask-Generator_SDP, ProductionData, **Scheduler2.0**
- **Vue.js 3**: Used by ProdMgmtAPP (target architecture)
- **TypeScript**: Preferred for type safety (used extensively in Scheduler2.0)

### Databases
- **SQLite**: Used by ProductionData, ProdMgmtAPP, SDPAgent (agent_state.db)
- **Future Consideration**: MySQL if scalability requires (mentioned in tech overview)

### AI/Agent Tools
- **Cursor AI**: Development assistance and agent capabilities
- **LangChain**: Used by SDPAgent for agent orchestration
- **MCP (Model Context Protocol)**: For clean integration patterns with Asana and SharePoint

### Development Tools
- **Obsidian**: Knowledge base and plugin platform for SDPAgent
- **Git**: Version control across all repositories

## Integration Expectations

### API Integration Patterns
- **Asana API**: REST API with authentication tokens
- **Microsoft Graph API**: For SharePoint integration
- **MCP Servers**: Asana MCP server and SharePoint MCP server for SDPAgent

### Data Synchronization
- **Bidirectional Sync**: ProdMgmtAPP syncs tasks and custom fields to/from Asana
- **Unidirectional Updates**: Most tools write to Asana, read from Asana
- **Configuration Sharing**: Each project has config.json - some duplication exists (needs standardization)

### Integration Points
- **ProductionData → SchedulingCalculatorTool**: Feedback loop for actual PPM (needs implementation)
- **Subtask-Generator → Asana**: Creates subtasks in department projects
- **SchedulingCalculatorTool → Asana**: Updates start/due dates (preview mode in Scheduler2.0)
- **ProductionData → Asana**: Updates custom fields (Actual PPM, Productivity, etc.)
- **Scheduler2.0 → Asana**: Unified interface for subtask creation, scheduling, attachment management, and task search
  - **Subtask Generator**: Creates subtasks with BOM calculation and custom field population
  - **Schedule Calculator**: Calculates realistic schedules (preview mode, no direct Asana updates)
  - **Attachment Fixer**: Attaches PDF/Excel files to subtasks from parent work orders
  - **PO Search**: Searches tasks across Asana projects by PO number
  - **Recalculate Function**: Updates derived custom fields (Total Time, Scheduled PPM, Shifts) based on Process Time changes

## Discouraged Technologies

### Avoid
- **Custom Task Management Systems**: Must use Asana
- **Separate Document Storage**: Must use SharePoint for official documents
- **Database Proliferation**: Prefer SQLite or shared database, avoid duplicate data stores
- **Standalone Solutions**: All tools should integrate, not operate in isolation

### Technology Decisions to Avoid
- **Reinventing the Stack**: Don't replace Asana, SharePoint, or core technologies without strong justification
- **Tool Drift**: Don't introduce new tools that don't integrate with existing ecosystem
- **Tech Chaos**: Avoid introducing technologies without clear integration path

## Hosting & Deployment Realities

### Current State
- **Local Development**: Most tools run locally during development
- **MCP Servers**: Run on localhost (ports 8001 for SharePoint, 8002 for Asana)
- **Database**: SQLite files stored locally

### Future Considerations
- **ProdMgmtAPP**: Will need hosting for central platform
- **Scalability**: May need MySQL or other database if SQLite becomes limiting
- **Deployment**: Current focus on development, production deployment TBD

## Configuration Management

### Current Pattern
- **config.json**: Each project has its own configuration file
- **Duplication**: Some configuration duplicated across projects (Asana tokens, custom field GIDs, etc.)
- **Security**: Sensitive tokens stored in config.json (not committed to git)

### Standard Configuration Needed
- **Asana Token**: Required for all Asana-integrated tools
- **Custom Field GIDs**: Shared across systems (Scheduled PPM, Total Time, Prod Dept, etc.)
- **Department Definitions**: Standard list of departments
- **Work Schedule**: Standard work hours, breaks, capacity

### Configuration Schema (From config.json.example)
```json
{
  "ASANA": {
    "TOKEN": "...",
    "WORKSPACE_GID": "...",
    "PROJECT_GID": "..."
  },
  "MCP": {
    "ASANA_SERVER": {
      "HOST": "localhost",
      "PORT": 8002
    },
    "SHAREPOINT_SERVER": {
      "HOST": "localhost",
      "PORT": 8001
    }
  },
  "DATABASE": {
    "TYPE": "sqlite",
    "PATH": "database/agent_state.db"
  }
}
```

## Code Organization Constraints

### Repository Structure
- **Separate Repositories**: Each major tool has its own repository
  - SDPAgent, ProductionData, SchedulingCalculatorTool, Subtask-Generator_SDP, ProdMgmtAPP, Scheduler
  - **Scheduler2.0**: Unified Next.js/TypeScript application combining Subtask-Generator, Schedule Calculator, Production Calculator, PO Search, and Attachment Fixer
- **Documentation Repositories**: SDP-ProdMgmt2.0 for documentation and analysis

### Code Duplication Issues
- **ProdMgmtAPP**: Duplicate codebase exists in SDP-ProdMgmt2.0/production-management-app/
- **Asana Workflow Docs**: Multiple projects contain asana_to_cursor/ folders with workflow documentation
- **Need**: Consolidation and authoritative source determination

## Technology Constraints Summary

### Must Use
- Asana for task management
- SharePoint for document management
- Python or Node.js for backends
- Asana API and Microsoft Graph API for integrations

### Should Use
- TypeScript for frontend type safety
- SQLite for local databases
- MCP for agent integrations
- Cursor AI for development assistance

### Avoid
- Introducing new task management systems
- Creating isolated solutions without integration
- Duplicating configuration unnecessarily
- Reinventing core functionality that Asana/SharePoint provide

## Scheduler2.0 Architecture

### Unified Tool Platform
**Scheduler2.0** consolidates multiple production management tools into a single Next.js/TypeScript application:

- **Technology Stack**: Next.js 14+, TypeScript, React, Tailwind CSS
- **Backend Integration**: Python backend (`python-backend/`) for schedule calculations via API wrapper
- **Asana Integration**: Direct Asana API integration for task management, custom fields, and attachments
- **Architecture Pattern**: Tab-based interface with shared components and API routes
- **Key Features**:
  - **Subtask Generator Tab**: Automated subtask creation with BOM calculation
  - **Schedule Calculator Tab**: Realistic scheduling with preview mode (no direct Asana updates)
  - **Production Calculator Tab**: Interactive production metrics and capacity analysis
  - **PO Search Tab**: Task discovery by PO number across Asana projects
  - **Attachment Fixer Tab**: Catch-up utility for ensuring subtask attachment completeness

### API Routes Structure
- `/api/asana/`: Asana integration endpoints (work orders, subtasks, attachments)
- `/api/calculate/`: Schedule calculation endpoints (Python backend integration)
- `/api/capacity/`: Capacity analysis endpoints
- `/api/catchup/`: Catch-up utilities (attachment checking and fixing)
- `/api/departments/`, `/api/projects/`, `/api/tasks/`: Data retrieval endpoints

### Data Flow
- **Frontend (Next.js)**: User interface and state management
- **API Routes (Next.js)**: Asana API calls and Python backend orchestration
- **Python Backend**: Schedule calculations, capacity analysis, work schedule constraints
- **Asana API**: Source of truth for tasks, custom fields, attachments, projects

## Future Tech Stack Considerations

### ProdMgmtAPP Integration Target
- All tools should eventually integrate into ProdMgmtAPP
- ProdMgmtAPP uses Vue.js 3 frontend, Node.js/Express backend
- Future porting: Scheduler Python logic to Node.js/Express for ProdMgmtAPP integration
- **Scheduler2.0**: May serve as reference implementation for unified tool interface patterns

### Scalability Planning
- SQLite → MySQL if needed
- Consider cloud hosting for ProdMgmtAPP when ready for deployment
- Maintain local development capability
