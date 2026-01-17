import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';

// Use projectId to match the folder name: [projectId]
type RouteParams = Promise<{ projectId: string }>;

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    await connectDB();
    
    // Await the params to get the project id from the URL
    const { projectId } = await params; // Changed from id to projectId
    
    const body = await request.json();
    const { operation, tasks } = body;

    if (!operation || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    let result;
    
    switch (operation) {
      case 'create':
        // Add projectId to each task using the 'projectId' from params
        const tasksWithProjectId = tasks.map(task => ({
          ...task,
          projectId: projectId // Changed from id to projectId
        }));
        result = await Task.insertMany(tasksWithProjectId);
        break;

      case 'update':
        // Bulk update tasks
        const updateOperations = tasks.map(task => ({
          updateOne: {
            filter: { 
              projectId: projectId, // Changed from id to projectId
              taskId: task.taskId 
            },
            update: { $set: task }
          }
        }));
        result = await Task.bulkWrite(updateOperations);
        break;

      case 'updateStatus':
        // Bulk update status
        const statusUpdateOps = tasks.map(task => ({
          updateOne: {
            filter: { 
              projectId: projectId, // Changed from id to projectId
              taskId: task.taskId 
            },
            update: { $set: { status: task.status } }
          }
        }));
        result = await Task.bulkWrite(statusUpdateOps);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid operation' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk ${operation} completed successfully`
    });
  } catch (error: any) {
    console.error("Bulk task error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}