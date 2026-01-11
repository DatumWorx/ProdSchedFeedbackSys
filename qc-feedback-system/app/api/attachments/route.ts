import { NextResponse } from 'next/server';
import { getTaskAttachments } from '@/lib/asana';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskGid = searchParams.get('taskGid');

    if (!taskGid) {
      return NextResponse.json(
        { error: 'taskGid parameter is required' },
        { status: 400 }
      );
    }

    const attachments = await getTaskAttachments(taskGid);

    return NextResponse.json({
      attachments,
    });
  } catch (error: any) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}
