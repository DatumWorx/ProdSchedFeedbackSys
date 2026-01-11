import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Use the unified QC database located in QC_Data/databases/
// In Next.js, process.cwd() is the project root (qc-feedback-system directory)
// We need to go up one level to the workspace root
const workspaceRoot = path.resolve(process.cwd(), '..');
const dbPath = path.join(workspaceRoot, 'QC_Data', 'databases', 'qc_unified.db');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure database file exists (or create it with schema)
if (!fs.existsSync(dbPath)) {
  // If unified database doesn't exist, create it with schema
  const schemaPath = path.join(workspaceRoot, 'QC_Data', 'databases', 'qc_unified_database_schema.sql');
  if (fs.existsSync(schemaPath)) {
    const tempDb = new Database(dbPath);
    tempDb.pragma('foreign_keys = ON');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    tempDb.exec(schema);
    tempDb.close();
  } else {
    console.warn(`Warning: Unified database schema not found at ${schemaPath}. Database may need to be initialized manually.`);
  }
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize application-specific tables (QC entries table already exists in unified schema)
export function initDatabase() {
  // Note: qc_entries table is already defined in the unified database schema
  // We only need to create app-specific tables here

  // Operators table - comprehensive employee information
  db.exec(`
    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      date_of_hire DATE,
      pay_rate REAL,
      role TEXT,
      primary_dept TEXT,
      certified_departments TEXT,  -- JSON array of department names
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_operators_name ON operators(name);
    CREATE INDEX IF NOT EXISTS idx_operators_role ON operators(role);
    CREATE INDEX IF NOT EXISTS idx_operators_primary_dept ON operators(primary_dept);
  `);

  // Departments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      asana_project_gid TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Machines table - maps to Prod Dept custom field
  db.exec(`
    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id INTEGER,
      asana_enum_gid TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE INDEX IF NOT EXISTS idx_machines_department ON machines(department_id);
  `);

  // Asana tasks cache - for faster lookups
  db.exec(`
    CREATE TABLE IF NOT EXISTS asana_tasks_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_gid TEXT UNIQUE NOT NULL,
      task_name TEXT NOT NULL,
      project_gid TEXT,
      section_name TEXT,
      start_date TEXT,
      due_date TEXT,
      prod_dept TEXT,
      machine_name TEXT,
      custom_fields_json TEXT,
      last_synced DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_gid) REFERENCES departments(asana_project_gid)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project ON asana_tasks_cache(project_gid);
    CREATE INDEX IF NOT EXISTS idx_tasks_section ON asana_tasks_cache(section_name);
    CREATE INDEX IF NOT EXISTS idx_tasks_machine ON asana_tasks_cache(machine_name);
  `);
}

// Initialize on import
initDatabase();

/**
 * Insert a QC entry using the unified database schema format
 * For direct input from the Scheduling Feedback System
 */
export interface UnifiedQCEntryInput {
  // Required fields
  entry_date: string; // DATE format: YYYY-MM-DD
  department: string;
  
  // Optional fields
  work_order?: string | null;
  customer_name?: string | null;
  operator?: string | null; // For direct input, use operator name
  operator_id?: number | null; // FK to users table (if you have one)
  part_name?: string | null;
  
  // Timestamps (ISO 8601 format for direct input)
  start_timestamp?: string | null;
  mid_timestamp?: string | null;
  stop_timestamp?: string | null;
  start_time?: string | null; // TIME format (HH:MM:SS) - for Excel compatibility
  finish_time?: string | null; // TIME format (HH:MM:SS) - for Excel compatibility
  
  // Time values (normalized to minutes)
  process_time_minutes?: number | null;
  total_time_minutes?: number | null;
  setup_minutes?: number | null;
  downtime_minutes?: number | null;
  
  // Parts and quality
  parts_produced?: number | null;
  total_parts?: number | null; // For Excel compatibility
  defects_count?: number | null;
  scrap_count?: number | null;
  yield_status?: string | null;
  
  // Additional fields
  material?: string | null;
  material_size?: string | null;
  downtime_category?: string | null;
  notes?: string | null;
  
  // QC status (for direct input)
  qc_status?: 'draft' | 'submitted' | 'reviewed' | 'approved' | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  
  // Metadata
  asana_task_gid?: string | null;
  utilization_pct?: number | null;
  actual_ppm?: number | null;
}

export function insertQCEntry(entry: UnifiedQCEntryInput): number {
  const stmt = db.prepare(`
    INSERT INTO qc_entries (
      data_source, source_entry_id, work_order, customer_name, entry_date,
      operator, operator_id, part_name, start_timestamp, mid_timestamp, stop_timestamp,
      start_time, finish_time, process_time_minutes, total_time_minutes,
      setup_minutes, downtime_minutes, parts_produced, total_parts,
      defects_count, scrap_count, yield_status, material, material_size,
      downtime_category, notes, department, qc_status, reviewed_by, reviewed_at,
      asana_task_gid, utilization_pct, actual_ppm
    ) VALUES (
      'direct_input', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  
  const result = stmt.run(
    entry.work_order || null,
    entry.customer_name || null,
    entry.entry_date,
    entry.operator || null,
    entry.operator_id || null,
    entry.part_name || null,
    entry.start_timestamp || null,
    entry.mid_timestamp || null,
    entry.stop_timestamp || null,
    entry.start_time || null,
    entry.finish_time || null,
    entry.process_time_minutes || null,
    entry.total_time_minutes || null,
    entry.setup_minutes || null,
    entry.downtime_minutes || null,
    entry.parts_produced || null,
    entry.total_parts || null,
    entry.defects_count || null,
    entry.scrap_count || null,
    entry.yield_status || null,
    entry.material || null,
    entry.material_size || null,
    entry.downtime_category || null,
    entry.notes || null,
    entry.department,
    entry.qc_status || 'draft',
    entry.reviewed_by || null,
    entry.reviewed_at || null,
    entry.asana_task_gid || null,
    entry.utilization_pct || null,
    entry.actual_ppm || null,
  );
  
  return result.lastInsertRowid as number;
}

export default db;

