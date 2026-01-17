import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';

// Params must match folder names: [projectId] and [status]
type RouteParams = Promise<{ projectId: string; status: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    await connectDB();
    
    // Await the params
    const { projectId, status } = await params; // Changed from id to projectId
    
    const tasks = await Task.find({
      projectId: projectId, // Use 'projectId' from the URL to query your 'projectId' field
      status: status
    }).sort({ dueDate: 1, priority: -1 });

    return NextResponse.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}