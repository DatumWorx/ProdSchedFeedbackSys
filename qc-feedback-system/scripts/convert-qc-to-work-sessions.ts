/**
 * Convert QC Entries to Active Work Sessions
 * 
 * This script:
 * 1. Fetches incomplete tasks from production department projects
 * 2. Matches them with QC entries from the database
 * 3. Creates active work sessions from the matched QC entries
 */

// Load environment variables from .env.local
import dotenv from 'dotenv';
import path from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';

const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });
import { getDepartmentProjects, getProjectTasks, DEPARTMENT_PROJECTS } from '../lib/asana';
import { startWorkSession, getActiveWorkSession } from '../lib/db';

// Use the unified QC database
const workspaceRoot = path.resolve(process.cwd(), '..');
const dbPath = path.join(workspaceRoot, 'QC_Data', 'databases', 'qc_unified.db');

interface QCEntry {
  id: number;
  work_order: string | null;
  part_name: string | null;
  operator: string | null;
  department: string | null;
  entry_date: string;
  asana_task_gid: string | null;
  parts_produced: number;
  start_timestamp: string | null;
  stop_timestamp: string | null;
  start_time: string | null;
  finish_time: string | null;
  total_time_minutes: number | null;
}

interface MatchedTask {
  taskGid: string;
  taskName: string;
  department: string;
  projectName: string;
  qcEntries: QCEntry[];
}

/**
 * Normalize strings for matching (lowercase, trim, remove extra spaces, remove special chars)
 */
function normalizeString(str: string | null): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
}

/**
 * Extract all numbers and alphanumeric codes from a string
 * Returns array of potential identifiers (work orders, part codes, model numbers)
 */
function extractIdentifiers(text: string): string[] {
  const normalized = normalizeString(text);
  const identifiers: string[] = [];
  
  // Extract work order patterns: WO-1234, 1234 - WO, WO 1234, etc.
  const woPatterns = [
    /wo[-\s]?(\d+)/gi,
    /(\d+)[-\s]?wo/gi,
  ];
  for (const pattern of woPatterns) {
    const matches = normalized.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) identifiers.push(match[1]);
    }
  }
  
  // Extract model/part codes: DELL148821SH-3, WINT76751, etc. (alphanumeric with dashes)
  const codePattern = /([A-Z0-9]+(?:[-][A-Z0-9]+)*)/gi;
  const codeMatches = text.matchAll(codePattern);
  for (const match of codeMatches) {
    if (match[1] && match[1].length >= 4) {
      identifiers.push(match[1].toUpperCase());
    }
  }
  
  // Extract standalone 4+ digit numbers
  const numberPattern = /\b(\d{4,})\b/g;
  const numberMatches = normalized.matchAll(numberPattern);
  for (const match of numberMatches) {
    if (match[1]) identifiers.push(match[1]);
  }
  
  // Remove duplicates and return
  return Array.from(new Set(identifiers));
}

/**
 * Calculate similarity score between two strings (simple substring matching)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Check if one contains significant parts of the other (3+ char chunks)
  const chunks1 = s1.match(/.{3,}/g) || [];
  const chunks2 = s2.match(/.{3,}/g) || [];
  
  let matches = 0;
  for (const chunk1 of chunks1) {
    if (chunk1.length >= 3 && s2.includes(chunk1)) {
      matches++;
    }
  }
  
  if (chunks1.length > 0) {
    return matches / chunks1.length;
  }
  
  return 0;
}

/**
 * Match task with QC entries
 * Uses multiple strategies: direct GID match, work order matching, part name matching, fuzzy matching
 */
