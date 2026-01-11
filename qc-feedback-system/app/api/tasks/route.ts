import { NextResponse } from 'next/server';
import { getProjectTasks, getTaskDetails, cacheTasks, getCompletedTasks } from '@/lib/asana';
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

    // Sort by nearest (earliest) date to farthest (latest) date
    // Prefer start date over due date, and handle null/empty dates by placing them at the end
    tasks.sort((a: any, b: any) => {
      const aDateStr = a.start_on || a.start_at || a.due_on || a.due_at || null;
      const bDateStr = b.start_on || b.start_at || b.due_on || b.due_at || null;
      
      // If both dates are null/empty, maintain original order
      if (!aDateStr && !bDateStr) return 0;
      // If only a is null/empty, put it at the end
      if (!aDateStr) return 1;
      // If only b is null/empty, put it at the end
      if (!bDateStr) return -1;
      
      // Convert to Date objects for proper comparison
      const aDate = new Date(aDateStr);
      const bDate = new Date(bDateStr);
      
      // Sort in ascending order (nearest/earliest dates first)
      return aDate.getTime() - bDate.getTime();
    });

    // Get last 3 completed Parts (Tasks) directly from Asana's "Done" section
    const completedTasksFromAsana = await getCompletedTasks(projectGid, 3);

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
      completedTasks: completedTasksFromAsana.map((task: any) => ({
        gid: task.gid,
        name: task.name,
        section: task.section_name,
        startDate: task.start_on || task.start_at,
        dueDate: task.due_on || task.due_at,
        customFields: task.custom_fields || {},
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

