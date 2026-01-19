// app/api/tasks/move-to-sprint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { taskIds, sprintId } = body;

    // Validate required fields
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task IDs array is required' },
        { status: 400 }
      );
    }

    if (!sprintId) {
      return NextResponse.json(
        { success: false, error: 'Sprint ID is required' },
        { status: 400 }
      );
    }

    // Validate all task IDs
    const invalidTaskIds = taskIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidTaskIds.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid task IDs', 
          invalidTaskIds 
        },
        { status: 400 }
      );
    }

    // Update tasks to move them to the sprint
    const result = await Task.updateMany(
      { 
        _id: { $in: taskIds }
      },
      { 
        $set: { 
          sprintId,
          status: sprintId === 'none' || sprintId === null ? 'Backlog' : 'To Do'
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No tasks were updated',
          details: 'Tasks may not exist or already have the same sprint assignment'
        },
        { status: 404 }
      );
    }

    // Get the updated tasks for response
    const updatedTasks = await Task.find({ _id: { $in: taskIds } });

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} task${result.modifiedCount !== 1 ? 's' : ''} moved to sprint`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        tasks: updatedTasks
      }
    });

  } catch (error: any) {
    console.error('Error moving tasks to sprint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to move tasks to sprint'
      },
      { status: 500 }
    );
  }
}