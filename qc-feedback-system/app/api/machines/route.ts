import { NextResponse } from 'next/server';
import { getAsanaClient, CUSTOM_FIELDS } from '@/lib/asana';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    if (!department) {
      return NextResponse.json(
        { error: 'Department parameter is required' },
        { status: 400 }
      );
    }

    const client = getAsanaClient();
    
    // Get custom field definition for Prod Dept
    const customField = await client.customFields.getCustomField(CUSTOM_FIELDS.PROD_DEPT, {
      opt_fields: 'enum_options',
    });

    // Filter machines by department
    // Department mapping based on context
    const departmentMachineMap: Record<string, string[]> = {
      'Water Jets': ['M2', 'M3'],
      'Routers': ['Router 1', 'Router 2', 'Router 3', 'Router 4', 'Router 5', 'Contour'],
      'Saws': ['Saws', 'Saws 2', 'Drills'],
      'Presses': ['Press 1', 'Press 2', 'AutoPress', 'Roller Press'],
      'Assembly': ['Assembly 1', 'Assembly 2'],
      'Sampling': ['Sampling', 'Paint', 'Converting/Skiving', 'Soft Foam', 'Laser', 'Stepcraft'],
    };

    const validMachines = departmentMachineMap[department] || [];
    
    const machines = customField.enum_options
      ?.filter((opt: any) => validMachines.includes(opt.name))
      .map((opt: any) => ({
        gid: opt.gid,
        name: opt.name,
        color: opt.color,
      })) || [];

    return NextResponse.json({ machines });
  } catch (error: any) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch machines' },
      { status: 500 }
    );
  }
}

