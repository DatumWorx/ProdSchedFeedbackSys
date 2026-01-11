import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Domain Model: Operator = who is running the job (stored in DB for pay scale/utilization tracking)
// Note: Operators are NOT used for filtering tasks - they are selected manually for logging data
export async function GET(request: Request) {
  try {
    // Always return all operators, regardless of department parameter
    // Department filtering is disabled - all operators show on all projects
    // Operators are for logging/utilization tracking, not for filtering
    const operators = db
      .prepare('SELECT DISTINCT name FROM operators ORDER BY name')
      .all();

    // Return operators with just the name
    return NextResponse.json({
      operators: operators.map((op: any) => ({ name: op.name })),
    });
  } catch (error: any) {
    console.error('Error fetching operators:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch operators' },
      { status: 500 }
    );
  }
}

