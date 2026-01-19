// app/api/sprints/[sprintId]/add-tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import Sprint from '@/models/Sprint';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sprintId: string }> }
) {
  try {
    await connectDB();
    
    const { sprintId } = await context.params;
    const body = await request.json();
    const { taskIds } = body;

    // Validate sprint ID
    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sprint ID' },
        { status: 400 }
      );
    }

    // Check if sprint exists
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return NextResponse.json(
        { success: false, error: 'Sprint not found' },
        { status: 404 }
      );
    }

    // Validate task IDs
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task IDs array is required' },
        { status: 400 }
      );
    }

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

    // Check if tasks exist
    const existingTasks = await Task.find({ _id: { $in: taskIds } });
    if (existingTasks.length !== taskIds.length) {
      const foundIds = existingTasks.map(t => t._id.toString());
      const missingIds = taskIds.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Some tasks not found',
          missingTaskIds: missingIds
        },
        { status: 404 }
      );
    }

    // Update tasks to add them to the sprint
    const result = await Task.updateMany(
      { 
        _id: { $in: taskIds }
      },
      { 
        $set: { 
          sprintId,
          status: 'To Do', // Move to "To Do" when added to sprint
          updatedAt: new Date()
        }
      }
    );

    // Update sprint's task count if needed
    if (sprint.tasks && Array.isArray(sprint.tasks)) {
      // Add task IDs to sprint's tasks array if not already there
      const existingTaskIds = sprint.tasks.map((id: any) => id.toString());
      const newTaskIds = taskIds.filter(id => !existingTaskIds.includes(id));
      
      if (newTaskIds.length > 0) {
        await Sprint.findByIdAndUpdate(
          sprintId,
          { 
            $addToSet: { tasks: { $each: newTaskIds } },
            updatedAt: new Date()
          }
        );
      }
    }

    // Get the updated tasks for response
    const updatedTasks = await Task.find({ _id: { $in: taskIds } });

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} task${result.modifiedCount !== 1 ? 's' : ''} added to sprint "${sprint.name}"`,
      data: {
        sprint: {
          _id: sprint._id,
          name: sprint.name,
          status: sprint.status
        },
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        tasks: updatedTasks
      }
    });

  } catch (error: any) {
    console.error('Error adding tasks to sprint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to add tasks to sprint'
      },
      { status: 500 }
    );
  }
}