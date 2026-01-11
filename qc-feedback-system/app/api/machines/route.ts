import { NextResponse } from 'next/server';
import { getAsanaClient, CUSTOM_FIELDS } from '@/lib/asana';

// Domain Model: Machine = Prod Dept custom field enum values
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
    const workspaceGid = process.env.ASANA_WORKSPACE_GID;
    
    if (!workspaceGid) {
      throw new Error('ASANA_WORKSPACE_GID environment variable is not set');
    }
    
    // Get custom field definition for Prod Dept (this is the Machine custom field)
    // Use findByWorkspace to get all custom fields, then filter for the one we need
    // Note: SDK uses lowercase 'customfields' not 'customFields'
    let customField: any;
    try {
      const customFieldsResponse = await (client as any).customfields.findByWorkspace(workspaceGid, {
        opt_fields: 'enum_options',
      });
      
      // Find the Prod Dept custom field by GID
      const customFields = customFieldsResponse.data || [];
      customField = customFields.find((field: any) => field.gid === CUSTOM_FIELDS.PROD_DEPT);
      
      if (!customField) {
        throw new Error(`Custom field with GID ${CUSTOM_FIELDS.PROD_DEPT} not found in workspace`);
      }
    } catch (apiError: any) {
      console.error('Error fetching custom fields:', apiError);
      throw new Error(`Failed to fetch custom field from Asana: ${apiError.message || apiError.toString()}`);
    }

    // Filter Machine options (Prod Dept custom field enum values) by Production Department
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
    
    if (validMachines.length === 0) {
      console.warn(`No machine mapping found for department: ${department}`);
      return NextResponse.json({ machines: [], error: `No machine mapping found for department: ${department}` });
    }
    
    // Debug: Log the custom field structure
    console.log('Custom field response keys:', Object.keys(customField));
    console.log('Enum options type:', typeof customField.enum_options, 'Is array:', Array.isArray(customField.enum_options));
    
    if (!customField.enum_options || !Array.isArray(customField.enum_options) || customField.enum_options.length === 0) {
      console.warn('No enum options found in Prod Dept custom field. Custom field structure:', JSON.stringify(customField, null, 2));
      return NextResponse.json({ machines: [], error: 'No enum options found in Prod Dept custom field' });
    }
    
    const machines = customField.enum_options
      .filter((opt: any) => validMachines.includes(opt.name))
      .map((opt: any) => ({
        gid: opt.gid,
        name: opt.name,
        color: opt.color,
      }));

    console.log(`Found ${machines.length} machines for department ${department} (valid machines: ${validMachines.length}, total enum options: ${customField.enum_options.length})`);

    return NextResponse.json({ machines });
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Failed to fetch machines';
    console.error('Error fetching machines:', errorMessage, error);
    
    // Return error message - ensure it's always a string
    return NextResponse.json(
      { 
        error: String(errorMessage)
      },
      { status: 500 }
    );
  }
}

