import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";
import mongoose from 'mongoose';

const DEPT_WEBHOOK_MAP: Record<string, string | undefined> = {
  tech: process.env.SLACK_WEBHOOK_URL,
  accounts: process.env.SLACK_WEBHOOK_URL_ACC,
  "it admin": process.env.SLACK_WEBHOOK_URL_ITADMIN ?? process.env.SLACK_WEBHOOK_URL,
  manager: process.env.SLACK_WEBHOOK_URL_MANAGER ?? process.env.SLACK_WEBHOOK_URL,
  "admin & operations": process.env.SLACK_WEBHOOK_URL_ADMINOPS ?? process.env.SLACK_WEBHOOK_URL,
  hr: process.env.SLACK_WEBHOOK_URL_HR ?? process.env.SLACK_WEBHOOK_URL,
  founders: process.env.SLACK_WEBHOOK_URL_FOUNDERS ?? process.env.SLACK_WEBHOOK_URL,
};

async function postToSlack(webhookUrl: string, payload: any) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to post to Slack:", err);
  }
}

// Function to normalize status values to match schema enum
const normalizeStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    // Map 'To Do' variations to 'Todo'
    'To Do': 'Todo',
    'To do': 'Todo',
    'to do': 'Todo',
    'todo': 'Todo',
    'To-Do': 'Todo',
    // Map 'In Progress' variations
    'In Progress': 'In Progress',
    'in progress': 'In Progress',
    'In progress': 'In Progress',
    'In-Progress': 'In Progress',
    'InProgress': 'In Progress',
    // Map other statuses
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
    'Paused': 'Blocked',
    'paused': 'Blocked'
  };
  return statusMap[status] || status;
};

// Function to normalize and validate subtask structure recursively
const normalizeAndValidateSubtasks = (subtasks: any[], parentId?: string): any[] => {
  if (!subtasks || !Array.isArray(subtasks)) return [];
  
  return subtasks.map((subtask, index) => {
    // Generate a proper ID if not provided
    const subtaskId = subtask.id || `subtask-${parentId || 'root'}-${index}-${Date.now()}`;
    
    return {
      ...subtask,
      id: subtaskId,
      title: subtask.title || `Subtask ${index + 1}`,
      status: normalizeStatus(subtask.status || 'To Do'),
      storyPoints: subtask.storyPoints || 0,
      timeSpent: subtask.timeSpent || 0,
      assigneeName: subtask.assigneeName || '',
      remarks: subtask.remarks || '',
      completion: subtask.completion || 0,
      subtasks: normalizeAndValidateSubtasks(subtask.subtasks || [], subtaskId),
      createdAt: subtask.createdAt || new Date(),
      updatedAt: new Date()
    };
  });
};

// Define a type for the task document
interface TaskDocument {
  _id: mongoose.Types.ObjectId;
  taskId: string;
  summary: string;
  description?: string;
  status: string;
  assigneeIds?: string[];
  assigneeNames?: string[];
  reporterIds?: string[];
  reporterNames?: string[];
  storyPoints?: number;
  priority?: string;
  issueType?: string;
  projectId?: string;
  epicId?: string;
  sprintId?: string;
  subtasks?: any[];
  remarks?: string;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  labels?: string[];
  currentLabel?: string;
  duration?: number;
  epicName?: string;
  projectName?: string;
  projectKey?: string;
  completion?: number;
  department?: string;
  taskTimeSpent?: string;
  taskStoryPoints?: number;
  project?: string;
  name?: string;
  title?: string;
  __v?: number;
}

