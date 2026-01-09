# Asana API Reference (For Cursor)

## Authentication

**Environment Variables:**
```env
ASANA_ACCESS_TOKEN=2/1206466292344772/1211999860358238:917a17746b4319e54630fe4df1cdde90
ASANA_WORKSPACE_GID=1139018700565569
```

**API Base URL:**
```
https://app.asana.com/api/1.0
```

**Authentication Header:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Rate Limits

- **150 requests per 15 minutes per project**
- **1500 requests per 15 minutes per workspace**
- Implement exponential backoff for rate limit handling
- Use batch requests when possible

## Client Initialization

**TypeScript/Node.js:**
```typescript
import * as asanaModule from 'asana';

const asana = (asanaModule as any).default || asanaModule;

// Asana v3.x uses ApiClient
if (asana.ApiClient) {
  const client = new asana.ApiClient();
  client.authentications.token.accessToken = ASANA_PAT;
  client.tasks = new asana.TasksApi(client);
} else if (asana.Client) {
  // Fallback for older versions
  const client = asana.Client.create({
    defaultHeaders: {
      'Asana-Enable': 'new_user_task_lists,new_project_templates'
    }
  });
  client.useAccessToken(ASANA_PAT);
}
```

## Useful Endpoints

### Fetching Tasks

**Get all tasks from a project:**
```http
GET /projects/{project_gid}/tasks?completed=false&opt_fields=gid,name,completed,projects,parent,custom_fields,memberships,due_on,start_on,created_at,modified_at
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Get task by GID:**
```http
GET /tasks/{task_gid}?opt_fields=gid,name,completed,projects,parent,custom_fields,memberships,due_on,start_on
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Get tasks from section:**
```http
GET /sections/{section_gid}/tasks?opt_fields=gid,name,completed,projects,parent,custom_fields,memberships.section.name,memberships.section.gid,memberships.project.name,memberships.project.gid,due_on,start_on
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Updating Tasks

**Update task custom fields:**
```http
PUT /tasks/{task_gid}
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "data": {
    "custom_fields": {
      "1211594523120745": "2025-01-27",
      "1211594524354161": "2025-01-30",
      "1211050228588906": 2.5
    }
  }
}
```

**Update task due date:**
```http
PUT /tasks/{task_gid}
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "data": {
    "due_on": "2025-01-30"
  }
}
```

## Custom Field Access Patterns

### Reading Custom Fields

```typescript
// Get custom field by name or GID
function getCustomField(task: AsanaTask, fieldName: string, fieldGid?: string): AsanaCustomField | undefined {
  if (!task.custom_fields || !Array.isArray(task.custom_fields)) return undefined;
  
  const norm = (s: string) => String(s || '').normalize('NFKD').replace(/[^\w\s/-]/g, '').trim().toLowerCase();
  
  // Try by GID first
  if (fieldGid) {
    const byId = task.custom_fields.find(cf => String(cf.gid) === String(fieldGid));
    if (byId) return byId;
  }
  
  // Then try by name (normalized)
  const normalizedName = norm(fieldName);
  const byName = task.custom_fields.find(cf => norm(cf.name) === normalizedName);
  if (byName) return byName;
  
  return undefined;
}

// Get as number
function getCustomFieldNumber(task: AsanaTask, fieldName: string): number | null {
  const field = getCustomField(task, fieldName);
  if (!field) return null;
  
  // Check display_value first (Asana API format)
  if ((field as any).display_value !== undefined && (field as any).display_value !== null) {
    const num = Number((field as any).display_value);
    if (!isNaN(num)) return num;
  }
  
  // Fallback to number_value
  if (field.type === 'number' && typeof field.number_value === 'number') {
    return field.number_value;
  }
  
  return null;
}

// Get as string (for enum fields)
function getCustomFieldString(task: AsanaTask, fieldName: string): string | null {
  const field = getCustomField(task, fieldName);
  if (!field) return null;
  
  // Check display_value first
  if ((field as any).display_value !== undefined && (field as any).display_value !== null) {
    return String((field as any).display_value);
  }
  
  if (field.type === 'enum' && field.enum_value) {
    return field.enum_value.name;
  }
  
  if (field.type === 'text' && field.text_value) {
    return field.text_value;
  }
  
  return null;
}

