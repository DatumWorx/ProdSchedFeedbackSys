import { NextResponse } from 'next/server';
import { getActiveWorkSession, getAllWorkSessionsForPart, getTotalPartsProducedForPart, startWorkSession, updateWorkSessionParts, endWorkSession } from '@/lib/db';

/**
 * GET /api/work-session?operator=xxx&partGid=xxx
 * Check if there's an active work session for the operator and part
 * Also returns all sessions for the part and total parts produced
 * Operator is optional - if not provided, only returns all sessions and totals
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const operatorName = searchParams.get('operator');
    const partGid = searchParams.get('partGid');

    if (!partGid) {
      return NextResponse.json(
        { error: 'Part GID is required' },
        { status: 400 }
      );
    }

    const allSessions = getAllWorkSessionsForPart(partGid);
    const totalPartsProduced = getTotalPartsProducedForPart(partGid);
    
    // Calculate total from active sessions (not yet in QC entries)
    const activeSessionsTotal = allSessions
      .filter(s => s.end_timestamp === null)
      .reduce((sum, s) => sum + (s.total_parts_produced || 0), 0);
    
    const runningTotal = totalPartsProduced + activeSessionsTotal;
    
    // Get active session for operator if operator is provided
    let session = null;
    let active = false;
    if (operatorName) {
      session = getActiveWorkSession(operatorName, partGid);
      active = session !== null;
    }
    
    return NextResponse.json({
      active: active,
      session: session,
      allSessions: allSessions,
      totalPartsProduced: totalPartsProduced,
      runningTotal: runningTotal,
    });
  } catch (error: any) {
    console.error('Error checking work session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check work session' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/work-session
 * Start a new work session
 * Body: { operatorName, partGid, partName?, department? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operatorName, partGid, partName, department } = body;

    if (!operatorName || !partGid) {
      return NextResponse.json(
        { error: 'Operator name and part GID are required' },
        { status: 400 }
      );
    }

    // Check if there's already an active session
    const existingSession = getActiveWorkSession(operatorName, partGid);
    if (existingSession) {
      return NextResponse.json(
        { error: 'An active work session already exists for this operator and part' },
        { status: 409 }
      );
    }

    const sessionId = startWorkSession(operatorName, partGid, partName || null, department || null);
    const session = getActiveWorkSession(operatorName, partGid);

    return NextResponse.json({
      success: true,
      sessionId,
      session,
    });
  } catch (error: any) {
    console.error('Error starting work session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start work session' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/work-session
 * Add parts count to an active work session (adds to running total)
 * Body: { sessionId, partsCount }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, partsCount } = body;

    if (!sessionId || partsCount === undefined) {
      return NextResponse.json(
        { error: 'Session ID and parts count are required' },
        { status: 400 }
      );
    }

    if (typeof partsCount !== 'number' || partsCount < 0) {
      return NextResponse.json(
        { error: 'Parts count must be a non-negative number' },
        { status: 400 }
      );
    }

    updateWorkSessionParts(sessionId, partsCount);

    return NextResponse.json({
      success: true,
      message: 'Parts count updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating work session parts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update parts count' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/work-session
 * End a work session and create a QC entry
 * Body: { sessionId }
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const { session, qcEntryId } = endWorkSession(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Work session ended and QC entry created',
      session,
      qcEntryId,
    });
  } catch (error: any) {
    console.error('Error ending work session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end work session' },
      { status: 500 }
    );
  }
}