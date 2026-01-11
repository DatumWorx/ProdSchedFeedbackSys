import { NextResponse } from 'next/server';
import { getDepartmentProjects, DEPARTMENT_PROJECTS } from '@/lib/asana';

// Domain Model: Department = Production Department (corresponds to Asana Project)
export async function GET() {
  try {
    const departments = await getDepartmentProjects();
    
    // If no departments found, provide helpful error message
    if (!departments || departments.length === 0) {
      console.warn('No departments found. Check that:');
      console.warn('1. ASANA_WORKSPACE_GID is correct');
      console.warn('2. Projects with expected names exist in Asana:', Object.keys(DEPARTMENT_PROJECTS));
      console.warn('3. Asana token has permission to access these projects');
      
      return NextResponse.json(
        { 
          departments: [],
          warning: 'No departments found. Please verify Asana workspace and project configuration.',
          expectedDepartments: Object.keys(DEPARTMENT_PROJECTS)
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json({ departments });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to fetch departments';
    if (error.message?.includes('ASANA_TOKEN')) {
      errorMessage = 'ASANA_TOKEN environment variable is not set. Please configure it in .env.local';
    } else if (error.message?.includes('ASANA_WORKSPACE_GID')) {
      errorMessage = 'ASANA_WORKSPACE_GID environment variable is not set. Please configure it in .env.local';
    } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Asana authentication failed. Please verify your ASANA_TOKEN is valid.';
    } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      errorMessage = 'Asana workspace not found. Please verify your ASANA_WORKSPACE_GID is correct.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

