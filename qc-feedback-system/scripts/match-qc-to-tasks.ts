/**
 * Interactive Manual Matching Tool for QC Entries to Asana Tasks
 * 
 * This script helps you manually match QC entries with Asana tasks.
 * It shows unmatched QC entries and available tasks, allowing you to
 * select matches interactively.
 * 
 * Usage: npx ts-node scripts/match-qc-to-tasks.ts [department]
 */

// Load environment variables from .env.local
import dotenv from 'dotenv';
import path from 'path';
import Database from 'better-sqlite3';
import * as readline from 'readline';

const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

import { getDepartmentProjects, getProjectTasks, DEPARTMENT_PROJECTS } from '../lib/asana';

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
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Get unmatched QC entries for a department
 */
function getUnmatchedQCEntries(db: Database.Database, department: string): QCEntry[] {
  const stmt = db.prepare(`
    SELECT 
      id, work_order, part_name, operator, department, entry_date,
      asana_task_gid, parts_produced, start_timestamp, stop_timestamp
    FROM qc_entries
    WHERE department = ? AND (asana_task_gid IS NULL OR asana_task_gid = '')
    ORDER BY entry_date DESC, id DESC
  `);
  
  return stmt.all(department) as QCEntry[];
}

/**
 * Update QC entry with Asana task GID
 */
function updateQCEntryWithTaskGid(
  db: Database.Database,
  qcEntryId: number,
  taskGid: string
): void {
  const stmt = db.prepare(`
    UPDATE qc_entries
    SET asana_task_gid = ?
    WHERE id = ?
  `);
  stmt.run(taskGid, qcEntryId);
}

/**
 * Display QC entry information
 */
function displayQCEntry(entry: QCEntry, index: number): void {
  console.log(`\n  ${index + 1}. QC Entry #${entry.id}`);
  console.log(`     Work Order: ${entry.work_order || '(none)'}`);
  console.log(`     Part Name: ${entry.part_name || '(none)'}`);
  console.log(`     Operator: ${entry.operator || '(none)'}`);
  console.log(`     Date: ${entry.entry_date}`);
  console.log(`     Parts Produced: ${entry.parts_produced || 0}`);
}

/**
 * Display task information
 */
function displayTask(task: any, index: number): void {
  console.log(`\n  ${index + 1}. ${task.name}`);
  console.log(`     GID: ${task.gid}`);
  if (task.machine_name) {
    console.log(`     Machine: ${task.machine_name}`);
  }
  if (task.start_on || task.due_on) {
    console.log(`     Dates: ${task.start_on || 'N/A'} - ${task.due_on || 'N/A'}`);
  }
}

/**
 * Main function
 */
async function main() {
  const departmentArg = process.argv[2];
  
  console.log('QC Entry to Asana Task Manual Matching Tool\n');
  console.log('='.repeat(60));
  
  // Connect to database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  
  try {
    // Get all production department projects
    console.log('\nFetching production department projects...');
    const projects = await getDepartmentProjects();
    
    let selectedProject = projects.find((p: any) => p.name === departmentArg);
    
    if (!selectedProject) {
      if (departmentArg) {
        console.log(`\nDepartment "${departmentArg}" not found. Available departments:`);
        projects.forEach((p: any, i: number) => console.log(`  ${i + 1}. ${p.name}`));
        const deptChoice = await question('\nSelect department number (or press Enter to skip): ');
        if (deptChoice.trim()) {
          const index = parseInt(deptChoice) - 1;
          if (index >= 0 && index < projects.length) {
            selectedProject = projects[index];
          }
        }
      } else {
        console.log('\nAvailable departments:');
        projects.forEach((p: any, i: number) => console.log(`  ${i + 1}. ${p.name}`));
        const deptChoice = await question('\nSelect department number: ');
        const index = parseInt(deptChoice) - 1;
        if (index >= 0 && index < projects.length) {
          selectedProject = projects[index];
        }
      }
    }
    
    if (!selectedProject) {
      console.log('\nNo department selected. Exiting.');
      rl.close();
      db.close();
      return;
    }
    
    const departmentName = selectedProject.name;
    console.log(`\nSelected department: ${departmentName}`);
    
    // Get unmatched QC entries
    console.log('\nFetching unmatched QC entries...');
    const unmatchedEntries = getUnmatchedQCEntries(db, departmentName);
    console.log(`Found ${unmatchedEntries.length} unmatched QC entries`);
    
    if (unmatchedEntries.length === 0) {
      console.log('\nNo unmatched QC entries found. Exiting.');
      rl.close();
      db.close();
      return;
    }
    
    // Get all tasks (including completed ones for reference)
    console.log('\nFetching tasks from Asana...');
    const tasks = await getProjectTasks(selectedProject.gid);
    console.log(`Found ${tasks.length} incomplete tasks`);
    
    // Process each unmatched QC entry
    let matchedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < unmatchedEntries.length; i++) {
      const entry = unmatchedEntries[i];
      
      console.log('\n' + '='.repeat(60));
      console.log(`QC Entry ${i + 1} of ${unmatchedEntries.length}`);
      displayQCEntry(entry, i);
      
      if (tasks.length === 0) {
        console.log('\nNo tasks available to match.');
        const choice = await question('\nSkip this entry? (y/n/q to quit): ');
        if (choice.toLowerCase() === 'q') break;
        if (choice.toLowerCase() === 'y') {
          skippedCount++;
          continue;
        }
      }
      
      console.log('\nAvailable tasks:');
      tasks.forEach((task, idx) => displayTask(task, idx));
      
      const taskChoice = await question(
        `\nSelect task number to match (1-${tasks.length}), 's' to skip, 'q' to quit: `
      );
      
      if (taskChoice.toLowerCase() === 'q') {
        console.log('\nQuitting...');
        break;
      }
      
      if (taskChoice.toLowerCase() === 's') {
        skippedCount++;
        continue;
      }
      
      const taskIndex = parseInt(taskChoice) - 1;
      if (taskIndex >= 0 && taskIndex < tasks.length) {
        const selectedTask = tasks[taskIndex];
        
        // Confirm match
        console.log(`\nYou selected: "${selectedTask.name}"`);
        const confirm = await question('Confirm match? (y/n): ');
        
        if (confirm.toLowerCase() === 'y') {
          updateQCEntryWithTaskGid(db, entry.id, selectedTask.gid);
          console.log(`✓ Matched QC Entry #${entry.id} with task "${selectedTask.name}"`);
          matchedCount++;
        } else {
          skippedCount++;
        }
      } else {
        console.log('Invalid selection. Skipping...');
        skippedCount++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`QC entries matched: ${matchedCount}`);
    console.log(`QC entries skipped: ${skippedCount}`);
    console.log(`Remaining unmatched: ${unmatchedEntries.length - matchedCount - skippedCount}`);
    
  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    rl.close();
    db.close();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export {};
