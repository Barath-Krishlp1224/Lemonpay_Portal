import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Sprint from '@/models/Sprint';
import Task from '@/models/Task';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sprintId: string }> }
) {
  try {
    await connectDB();
    
    // Await the params
    const { sprintId } = await context.params; // Changed from id to sprintId
    
    // Remove sprint reference from tasks
    await Task.updateMany(
      { sprintId: sprintId }, // Changed from id to sprintId
      { $set: { sprintId: null, status: 'Backlog' } }
    );
    
    await Sprint.findByIdAndDelete(sprintId); // Changed from id to sprintId
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    return NextResponse.json(
      { error: 'Failed to delete sprint' },
      { status: 500 }
    );
  }
}