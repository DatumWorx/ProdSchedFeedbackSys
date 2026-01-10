-- Unified QC Database Schema
-- Consolidates QC data from Excel v1, Excel v2, and Scheduling Feedback System direct input

-- Enable foreign keys (for SQLite)
PRAGMA foreign_keys = ON;

-- ============================================================================
-- QC ENTRIES TABLE (Unified)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qc_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Source tracking
    data_source TEXT NOT NULL CHECK(data_source IN ('excel_v1', 'excel_v2', 'direct_input')),
    source_file TEXT,  -- Excel filename or NULL for direct input
    source_entry_id INTEGER,  -- Original ID from source database
    
    -- Common QC fields (union of all sources)
    work_order TEXT,
    customer_name TEXT,
    entry_date DATE NOT NULL,
    operator TEXT,  -- For Excel sources
    operator_id INTEGER,  -- For direct input (FK to users)
    
    -- Timestamps (handling different formats)
    start_timestamp TEXT,  -- ISO 8601 for direct input
    mid_timestamp TEXT,  -- ISO 8601 for direct input
    stop_timestamp TEXT,  -- ISO 8601 for direct input
    start_time TIME,  -- For Excel sources
    finish_time TIME,  -- For Excel sources
    
    -- Time values (normalized to minutes)
    process_time_minutes REAL,
    total_time_minutes REAL,
    setup_minutes INTEGER DEFAULT 0,
    downtime_minutes INTEGER DEFAULT 0,
    
    -- Parts and quality
    part_name TEXT,
    parts_produced INTEGER DEFAULT 0,
    total_parts INTEGER,  -- For Excel compatibility
    defects_count INTEGER DEFAULT 0,
    scrap_count INTEGER DEFAULT 0,
    yield_status TEXT,
    
    -- Additional fields
    material TEXT,
    material_size TEXT,
    downtime_category TEXT,
    notes TEXT,
    department TEXT,
    
    -- QC status (for direct input)
    qc_status TEXT CHECK(qc_status IN ('draft', 'submitted', 'reviewed', 'approved')),
    reviewed_by INTEGER,  -- FK to users (for direct input)
    reviewed_at TEXT,
    
    -- Metadata
    asana_task_gid TEXT,  -- For direct input linkage
    utilization_pct REAL,
    actual_ppm REAL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SOURCE METADATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS qc_source_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_source TEXT NOT NULL CHECK(data_source IN ('excel_v1', 'excel_v2', 'direct_input')),
    source_file TEXT,
    import_batch_id TEXT,
    total_entries INTEGER DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    import_notes TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_qc_source ON qc_entries(data_source);
CREATE INDEX IF NOT EXISTS idx_qc_entry_date ON qc_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_qc_operator ON qc_entries(operator);
CREATE INDEX IF NOT EXISTS idx_qc_operator_id ON qc_entries(operator_id);
CREATE INDEX IF NOT EXISTS idx_qc_work_order ON qc_entries(work_order);
CREATE INDEX IF NOT EXISTS idx_qc_department ON qc_entries(department);
CREATE INDEX IF NOT EXISTS idx_qc_source_file ON qc_entries(source_file);
CREATE INDEX IF NOT EXISTS idx_qc_asana_task ON qc_entries(asana_task_gid);

CREATE INDEX IF NOT EXISTS idx_metadata_source ON qc_source_metadata(data_source);
CREATE INDEX IF NOT EXISTS idx_metadata_file ON qc_source_metadata(source_file);
CREATE INDEX IF NOT EXISTS idx_metadata_batch ON qc_source_metadata(import_batch_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Update updated_at timestamp on qc_entries
CREATE TRIGGER IF NOT EXISTS update_qc_entries_timestamp 
AFTER UPDATE ON qc_entries
BEGIN
    UPDATE qc_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
