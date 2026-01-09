import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');

    let operators;
    if (department) {
      operators = db
        .prepare('SELECT DISTINCT name FROM operators WHERE department = ? OR department IS NULL ORDER BY name')
        .all(department);
    } else {
      operators = db
        .prepare('SELECT DISTINCT name FROM operators ORDER BY name')
        .all();
    }

    // Also get unique operators from QC entries
    const qcOperators = db
      .prepare('SELECT DISTINCT operator as name FROM qc_entries WHERE operator IS NOT NULL ORDER BY operator')
      .all() as Array<{ name: string }>;

    // Combine and deduplicate
    const allOperators = new Set<string>();
    operators.forEach((op: any) => allOperators.add(op.name));
    qcOperators.forEach((op) => allOperators.add(op.name));

    return NextResponse.json({
      operators: Array.from(allOperators).sort().map(name => ({ name })),
    });
  } catch (error: any) {
    console.error('Error fetching operators:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch operators' },
      { status: 500 }
    );
  }
}

