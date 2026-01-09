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
    client = asana.Client.create({
      authType: 'token',
      token: token,
    });
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

// Department project GIDs (from context)
export const DEPARTMENT_PROJECTS: Record<string, string> = {
  'Water Jets': '', // Will need to be configured
  'Routers': '',
  'Saws': '',
  'Presses': '',
  'Assembly': '',
  'Sampling': '',
};

// Get all production department projects
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

  // Filter for production departments
  const productionDepartments = ['Water Jets', 'Routers', 'Saws', 'Presses', 'Assembly', 'Sampling'];
  return projects.filter((p: any) => productionDepartments.includes(p.name));
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

  // Get tasks from valid sections
  const allTasks: any[] = [];
  
  for (const section of validSections) {
    const tasksResponse = await client.tasks.getTasksForSection(section.gid, {
      opt_fields: 'gid,name,start_on,due_on,custom_fields,parent',
    });
    
    const tasks = tasksResponse.data || [];
    
    // Enrich tasks with custom fields
    for (const task of tasks) {
      const enrichedTask = await getTaskDetails(task.gid);
      allTasks.push({
        ...enrichedTask,
        section_name: section.name,
      });
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

  // Extract Prod Dept (machine) from custom fields
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
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO asana_tasks_cache 
    (task_gid, task_name, project_gid, section_name, start_date, due_date, prod_dept, machine_name, custom_fields_json, last_synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertMany = db.transaction((tasks: any[]) => {
    for (const task of tasks) {
      stmt.run(
        task.gid,
        task.name,
        projectGid,
        task.section_name,
        task.start_on || task.start_at,
        task.due_on || task.due_at,
        task.machine_name,
        task.machine_name,
        JSON.stringify(task.custom_fields),
      );
    }
  });

  insertMany(tasks);
}

