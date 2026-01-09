import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'qc_feedback.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDatabase() {
  // QC Entries table - matches the QC Sheet structure
  db.exec(`
    CREATE TABLE IF NOT EXISTS qc_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      department TEXT NOT NULL,
      operator TEXT,
      part_name TEXT NOT NULL,
      start_time TEXT,
      process_time_minutes REAL,
      finish_time TEXT,
      total_time_minutes REAL,
      material TEXT,
      total_parts INTEGER,
      yield INTEGER,
      material_size TEXT,
      qc_rejected_parts INTEGER,
      actual_ppm REAL,
      ideal_ppm REAL,
      productive_time_percent REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_qc_date ON qc_entries(date);
    CREATE INDEX IF NOT EXISTS idx_qc_department ON qc_entries(department);
    CREATE INDEX IF NOT EXISTS idx_qc_operator ON qc_entries(operator);
    CREATE INDEX IF NOT EXISTS idx_qc_part_name ON qc_entries(part_name);
  `);

  // Operators table - from Variables sheet
  db.exec(`
    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_operators_department ON operators(department);
  `);

  // Departments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      asana_project_gid TEXT,
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

export default db;

