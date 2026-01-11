import { NextResponse } from 'next/server';
import { getProjectTasks, getTaskDetails, cacheTasks } from '@/lib/asana';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectGid = searchParams.get('projectGid');
    const machine = searchParams.get('machine');

    if (!projectGid) {
      return NextResponse.json(
        { error: 'projectGid parameter is required' },
        { status: 400 }
      );
    }

    // Get Parts (Tasks) from Asana for the specified Production Department (project)
    // Note: Tasks are NOT filtered by operator - operators are selected manually for logging
    let tasks = await getProjectTasks(projectGid);

    // Filter by Machine (Prod Dept custom field) if specified - optional filter
    // If Machine is not selected, show all Parts (Tasks) in the department project
    if (machine) {
      tasks = tasks.filter((t: any) => t.machine_name === machine);
    }

    // Sort by nearest start date or due date
    tasks.sort((a: any, b: any) => {
      const aDate = a.start_on || a.start_at || a.due_on || a.due_at || '';
      const bDate = b.start_on || b.start_at || b.due_on || b.due_at || '';
      return aDate.localeCompare(bDate);
    });

    // Get last 3 completed Parts (Tasks) from the department project
    const completedTasks = db
      .prepare(`
        SELECT task_gid, task_name, section_name, start_date, due_date, custom_fields_json
        FROM asana_tasks_cache
        WHERE project_gid = ? AND section_name = 'Done'
        ORDER BY due_date DESC
        LIMIT 3
      `)
      .all(projectGid);

    return NextResponse.json({
      tasks: tasks.map((task: any) => ({
        gid: task.gid,
        name: task.name,
        section: task.section_name,
        startDate: task.start_on || task.start_at,
        dueDate: task.due_on || task.due_at,
        machine: task.machine_name,
        customFields: task.custom_fields,
      })),
      completedTasks: completedTasks.map((task: any) => ({
        gid: task.task_gid,
        name: task.task_name,
        section: task.section_name,
        startDate: task.start_date,
        dueDate: task.due_date,
        customFields: task.custom_fields_json ? JSON.parse(task.custom_fields_json) : {},
      })),
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { projectGid } = await request.json();

    if (!projectGid) {
      return NextResponse.json(
        { error: 'projectGid is required' },
        { status: 400 }
      );
    }

    // Cache tasks from Asana
    await cacheTasks(projectGid);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error caching tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cache tasks' },
      { status: 500 }
    );
  }
}

