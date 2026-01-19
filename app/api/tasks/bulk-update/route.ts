// app/api/tasks/bulk-update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import mongoose from 'mongoose';

// Function to normalize status values
const normalizeStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'To Do': 'Todo',
    'To do': 'Todo',
    'to do': 'Todo',
    'todo': 'Todo',
    'To-Do': 'Todo',
    'In Progress': 'In Progress',
    'in progress': 'In Progress',
    'In progress': 'In Progress',
    'In-Progress': 'In Progress',
    'InProgress': 'In Progress',
    'Review': 'Review',
    'review': 'Review',
    'Done': 'Done',
    'done': 'Done',
    'Completed': 'Done',
    'completed': 'Done',
    'Backlog': 'Backlog',
    'backlog': 'Backlog',
    'Blocked': 'Blocked',
    'blocked': 'Blocked',
  };
  return statusMap[status] || status;
};

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { taskIds, updateData } = body;

    // Validate required fields
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task IDs array is required' },
        { status: 400 }
      );
    }

    if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Update data is required' },
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

    // Prepare update data
    const preparedUpdateData: any = { ...updateData };
    
    // Normalize status if it's being updated
    if (preparedUpdateData.status) {
      preparedUpdateData.status = normalizeStatus(preparedUpdateData.status);
    }

    // Add updated timestamp
    preparedUpdateData.updatedAt = new Date();

    // Perform bulk update
    const result = await Task.updateMany(
      { 
        _id: { $in: taskIds }
      },
      { 
        $set: preparedUpdateData
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No tasks were updated',
          details: 'Tasks may not exist or already have the same values'
        },
        { status: 404 }
      );
    }

    // Get the updated tasks for response
    const updatedTasks = await Task.find({ _id: { $in: taskIds } });

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} task${result.modifiedCount !== 1 ? 's' : ''} updated successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        tasks: updatedTasks,
        updateFields: Object.keys(preparedUpdateData)
      }
    });

  } catch (error: any) {
    console.error('Error in bulk update:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: errors.join(', ')
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update tasks'
      },
      { status: 500 }
    );
  }
}