// GET - Get a single task by ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  await connectDB();
  try {
    const { taskId } = await context.params;
    
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID' },
        { status: 400 }
      );
    }
    
    const task = await Task.findById(taskId).lean() as TaskDocument | null;
    
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    console.log('GET task:', task.taskId, 'with subtasks:', task.subtasks?.length || 0);
    
    return NextResponse.json({ 
      success: true, 
      data: task 
    });
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a task
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  await connectDB();
  try {
    const { taskId } = await context.params;
    const body = await req.json();
    
    console.log('=== TASK UPDATE ===');
    console.log('Updating task:', taskId);
    console.log('Update data keys:', Object.keys(body));
    console.log('Subtasks in request:', body.subtasks?.length || 0);
    
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID' },
        { status: 400 }
      );
    }
    
    // Get user info (for Slack notifications only)
    const userName = req.headers.get('x-user-name') || 'Unknown User';
    
    const existingTask = await Task.findById(taskId);
    
    if (!existingTask) {
      return NextResponse.json({ 
        success: false,
        error: "Task not found" 
      }, { status: 404 });
    }

    const existingTaskObj = existingTask.toObject() as TaskDocument;
    
    // Prepare update data - remove metadata fields
    const updateData: Record<string, any> = {};
    const updateFields = Object.keys(body).filter(key => 
      !['_id', '__v'].includes(key)
    );
    
    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        // Normalize status value if it's the status field
        if (field === 'status' && typeof body[field] === 'string') {
          updateData[field] = normalizeStatus(body[field]);
          console.log('Normalized status:', body[field], '->', updateData[field]);
        } 
        // Handle subtasks specially
        else if (field === 'subtasks') {
          console.log('Processing subtasks field');
          updateData[field] = normalizeAndValidateSubtasks(body[field] || []);
          console.log('Validated subtasks count:', updateData[field].length);
          if (updateData[field].length > 0) {
            console.log('First subtask sample:', JSON.stringify(updateData[field][0], null, 2));
          }
        } else {
          updateData[field] = body[field];
        }
      }
    });
    
    // Always update the timestamp
    updateData.updatedAt = new Date();
    
    console.log('Applying update with fields:', Object.keys(updateData));
    if (updateData.subtasks) {
      console.log('Subtasks being saved:', updateData.subtasks.length);
    }

    // Update the task with proper validation
    const updatedTask = await Task.findByIdAndUpdate(
      taskId, 
      updateData, 
      { 
        new: true, 
        runValidators: true,
        context: 'query' // This helps with validation
      }
    );

    if (!updatedTask) {
      return NextResponse.json({ 
        success: false,
        error: "Task update failed" 
      }, { status: 500 });
    }

    const updatedTaskObj = updatedTask.toObject() as TaskDocument;
    
    console.log('Task updated successfully. New subtasks count:', updatedTaskObj.subtasks?.length || 0);

    // Status Change Slack Alert (optional)
    if (body.status && body.status !== existingTaskObj.status) {
      const department = (updatedTaskObj.department || existingTaskObj.department || "").toLowerCase();
      const webhook = DEPT_WEBHOOK_MAP[department] ?? DEPT_WEBHOOK_MAP["tech"];
      
      if (webhook) {
        // Use the original status value for Slack notification (not normalized)
        const slackMessage = `🔔 *Status Changed*\n*Task:* ${updatedTaskObj.taskId || taskId}\n*Summary:* ${updatedTaskObj.summary || 'No title'}\n*Old Status:* ${existingTaskObj.status}\n*New Status:* ${body.status}\n*Updated By:* ${userName}`;
        
        const blocks = [
          { 
            type: "section", 
            text: { 
              type: "mrkdwn", 
              text: slackMessage
            } 
          }
        ];
        await postToSlack(webhook, { blocks });
        console.log('Slack notification sent');
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedTaskObj,
      message: 'Task updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    console.error('Error stack:', error.stack);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      console.error('Validation errors:', errors);
      return NextResponse.json({ 
        success: false,
        error: `Validation failed: ${errors.join(', ')}`,
        validationErrors: error.errors
      }, { status: 400 });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false,
        error: 'Duplicate key error. This task ID already exists.',
        code: 'DUPLICATE_KEY'
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to update task'
    }, { status: 500 });
  }
}

// DELETE - Delete a task
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  await connectDB();
  try {
    const { taskId } = await context.params;
    
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID' },
        { status: 400 }
      );
    }
    
    // Get user info (for logging only)
    const userName = req.headers.get('x-user-name') || 'Unknown User';
    
    console.log('DELETE request for task:', taskId, 'by user:', userName);
    
    const deletedTask = await Task.findByIdAndDelete(taskId);
    
    if (!deletedTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    console.log('Task deleted successfully:', {
      taskId: deletedTask._id,
      summary: deletedTask.summary
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Task deleted successfully",
      data: {
        taskId: deletedTask._id,
        summary: deletedTask.summary,
        taskIdString: deletedTask.taskId
      }
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}