function matchTaskWithQCEntries(
  taskGid: string,
  taskName: string,
  department: string,
  qcEntries: QCEntry[]
): QCEntry[] {
  // First, try to match by asana_task_gid (highest priority)
  const directMatch = qcEntries.filter(
    entry => entry.asana_task_gid === taskGid
  );
  if (directMatch.length > 0) {
    return directMatch;
  }
  
  const normalizedTaskName = normalizeString(taskName);
  const taskIdentifiers = extractIdentifiers(taskName);
  const matched: QCEntry[] = [];
  
  // Strategy 1: Match by work_order using extracted identifiers
  for (const identifier of taskIdentifiers) {
    const matchedByWorkOrder = qcEntries.filter(entry => {
      if (!entry.work_order) return false;
      const normalizedWorkOrder = normalizeString(entry.work_order);
      // Try exact match or contains match
      return normalizedWorkOrder === identifier || 
             normalizedWorkOrder.includes(identifier) ||
             identifier.includes(normalizedWorkOrder);
    });
    if (matchedByWorkOrder.length > 0) {
      matched.push(...matchedByWorkOrder);
    }
  }
  
  // Strategy 2: Match by part_name using substring matching
  const matchedByPartName = qcEntries.filter(entry => {
    if (!entry.part_name) return false;
    const normalizedPartName = normalizeString(entry.part_name);
    
    // Direct substring match
    if (normalizedTaskName.includes(normalizedPartName) ||
        normalizedPartName.includes(normalizedTaskName)) {
      return true;
    }
    
    // Check if part name contains any identifier from task
    for (const identifier of taskIdentifiers) {
      if (normalizedPartName.includes(identifier) ||
          identifier.includes(normalizedPartName)) {
        return true;
      }
    }
    
    // Check if part name identifiers match task identifiers
    const partIdentifiers = extractIdentifiers(entry.part_name);
    for (const partId of partIdentifiers) {
      for (const taskId of taskIdentifiers) {
        if (partId === taskId || partId.includes(taskId) || taskId.includes(partId)) {
          return true;
        }
      }
    }
    
    return false;
  });
  
  matched.push(...matchedByPartName);
  
  // Strategy 3: Fuzzy matching by similarity (for partial matches)
  // Only if no strong matches found yet
  if (matched.length === 0) {
    const similarityThreshold = 0.4;
    for (const entry of qcEntries) {
      let maxSimilarity = 0;
      
      if (entry.part_name) {
        const similarity = calculateSimilarity(taskName, entry.part_name);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
      
      if (entry.work_order) {
        const similarity = calculateSimilarity(taskName, entry.work_order);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
      
      if (maxSimilarity >= similarityThreshold) {
        matched.push(entry);
      }
    }
  }
  
  // Remove duplicates (by entry id)
  const uniqueMatched = Array.from(
    new Map(matched.map(entry => [entry.id, entry])).values()
  );
  
  return uniqueMatched;
}

/**
 * Get QC entries from database filtered by department
 */
function getQCEntriesForDepartment(
  db: Database.Database,
  department: string
): QCEntry[] {
  const stmt = db.prepare(`
    SELECT 
      id, work_order, part_name, operator, department, entry_date,
      asana_task_gid, parts_produced, start_timestamp, stop_timestamp,
      start_time, finish_time, total_time_minutes
    FROM qc_entries
    WHERE department = ?
    ORDER BY entry_date DESC, id DESC
  `);
  
  return stmt.all(department) as QCEntry[];
}

/**
 * Create work session from QC entry
 */
function createWorkSessionFromQCEntry(
  taskGid: string,
  taskName: string,
  qcEntry: QCEntry,
  department: string,
  unifiedDb: Database.Database
): { success: boolean; sessionId?: number; error?: string } {
  // Check if operator is provided
  if (!qcEntry.operator) {
    return { success: false, error: 'QC entry missing operator' };
  }
  
  // Check if there's already an active session
  const existingSession = getActiveWorkSession(qcEntry.operator, taskGid);
  if (existingSession) {
    return { success: false, error: 'Active session already exists' };
  }
  
  // Determine start timestamp
  // Prefer start_timestamp (ISO 8601), fall back to start_time + entry_date
  let startTimestamp: string;
  if (qcEntry.start_timestamp) {
    startTimestamp = qcEntry.start_timestamp;
  } else if (qcEntry.entry_date && qcEntry.start_time) {
    // Combine date and time - handle both HH:MM:SS and HH:MM formats
    const timeStr = qcEntry.start_time.includes(':') 
      ? qcEntry.start_time.padEnd(8, ':00').slice(0, 8)
      : `${qcEntry.start_time}:00:00`;
    startTimestamp = `${qcEntry.entry_date}T${timeStr}`;
  } else {
    // Use entry_date at midnight
    startTimestamp = `${qcEntry.entry_date}T00:00:00`;
  }
  
  try {
    // Create session with current time first
    const sessionId = startWorkSession(
      qcEntry.operator,
      taskGid,
      qcEntry.part_name || taskName,
      department
    );
    
    // Update the session's start_timestamp to match QC entry
    // Also set parts produced from QC entry
    const updateStmt = unifiedDb.prepare(`
      UPDATE work_sessions
      SET start_timestamp = ?, 
          total_parts_produced = COALESCE(?, 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(
      startTimestamp,
      qcEntry.parts_produced || 0,
      sessionId
    );
    
    return { success: true, sessionId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update QC entry with asana_task_gid if missing
 */
function updateQCEntryWithTaskGid(
  db: Database.Database,
  qcEntryId: number,
  taskGid: string
): void {
  const stmt = db.prepare(`
    UPDATE qc_entries
    SET asana_task_gid = ?
    WHERE id = ? AND (asana_task_gid IS NULL OR asana_task_gid = '')
  `);
  stmt.run(taskGid, qcEntryId);
}

/**
 * Main function
 */
async function main() {
  console.log('Starting QC to Work Sessions conversion...\n');
  
  // Connect to database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  try {
    // Get all production department projects
    console.log('Fetching production department projects...');
    const projects = await getDepartmentProjects();
    console.log(`Found ${projects.length} production departments\n`);
    
    const allMatchedTasks: MatchedTask[] = [];
    const createdSessions: Array<{
      taskGid: string;
      taskName: string;
      operator: string;
      sessionId: number;
    }> = [];
    const skippedSessions: Array<{
      taskGid: string;
      taskName: string;
      reason: string;
    }> = [];
    
    // Process each department project
    for (const project of projects) {
      const departmentName = project.name;
      console.log(`\nProcessing department: ${departmentName}`);
      
      // Get QC entries for this department
      const qcEntries = getQCEntriesForDepartment(db, departmentName);
      console.log(`  Found ${qcEntries.length} QC entries`);
      
      if (qcEntries.length === 0) {
        console.log(`  Skipping - no QC entries found`);
        continue;
      }
      
      // Get incomplete tasks from this project
      console.log(`  Fetching incomplete tasks from Asana...`);
      const tasks = await getProjectTasks(project.gid);
      console.log(`  Found ${tasks.length} incomplete tasks`);
      
      if (tasks.length === 0) {
        console.log(`  Skipping - no incomplete tasks found`);
        continue;
      }
      
      // Match tasks with QC entries
      console.log(`  Sample QC entries (first 3):`);
      for (let i = 0; i < Math.min(3, qcEntries.length); i++) {
        const entry = qcEntries[i];
        console.log(`    - Work Order: "${entry.work_order || '(none)'}", Part: "${entry.part_name || '(none)'}", Operator: "${entry.operator || '(none)'}"`);
      }
      console.log(`  Sample task names (first 3):`);
      for (let i = 0; i < Math.min(3, tasks.length); i++) {
        console.log(`    - "${tasks[i].name}"`);
      }
      
      for (const task of tasks) {
        const matchedEntries = matchTaskWithQCEntries(
          task.gid,
          task.name,
          departmentName,
          qcEntries
        );
        
        if (matchedEntries.length > 0) {
          console.log(`    ✓ Matched "${task.name}" with ${matchedEntries.length} QC entries`);
          allMatchedTasks.push({
            taskGid: task.gid,
            taskName: task.name,
            department: departmentName,
            projectName: project.name,
            qcEntries: matchedEntries,
          });
          
          // Update QC entries with task GID if missing
          for (const entry of matchedEntries) {
            if (!entry.asana_task_gid) {
              updateQCEntryWithTaskGid(db, entry.id, task.gid);
            }
          }
          
          // Create work sessions from matched entries
          // Group by operator to avoid duplicate sessions
          const entriesByOperator = new Map<string, QCEntry[]>();
          for (const entry of matchedEntries) {
            if (entry.operator) {
              const existing = entriesByOperator.get(entry.operator) || [];
              existing.push(entry);
              entriesByOperator.set(entry.operator, existing);
            }
          }
          
          // For each operator, create one work session from the most recent entry
          for (const [operator, entries] of Array.from(entriesByOperator.entries())) {
            // Sort by entry_date descending to get most recent
            const sortedEntries = entries.sort((a, b) => {
              return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
            });
            const mostRecentEntry = sortedEntries[0];
            
            const result = createWorkSessionFromQCEntry(
              task.gid,
              task.name,
              mostRecentEntry,
              departmentName,
              db
            );
            
            if (result.success && result.sessionId) {
              createdSessions.push({
                taskGid: task.gid,
                taskName: task.name,
                operator,
                sessionId: result.sessionId,
              });
              console.log(`    ✓ Created work session for ${operator} on "${task.name}"`);
            } else {
              skippedSessions.push({
                taskGid: task.gid,
                taskName: task.name,
                reason: result.error || 'Unknown error',
              });
              console.log(`    ✗ Skipped ${operator} on "${task.name}": ${result.error}`);
            }
          }
        }
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tasks matched: ${allMatchedTasks.length}`);
    console.log(`Work sessions created: ${createdSessions.length}`);
    console.log(`Work sessions skipped: ${skippedSessions.length}`);
    
    if (createdSessions.length > 0) {
      console.log('\nCreated Sessions:');
      for (const session of createdSessions) {
        console.log(`  - ${session.operator}: "${session.taskName}" (ID: ${session.sessionId})`);
      }
    }
    
    if (skippedSessions.length > 0) {
      console.log('\nSkipped Sessions:');
      const skippedByReason = new Map<string, number>();
      for (const skipped of skippedSessions) {
        const count = skippedByReason.get(skipped.reason) || 0;
        skippedByReason.set(skipped.reason, count + 1);
      }
      for (const [reason, count] of Array.from(skippedByReason.entries())) {
        console.log(`  - ${reason}: ${count}`);
      }
    }
    
  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export {};
