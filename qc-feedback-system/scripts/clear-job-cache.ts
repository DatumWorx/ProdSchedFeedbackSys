#!/usr/bin/env node

/**
 * Script to clear cached data for a specific job
 * Clears QC entries and work sessions for a task by part name
 */

import db from '../lib/db';

// Search for the task - you can modify this pattern
const searchPattern = process.argv[2] || 'AM-19342';

console.log(`Searching for tasks matching: ${searchPattern}\n`);

// First, find the task in the cache
const tasks = db.prepare(`
  SELECT task_gid, task_name 
  FROM asana_tasks_cache 
  WHERE task_name LIKE ?
  ORDER BY task_name
`).all(`%${searchPattern}%`) as Array<{ task_gid: string; task_name: string }>;

if (tasks.length === 0) {
  console.log(`No tasks found matching "${searchPattern}"`);
  console.log('\nTrying to search in QC entries by part name...');
  
  // Try searching in QC entries by part name
  const qcEntries = db.prepare(`
    SELECT DISTINCT asana_task_gid, part_name 
    FROM qc_entries 
    WHERE part_name LIKE ? AND asana_task_gid IS NOT NULL
  `).all(`%${searchPattern}%`) as Array<{ asana_task_gid: string; part_name: string }>;
  
  if (qcEntries.length === 0) {
    console.log(`No QC entries found matching "${searchPattern}"`);
    process.exit(1);
  }
  
  console.log(`\nFound ${qcEntries.length} QC entry(ies) with matching part name:`);
  qcEntries.forEach((entry, idx) => {
    console.log(`  ${idx + 1}. GID: ${entry.asana_task_gid}, Part: ${entry.part_name}`);
  });
  
  // If only one match, use it
  if (qcEntries.length === 1) {
    const taskGid = qcEntries[0].asana_task_gid;
    console.log(`\nUsing task GID: ${taskGid}`);
    clearCacheForTask(taskGid);
  } else {
    console.log('\nMultiple matches found. Please specify the exact task name or GID.');
    process.exit(1);
  }
} else {
  console.log(`Found ${tasks.length} task(s):`);
  tasks.forEach((task, idx) => {
    console.log(`  ${idx + 1}. GID: ${task.task_gid}`);
    console.log(`     Name: ${task.task_name}`);
  });
  
  // If only one match, use it
  if (tasks.length === 1) {
    const taskGid = tasks[0].task_gid;
    console.log(`\nUsing task GID: ${taskGid}`);
    clearCacheForTask(taskGid);
  } else {
    console.log('\nMultiple matches found. Please specify the exact task name or GID.');
    process.exit(1);
  }
}

function clearCacheForTask(taskGid: string) {
  console.log(`\nClearing cache for task GID: ${taskGid}\n`);
  
  // Get QC entries count before deletion
  const qcCountBefore = db.prepare(`
    SELECT COUNT(*) as count, 
           COALESCE(SUM(parts_produced), 0) as total_parts,
           COALESCE(SUM(total_time_minutes), 0) as total_time
    FROM qc_entries 
    WHERE asana_task_gid = ? AND data_source = 'direct_input'
  `).get(taskGid) as { count: number; total_parts: number; total_time: number };
  
  // Get work sessions count before deletion
  const sessionsCountBefore = db.prepare(`
    SELECT COUNT(*) as count
    FROM work_sessions 
    WHERE part_gid = ?
  `).get(taskGid) as { count: number };
  
  console.log('Before cleanup:');
  console.log(`  QC entries (direct_input): ${qcCountBefore.count}`);
  console.log(`  Total parts produced: ${qcCountBefore.total_parts}`);
  console.log(`  Total time (minutes): ${qcCountBefore.total_time.toFixed(2)}`);
  console.log(`  Work sessions: ${sessionsCountBefore.count}`);
  
  if (qcCountBefore.count === 0 && sessionsCountBefore.count === 0) {
    console.log('\nNo data to clear for this task.');
    return;
  }
  
  // Delete QC entries for this task (only direct_input to avoid affecting Excel imports)
  const deleteQC = db.prepare(`
    DELETE FROM qc_entries 
    WHERE asana_task_gid = ? AND data_source = 'direct_input'
  `);
  
  const qcResult = deleteQC.run(taskGid);
  console.log(`\nDeleted ${qcResult.changes} QC entry(ies)`);
  
  // Delete work sessions for this task
  const deleteSessions = db.prepare(`
    DELETE FROM work_sessions 
    WHERE part_gid = ?
  `);
  
  const sessionsResult = deleteSessions.run(taskGid);
  console.log(`Deleted ${sessionsResult.changes} work session(s)`);
  
  console.log('\n✅ Cache cleared successfully!');
}
