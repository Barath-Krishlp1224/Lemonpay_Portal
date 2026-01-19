import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Task from '@/models/Task';
import mongoose from 'mongoose';

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
    // Map completion variations
    'Done': 'Done',
    'done': 'Done',
    'Completed': 'Done',
    'completed': 'Done',
    // Map other statuses
    'Backlog': 'Backlog',
    'backlog': 'Backlog',
    'Blocked': 'Blocked',
    'blocked': 'Blocked',
    'Paused': 'Blocked',
    'paused': 'Blocked',
    // Map new statuses (keep as is since they're in the enum)
    'Icebox': 'Icebox',
    'Prioritized': 'Prioritized',
    'Ready for Dev': 'Ready for Dev',
    'Dev Review': 'Dev Review',
    'Code Review': 'Code Review',
    'QA Ready': 'QA Ready',
    'QA In Progress': 'QA In Progress',
    'QA Review': 'QA Review',
    'UAT': 'UAT',
    'Client Review': 'Client Review',
    'Ready for Release': 'Ready for Release',
    'Staging': 'Staging',
    'Production': 'Production',
    'Live': 'Live',
    'Closed': 'Closed',
    'On Hold': 'On Hold',
    'Rejected': 'Rejected'
  };
  
  return statusMap[status] || status;
};

// GET all tasks across all projects
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const assignee = searchParams.get('assignee');
    const department = searchParams.get('department');
    const limit = parseInt(searchParams.get('limit') || '50');
    const epicId = searchParams.get('epicId');
    const projectId = searchParams.get('projectId');

    let query: any = {};

    if (assignee) query.assigneeIds = assignee;
    if (department) query.department = department;
    if (epicId) query.epicId = epicId;
    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('Received task data:', body);
    
    // Validate required fields
    if (!body.summary || !body.issueType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: summary and issueType are required' },
        { status: 400 }
      );
    }

    // Generate unique taskId based on project
    let taskNumber = 1;
    let lastTaskId = 'TASK-000';
    
    // Find the last task in this project to get the highest number
    const lastTask = await Task.findOne({ 
      projectId: body.projectId 
    }).sort({ createdAt: -1 });
    
    if (lastTask && lastTask.taskId) {
      lastTaskId = lastTask.taskId;
      // Extract numeric part from TASK-001 format
      const match = lastTaskId.match(/TASK-(\d+)$/);
      if (match && match[1]) {
        taskNumber = parseInt(match[1], 10) + 1;
      } else {
        // If pattern doesn't match, count existing tasks in project
        const taskCount = await Task.countDocuments({ projectId: body.projectId });
        taskNumber = taskCount + 1;
      }
    } else {
      // If no tasks exist in this project, check if it's the first task overall
      const anyTask = await Task.findOne().sort({ createdAt: -1 });
      if (anyTask && anyTask.taskId) {
        const match = anyTask.taskId.match(/TASK-(\d+)$/);
        if (match && match[1]) {
          taskNumber = parseInt(match[1], 10) + 1;
        }
      }
    }
    
    const generatedTaskId = `TASK-${taskNumber.toString().padStart(3, '0')}`;
    
    // Generate issueKey (Jira-style key like EPIC1-001)
    let issueNumber = 1;
    if (lastTask && lastTask.issueKey) {
      // Extract number from existing issueKey like EPIC1-001
      const issueMatch = lastTask.issueKey.match(/-(\d+)$/);
      if (issueMatch && issueMatch[1]) {
        issueNumber = parseInt(issueMatch[1], 10) + 1;
      }
    }
    
    const generatedIssueKey = `${body.projectKey || 'PROJ'}-${issueNumber.toString().padStart(3, '0')}`;
    
    console.log(`Generated IDs - TaskId: ${generatedTaskId}, IssueKey: ${generatedIssueKey}`);

    // Create task with validation
    const taskData: any = {
      // Basic fields
      summary: body.summary,
      description: body.description || '',
      issueType: body.issueType,
      status: normalizeStatus(body.status || 'Backlog'), // Normalize status here
      priority: body.priority || 'Medium',
      
      // IDs
      taskId: generatedTaskId,
      issueKey: generatedIssueKey,
      projectId: body.projectId,
      epicId: body.epicId || null,
      
      // People
      assigneeIds: body.assigneeIds || [],
      reporterIds: body.reporterIds || [body.createdBy] || [],
      assigneeNames: body.assigneeNames || [],
      reporterNames: body.reporterNames || [],
      createdBy: body.createdBy,
      
      // Details
      storyPoints: body.storyPoints || 0,
      labels: body.labels || [],
      duration: body.duration || 0,
      dueDate: body.dueDate || null,
      
      // References
      project: body.projectId,
      projectName: body.projectName,
      projectKey: body.projectKey,
      epicName: body.epicName,
      
      // Collections
      comments: body.comments || [],
      attachments: body.attachments || [],
      subtasks: body.subtasks || [], // Add subtasks field
      
      // Additional fields
      completion: body.completion || 0,
      department: body.department,
      remarks: body.remarks,
      startDate: body.startDate,
      endDate: body.endDate,
      taskTimeSpent: body.taskTimeSpent,
      taskStoryPoints: body.taskStoryPoints || 0,
      sprintId: body.sprintId,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clean up undefined values
    Object.keys(taskData).forEach((key: string) => {
      if (taskData[key] === undefined) {
        delete taskData[key];
      }
    });

    console.log('Creating task with final data:', JSON.stringify(taskData, null, 2));
    
    // Create and save the task
    const task = await Task.create(taskData);
    
    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      data: task,
      generatedIds: {
        taskId: generatedTaskId,
        issueKey: generatedIssueKey
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating task:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      // Extract the duplicate key from error
      let duplicateField = 'taskId';
      if (error.keyPattern) {
        duplicateField = Object.keys(error.keyPattern)[0];
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Duplicate ${duplicateField} detected. Please try again.`,
          duplicateField,
          keyValue: error.keyValue
        },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: errors.join(', '),
          validationErrors: error.errors 
        },
        { status: 400 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create task',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Update a task (using query parameter)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID' },
        { status: 400 }
      );
    }
    
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    let updateData: any = { ...body };
    
    // Normalize status if it's being updated
    if (body.status && typeof body.status === 'string') {
      updateData.status = normalizeStatus(body.status);
    }
    
    // Ensure consistency between IDs and names
    if (body.assigneeIds && Array.isArray(body.assigneeIds)) {
      if (!body.assigneeNames || body.assigneeNames.length !== body.assigneeIds.length) {
        updateData.assigneeNames = body.assigneeNames || [];
      }
    }
    
    if (body.reporterIds && Array.isArray(body.reporterIds)) {
      if (!body.reporterNames || body.reporterNames.length !== body.reporterIds.length) {
        updateData.reporterNames = body.reporterNames || [];
      }
    }
    
    if (body.projectId && !body.project) {
      updateData.project = body.projectId;
    }
    
    // Update timestamps
    updateData.updatedAt = new Date();
    
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      data: updatedTask
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task (using query parameter)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID' },
        { status: 400 }
      );
    }
    
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    await Task.findByIdAndDelete(taskId);
    
    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
      deletedId: taskId,
      deletedTask: {
        taskId: existingTask.taskId,
        issueKey: existingTask.issueKey,
        summary: existingTask.summary
      }
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}