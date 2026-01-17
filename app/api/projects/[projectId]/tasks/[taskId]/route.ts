import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';

// Use projectId and taskId to match folder names: [projectId] and [taskId]
type RouteParams = Promise<{ projectId: string; taskId: string }>;

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    await connectDB();
    
    // Await the params
    const { projectId, taskId } = await params; // Changed from id to projectId
    
    const task = await Task.findOne({
      projectId: projectId, // Updated to use projectId
      taskId: taskId
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    await connectDB();
    
    const { projectId, taskId } = await params; // Changed from id to projectId
    const body = await request.json();
    
    const task = await Task.findOneAndUpdate(
      { projectId: projectId, taskId: taskId }, // Updated to use projectId
      body,
      { new: true, runValidators: true }
    );

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    await connectDB();
    
    const { projectId, taskId } = await params; // Changed from id to projectId
    
    const task = await Task.findOneAndDelete({
      projectId: projectId, // Updated to use projectId
      taskId: taskId
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}