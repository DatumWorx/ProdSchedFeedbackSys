import { NextResponse } from 'next/server';
import { getDepartmentProjects } from '@/lib/asana';

export async function GET() {
  try {
    const departments = await getDepartmentProjects();
    return NextResponse.json({ departments });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

