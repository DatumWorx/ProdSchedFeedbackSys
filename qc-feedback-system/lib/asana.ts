import asana from 'asana';
import db from './db';

// Initialize Asana client
let client: asana.Client | null = null;

export function getAsanaClient(): asana.Client {
  if (!client) {
    const token = process.env.ASANA_TOKEN;
    if (!token) {
      throw new Error('ASANA_TOKEN environment variable is not set');
    }
    // Asana SDK v1.x uses method chaining: Client.create().useAccessToken(token)
    client = asana.Client.create().useAccessToken(token);
  }
  return client;
}

// Custom field GIDs from documentation
export const CUSTOM_FIELDS = {
  PROD_DEPT: '1210998867548457',
  TOTAL_TIME: '1211050097902110',
  QTY_PARTS: '1211521540574994',
  PROCESS_TIME: '1212346791922304',
  SCHEDULED_PPM: '1211333073103705',
  ACTUAL_PPM: '1211333010718834',
  PRODUCTIVITY: '1211049984069827',
  SHIFTS: '1211050228588906',
  EST_START_DATE: '1211594523120745',
  EST_DUE_DATE: '1211594524354161',
  PERCENTAGE_COMPLETE: '1211673243352085',
} as const;

// Department project GIDs (from asana_blueprint.md)
export const DEPARTMENT_PROJECTS: Record<string, string> = {
  'Water Jets': '1209296874456267',
  'Routers': '1211016974304211',
  'Saws': '1211016974322485',
  'Presses': '1211016974322479',
  'Assembly': '1211016974322491',
  'Sampling': '1211017167732352',
};

// Get all Production Department projects (Department = Production Department = Asana Project)
export async function getDepartmentProjects() {
  const client = getAsanaClient();
  const workspaceGid = process.env.ASANA_WORKSPACE_GID;
  
  if (!workspaceGid) {
    throw new Error('ASANA_WORKSPACE_GID environment variable is not set');
  }

  const projectsResponse = await client.projects.getProjectsForWorkspace(workspaceGid, {
    opt_fields: 'gid,name,notes',
  });

  const projects = projectsResponse.data || [];

  // Filter for Production Departments using DEPARTMENT_PROJECTS keys for consistency
  const productionDepartments = Object.keys(DEPARTMENT_PROJECTS);
  const filteredProjects = projects.filter((p: any) => productionDepartments.includes(p.name));
  
  // Validate that fetched projects match expected GIDs (optional check)
  // This helps catch any mismatches in project configuration
  filteredProjects.forEach((project: any) => {
    const expectedGid = DEPARTMENT_PROJECTS[project.name];
    if (expectedGid && project.gid !== expectedGid) {
      console.warn(`Warning: Project "${project.name}" has GID ${project.gid}, but expected ${expectedGid}. Update DEPARTMENT_PROJECTS if this is intentional.`);
    }
  });
  
  return filteredProjects;
}

// Get tasks from a project, excluding "New Orders" and "Done" sections
export async function getProjectTasks(projectGid: string) {
  const client = getAsanaClient();
  
  // Get all sections in the project
  const sectionsResponse = await client.sections.getSectionsForProject(projectGid, {
    opt_fields: 'gid,name',
  });

  const sections = sectionsResponse.data || [];

  // Filter out "New Orders" and "Done" sections
  const excludedSections = ['New Orders', 'Done'];
  const validSections = sections.filter(
    (s: any) => !excludedSections.includes(s.name)
  );

  // If no valid sections, return empty array
  if (validSections.length === 0) {
    return [];
  }

  // Get tasks from valid sections
  const allTasks: any[] = [];
  
  for (const section of validSections) {
    try {
      const tasksResponse = await client.tasks.getTasksForSection(section.gid, {
        opt_fields: 'gid,name,start_on,due_on,custom_fields,parent',
      });
      
      const tasks = tasksResponse.data || [];
      
      // Enrich tasks with custom fields
      for (const task of tasks) {
        try {
          const enrichedTask = await getTaskDetails(task.gid);
          allTasks.push({
            ...enrichedTask,
            section_name: section.name,
          });
        } catch (error) {
          console.error(`Error enriching task ${task.gid}:`, error);
          // Continue with other tasks even if one fails
        }
      }
    } catch (error) {
      console.error(`Error fetching tasks for section ${section.gid}:`, error);
      // Continue with other sections even if one fails
    }
  }

  return allTasks;
}

// Get detailed task information with custom fields
export async function getTaskDetails(taskGid: string) {
  const client = getAsanaClient();
  
  const task = await client.tasks.getTask(taskGid, {
    opt_fields: 'gid,name,start_on,due_on,start_at,due_at,custom_fields,parent,projects',
  });

  // Extract custom field values
  const customFields: Record<string, any> = {};
  if (task.custom_fields) {
    for (const field of task.custom_fields) {
      let value: any = null;
      
      if (field.type === 'number') {
        value = field.number_value;
      } else if (field.type === 'text') {
        value = field.text_value;
      } else if (field.type === 'enum') {
        value = field.enum_value?.name || null;
      } else if (field.type === 'date') {
        value = field.date_value;
      } else if (field.type === 'multi_enum') {
        value = field.multi_enum_values?.map((v: any) => v.name) || [];
      }

      customFields[field.gid] = {
        name: field.name,
        value: value,
        type: field.type,
      };
    }
  }

  // Extract Machine (Prod Dept custom field) from custom fields
  const prodDeptField = task.custom_fields?.find(
    (f: any) => f.gid === CUSTOM_FIELDS.PROD_DEPT
  );
  const machineName = prodDeptField?.enum_value?.name || null;

  return {
    gid: task.gid,
    name: task.name,
    start_on: task.start_on,
    start_at: task.start_at,
    due_on: task.due_on,
    due_at: task.due_at,
    custom_fields: customFields,
    machine_name: machineName,
    project_gids: task.projects?.map((p: any) => p.gid) || [],
  };
}

// Cache tasks in database
export async function cacheTasks(projectGid: string) {
  const tasks = await getProjectTasks(projectGid);
  
  if (tasks.length === 0) {
    console.log(`No tasks to cache for project ${projectGid}`);
    return;
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO asana_tasks_cache 
    (task_gid, task_name, project_gid, section_name, start_date, due_date, prod_dept, machine_name, custom_fields_json, last_synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertMany = db.transaction((tasks: any[]) => {
    for (const task of tasks) {
      try {
        stmt.run(
          task.gid,
          task.name,
          projectGid,
          task.section_name || null,
          task.start_on || task.start_at || null,
          task.due_on || task.due_at || null,
          task.machine_name || null,
          task.machine_name || null,
          JSON.stringify(task.custom_fields || {}),
        );
      } catch (error) {
        console.error(`Error caching task ${task.gid}:`, error);
        // Continue with other tasks even if one fails
      }
    }
  });

  try {
    insertMany(tasks);
    console.log(`Cached ${tasks.length} tasks for project ${projectGid}`);
  } catch (error) {
    console.error(`Error caching tasks for project ${projectGid}:`, error);
    throw error;
  }
}