// Get as date (YYYY-MM-DD)
function getCustomFieldDate(task: AsanaTask, fieldName: string): string | null {
  const field = getCustomField(task, fieldName);
  if (!field || field.type !== 'date') return null;
  return field.date_value ?? null;
}
```

## Department Detection

**From task memberships:**
```typescript
function getDepartmentFromTask(task: AsanaTask): string | null {
  const DEPT_WHITELIST = new Set([
    'saws', 'water jets', 'routers', 'presses', 'assembly', 'sampling department', 'sampling dept'
  ]);
  
  const norm = (s: string) => String(s || '').normalize('NFKD').replace(/[^\w\s/-]/g, '').trim().toLowerCase();
  const pretty = (s: string) => String(s || '').replace(/\b\w/g, c => c.toUpperCase());
  
  // Check memberships first (n8n's approach)
  if (task.memberships && task.memberships.length > 0) {
    const names = task.memberships.map(m => m?.project?.name).filter(Boolean) as string[];
    const joined = ' ' + names.map(n => norm(n)).join(' ') + ' ';
    for (const d of DEPT_WHITELIST) {
      if (joined.includes(' ' + d + ' ')) {
        return pretty(d);
      }
    }
  }
  
  // Fallback to projects
  if (task.projects && task.projects.length > 0) {
    const names = task.projects.map(p => p.name).filter(Boolean);
    const joined = ' ' + names.map(n => norm(n)).join(' ') + ' ';
    for (const d of DEPT_WHITELIST) {
      if (joined.includes(' ' + d + ' ')) {
        return pretty(d);
      }
    }
  }
  
  return null;
}
```

## Work Order Identification

**Check if task is a work order:**
```typescript
function isWorkOrder(task: AsanaTask, schedulingProjectGid: string): boolean {
  const hasWOTitle = !!(task.name && (task.name.includes('- WO') || task.name.includes(' - WO')));
  
  // Check memberships first
  const isInSchedulingProjectMembership = task.memberships?.some(
    m => m?.project?.gid === schedulingProjectGid
  ) || false;
  
  // Fallback to projects
  const isInSchedulingProject = task.projects?.some(
    p => p.gid === schedulingProjectGid
  ) || false;
  
  return hasWOTitle && (isInSchedulingProjectMembership || isInSchedulingProject);
}
```

## TypeScript Types

```typescript
interface AsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  projects?: Array<{ gid: string; name: string }>;
  memberships?: Array<{ project?: { gid: string; name: string } }>;
  parent?: { gid: string; name: string } | null;
  custom_fields?: AsanaCustomField[];
  start_on?: string | null;
  due_on?: string | null;
  created_at?: string;
  modified_at?: string;
  completed_at?: string | null;
  permalink_url?: string;
}

interface AsanaCustomField {
  gid: string;
  name: string;
  type: 'text' | 'number' | 'enum' | 'date' | 'multi_enum';
  text_value?: string | null;
  number_value?: number | null;
  date_value?: string | null;
  enum_value?: { gid: string; name: string } | null;
  multi_enum_values?: Array<{ gid: string; name: string }>;
}
```

## Example Queries

### Fetch and Process Tasks

```typescript
async function fetchAndScheduleTasks(projectGid: string) {
  // Fetch tasks
  const tasks = await getAllTasksFromProject(projectGid);
  
  // Separate completed and incomplete
  const completedTasks = tasks.filter(t => t.completed);
  const incompleteTasks = tasks.filter(t => !t.completed && t.due_on);
  
  // Group by machine + department
  const groups: Record<string, AsanaTask[]> = {};
  
  for (const task of incompleteTasks) {
    const prodDept = getCustomFieldString(task, 'Prod Dept');
    const department = getDepartmentFromTask(task);
    
    if (prodDept && department) {
      const key = `${department}:${prodDept}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    }
  }
  
  // Sort each group by due date
  for (const key in groups) {
    groups[key].sort((a, b) => {
      if (!a.due_on) return 1;
      if (!b.due_on) return -1;
      return a.due_on.localeCompare(b.due_on);
    });
  }
  
  // Calculate schedules for each group
  const updates: Array<{ taskGid: string; estStart: string; estDue: string; shifts: number }> = [];
  
  for (const [key, groupTasks] of Object.entries(groups)) {
    let cursor = new Date(); // Initialize cursor
    cursor.setHours(7, 0, 0, 0); // Start of work day
    
    for (const task of groupTasks) {
      const totalMinutes = getCustomFieldNumber(task, 'Total Time');
      if (!totalMinutes || totalMinutes <= 0) continue;
      
      const bufferedMinutes = Math.ceil(totalMinutes * BUFFER_FACTOR);
      const shifts = bufferedMinutes / MINUTES_PER_DAY;
      
      const estStart = new Date(cursor);
      const estDue = addProductionMinutes(estStart, bufferedMinutes);
      
      updates.push({
        taskGid: task.gid,
        estStart: formatDate(estStart),
        estDue: formatDate(estDue),
        shifts: Math.round(shifts * 10) / 10 // Round to 1 decimal
      });
      
      // Move cursor forward
      cursor = new Date(estDue);
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(7, 0, 0, 0);
      
      // Skip weekends
      while (cursor.getDay() === 0 || cursor.getDay() === 6) {
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }
  
  // Update tasks in Asana
  for (const update of updates) {
    await updateTaskCustomFields(update.taskGid, {
      estStart: update.estStart,
      estDue: update.estDue,
      shifts: update.shifts
    });
  }
}
```

## Error Handling

1. **Missing fields:** Skip tasks without required fields, log warnings
2. **API errors:** Implement retry logic with exponential backoff
3. **Rate limits:** Respect Asana rate limits, implement delays between requests
4. **Invalid dates:** Validate date formats, handle timezone issues
5. **Missing projects:** Log warnings for tasks not in expected projects

## External Documentation

- [Asana API Documentation](https://developers.asana.com/docs)
- [Asana API Reference](https://developers.asana.com/reference)
