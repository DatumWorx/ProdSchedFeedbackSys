# Production Scheduling Feedback System

A Next.js application to replace the current QC Sheet process with a digital system that integrates with Asana for production scheduling and feedback.

## Features

- **SQLite Database**: Replicates the QC Sheet structure for historical data storage
- **Asana Integration**: Fetches departments, machines, operators, and tasks from Asana
- **Smart Filtering**: Part dropdown filters tasks by department and machine, excluding "New Orders" and "Done" sections
- **Task Details**: Displays task information including custom fields, section, start/due dates
- **Completed Tasks**: Shows the last 3 completed tasks for reference

## Setup

### Prerequisites

- Node.js 18+ and npm
- Asana Personal Access Token
- Asana Workspace GID

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```env
ASANA_TOKEN=your_asana_personal_access_token_here
ASANA_WORKSPACE_GID=your_workspace_gid_here
```

3. Initialize the database (runs automatically on first import):
```bash
npm run dev
```

### Import Historical QC Sheets

To import historical QC sheets from the OneDrive folder:

1. Install TypeScript and ts-node globally (if not already installed):
```bash
npm install -g typescript ts-node
```

2. Run the import script:
```bash
npx ts-node scripts/import-qc-sheets.ts
```

The script will:
- Import operators from the `_TMEPLATE.xlsx` Variables sheet
- Import all QC entries from Excel files in the QC FORMS folder
- Store data in SQLite database at `data/qc_feedback.db`

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Use the dropdowns to select:
   - **Department**: Production department (maps to Asana project)
   - **Machine**: Machine assignment (maps to Prod Dept custom field)
   - **Operator**: Operator name (from QC sheets or template)
   - **Part**: Task from Asana (filtered by department and machine, excludes "New Orders" and "Done" sections)

4. View task details including:
   - Task name and section
   - Start and due dates/times
   - Machine assignment
   - All custom fields from Asana
   - Last 3 completed tasks

## Database Schema

### qc_entries
Stores historical QC sheet data matching the template structure:
- date, department, operator, part_name
- start_time, process_time_minutes, finish_time, total_time_minutes
- material, total_parts, yield, material_size
- qc_rejected_parts, actual_ppm, ideal_ppm, productive_time_percent

### operators
Stores operator names from template and QC sheets

### departments
Stores department information and Asana project mappings

### machines
Stores machine information and Asana enum GID mappings

### asana_tasks_cache
Caches Asana task data for faster lookups

## API Routes

- `GET /api/departments` - Get all production department projects from Asana
- `GET /api/machines?department=<name>` - Get machines for a department
- `GET /api/operators?department=<name>` - Get operators (optionally filtered by department)
- `GET /api/tasks?projectGid=<gid>&machine=<name>` - Get tasks for a project (optionally filtered by machine)
- `POST /api/tasks` - Cache tasks from Asana to local database

## Project Structure

```
qc-feedback-system/
├── app/
│   ├── api/          # API routes
│   └── page.tsx       # Main UI component
├── lib/
│   ├── db.ts         # Database initialization and connection
│   └── asana.ts      # Asana API integration
├── scripts/
│   └── import-qc-sheets.ts  # Historical data import script
└── data/
    └── qc_feedback.db       # SQLite database (created automatically)
```

## Configuration

### Department Project GIDs

The system automatically discovers department projects from Asana. If you need to manually configure project GIDs, you can set them in `lib/asana.ts`:

```typescript
export const DEPARTMENT_PROJECTS: Record<string, string> = {
  'Water Jets': 'project_gid_here',
  'Routers': 'project_gid_here',
  // ...
};
```

### Custom Fields

Custom field GIDs are defined in `lib/asana.ts` based on the SDP documentation. These include:
- Prod Dept (machine assignment)
- Total Time, Process Time
- Scheduled PPM, Actual PPM
- Start/Due dates
- And more...

## Development

### Database

The SQLite database is automatically initialized when the application starts. The database file is created at `data/qc_feedback.db`.

### TypeScript

The project uses TypeScript for type safety. Run type checking with:
```bash
npx tsc --noEmit
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Notes

- Tasks are filtered to exclude "New Orders" and "Done" sections as requested
- Tasks are ordered by nearest start date or due date
- The system caches Asana task data locally for performance
- Historical QC data can be imported from Excel files matching the template format
