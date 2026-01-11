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

  // Work sessions table - tracks active work sessions for operators
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_name TEXT NOT NULL,
      part_gid TEXT NOT NULL,
      part_name TEXT,
      department TEXT,
      start_timestamp TEXT NOT NULL,
      end_timestamp TEXT,
      total_parts_produced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_work_sessions_operator ON work_sessions(operator_name);
    CREATE INDEX IF NOT EXISTS idx_work_sessions_part ON work_sessions(part_gid);
    CREATE INDEX IF NOT EXISTS idx_work_sessions_active ON work_sessions(operator_name, part_gid, end_timestamp);
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

/**
 * Work Session Management Functions
 */

export interface WorkSession {
  id: number;
  operator_name: string;
  part_gid: string;
  part_name: string | null;
  department: string | null;
  start_timestamp: string;
  end_timestamp: string | null;
  total_parts_produced: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get active work session for an operator and part
 */
export function getActiveWorkSession(operatorName: string, partGid: string): WorkSession | null {
  const stmt = db.prepare(`
    SELECT * FROM work_sessions
    WHERE operator_name = ? AND part_gid = ? AND end_timestamp IS NULL
    ORDER BY start_timestamp DESC
    LIMIT 1
  `);
  
  const session = stmt.get(operatorName, partGid) as WorkSession | undefined;
  return session || null;
}

/**
 * Get all work sessions for a part (active and completed)
 */
export function getAllWorkSessionsForPart(partGid: string): WorkSession[] {
  const stmt = db.prepare(`
    SELECT * FROM work_sessions
    WHERE part_gid = ?
    ORDER BY start_timestamp DESC
  `);
  
  return stmt.all(partGid) as WorkSession[];
}

/**
 * Get total parts produced for a part from QC entries
 */
export function getTotalPartsProducedForPart(partGid: string): number {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(parts_produced), 0) as total
    FROM qc_entries
    WHERE asana_task_gid = ? AND parts_produced IS NOT NULL
  `);
  
  const result = stmt.get(partGid) as { total: number } | undefined;
  return result?.total || 0;
}

/**
 * Start a new work session
 */
export function startWorkSession(
  operatorName: string,
  partGid: string,
  partName: string | null,
  department: string | null
): number {
  const startTimestamp = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO work_sessions (operator_name, part_gid, part_name, department, start_timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(operatorName, partGid, partName || null, department || null, startTimestamp);
  return result.lastInsertRowid as number;
}

/**
 * Update parts count for a work session
 * Adds the provided parts count to the running total (accumulative)
 */
export function updateWorkSessionParts(sessionId: number, partsCount: number): void {
  const stmt = db.prepare(`
    UPDATE work_sessions
    SET total_parts_produced = total_parts_produced + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(partsCount, sessionId);
}

/**
 * End a work session and create a QC entry
 */
export function endWorkSession(sessionId: number): { session: WorkSession; qcEntryId: number } {
  const endTimestamp = new Date().toISOString();
  
  // Get the session
  const getSessionStmt = db.prepare('SELECT * FROM work_sessions WHERE id = ?');
  const session = getSessionStmt.get(sessionId) as WorkSession;
  
  if (!session) {
    throw new Error('Work session not found');
  }
  
  // Update session with end timestamp
  const updateStmt = db.prepare(`
    UPDATE work_sessions
    SET end_timestamp = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  updateStmt.run(endTimestamp, sessionId);
  
  // Calculate total time in minutes
  const startTime = new Date(session.start_timestamp);
  const endTime = new Date(endTimestamp);
  const totalTimeMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  
  // Get entry date (YYYY-MM-DD format)
  const entryDate = startTime.toISOString().split('T')[0];
  
  // Create QC entry
  const qcEntry: UnifiedQCEntryInput = {
    entry_date: entryDate,
    department: session.department || '',
    operator: session.operator_name,
    part_name: session.part_name || null,
    start_timestamp: session.start_timestamp,
    stop_timestamp: endTimestamp,
    total_time_minutes: totalTimeMinutes,
    parts_produced: session.total_parts_produced,
    asana_task_gid: session.part_gid,
    qc_status: 'submitted',
  };
  
  const qcEntryId = insertQCEntry(qcEntry);
  
  // Get updated session
  const updatedSession = getSessionStmt.get(sessionId) as WorkSession;
  
  return { session: updatedSession, qcEntryId };
}

export default db;

