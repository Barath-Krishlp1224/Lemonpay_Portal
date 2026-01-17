import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import mongoose from "mongoose";

// GET all tasks for a specific project with filtering
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    
    const status = searchParams.get("status");
    const sprintId = searchParams.get("sprintId");
    const issueType = searchParams.get("issueType");
    const assignee = searchParams.get("assignee");
    const priority = searchParams.get("priority");
    const epicId = searchParams.get("epicId");

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid Project ID" },
        { status: 400 }
      );
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    let tasks = project.tasks || [];

    if (status) {
      tasks = tasks.filter((task: any) => task.status === status);
    }
    
    if (sprintId) {
      if (sprintId === "null") {
        tasks = tasks.filter((task: any) => !task.sprintId);
      } else {
        tasks = tasks.filter((task: any) => 
          task.sprintId && task.sprintId.toString() === sprintId
        );
      }
    }

    if (issueType) {
      tasks = tasks.filter((task: any) => task.issueType === issueType);
    }

    if (assignee) {
      tasks = tasks.filter((task: any) => task.assigneeId === assignee);
    }

    if (priority) {
      tasks = tasks.filter((task: any) => task.priority === priority);
    }

    if (epicId) {
      if (epicId === "null") {
        tasks = tasks.filter((task: any) => !task.epicId);
      } else {
        tasks = tasks.filter((task: any) => 
          task.epicId && task.epicId.toString() === epicId
        );
      }
    }

    return NextResponse.json({
      success: true,
      count: tasks.length,
      data: tasks,
      projectId
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new task in the project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await params;
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Project ID" },
        { status: 400 }
      );
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "Task title is required" },
        { status: 400 }
      );
    }

    const taskId = body.taskId || `${project.key}-${(project.tasks?.length || 0) + 1}`;

    const existingTask = project.tasks?.find((task: any) => task.taskId === taskId);
    if (existingTask) {
      return NextResponse.json(
        { success: false, error: `Task with ID ${taskId} already exists in this project` },
        { status: 409 }
      );
    }

    // Create new task object with Backlog as default status
    const newTask = {
      _id: new mongoose.Types.ObjectId(),
      title: body.title,
      description: body.description || "",
      status: body.status || "Backlog", // Changed to Backlog
      priority: body.priority || "Medium",
      assigneeId: body.assigneeId || undefined,
      storyPoints: body.storyPoints || undefined,
      taskId: taskId,
      issueType: body.issueType || "Task",
      assigneeNames: body.assigneeNames || [],
      subtasks: body.subtasks || [],
      backlogOrder: body.backlogOrder || (project.tasks?.length || 0) + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional fields if they have values
    if (body.sprintId) {
      (newTask as any).sprintId = new mongoose.Types.ObjectId(body.sprintId);
    }

    if (body.epicId) {
      (newTask as any).epicId = new mongoose.Types.ObjectId(body.epicId);
    }

    // Add assigneeIds and reporterIds if provided
    if (body.assigneeIds) {
      (newTask as any).assigneeIds = body.assigneeIds;
    }

    if (body.reporterIds) {
      (newTask as any).reporterIds = body.reporterIds;
    }

    if (!project.tasks) {
      project.tasks = [];
    }
    
    project.tasks.push(newTask as any);
    
    if (newTask.status === "Done") {
      project.completedTasks = (project.completedTasks || 0) + 1;
    }
    project.totalTasks = (project.totalTasks || 0) + 1;

    await project.save();

    return NextResponse.json({
      success: true,
      data: newTask,
      message: "Task created successfully"
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Bulk update tasks or update a single task
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await params;
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Project ID" },
        { status: 400 }
      );
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    if (Array.isArray(body.tasks)) {
      const updatePromises = body.tasks.map(async (taskUpdate: any) => {
        const taskIndex = project.tasks.findIndex(
          (t: any) => t._id.toString() === taskUpdate._id
        );
        
        if (taskIndex !== -1) {
          const oldStatus = project.tasks[taskIndex].status;
          const newStatus = taskUpdate.status || oldStatus;
          
          project.tasks[taskIndex] = {
            ...project.tasks[taskIndex],
            ...taskUpdate,
            updatedAt: new Date()
          };

          if (taskUpdate.sprintId === null || taskUpdate.sprintId === undefined) {
            project.tasks[taskIndex].sprintId = undefined;
          } else if (taskUpdate.sprintId) {
            project.tasks[taskIndex].sprintId = new mongoose.Types.ObjectId(taskUpdate.sprintId);
          }

          if (taskUpdate.epicId === null || taskUpdate.epicId === undefined) {
            project.tasks[taskIndex].epicId = undefined;
          } else if (taskUpdate.epicId) {
            project.tasks[taskIndex].epicId = new mongoose.Types.ObjectId(taskUpdate.epicId);
          }

          if (oldStatus !== newStatus) {
            if (oldStatus === "Done" && newStatus !== "Done") {
              project.completedTasks = Math.max(0, (project.completedTasks || 0) - 1);
            } else if (oldStatus !== "Done" && newStatus === "Done") {
              project.completedTasks = (project.completedTasks || 0) + 1;
            }
          }
          
          return project.tasks[taskIndex];
        }
        return null;
      });

      const updatedTasks = await Promise.all(updatePromises);
      
      await project.save();

      return NextResponse.json({
        success: true,
        message: `${updatedTasks.filter(t => t !== null).length} tasks updated successfully`,
        data: updatedTasks.filter(t => t !== null)
      });
    } else {
      const { taskId, ...updateData } = body;
      
      if (!taskId) {
        return NextResponse.json(
          { success: false, error: "Task ID is required for single task update" },
          { status: 400 }
        );
      }

      const taskIndex = project.tasks.findIndex(
        (t: any) => t._id.toString() === taskId || t.taskId === taskId
      );
      
      if (taskIndex === -1) {
        return NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 }
        );
      }

      const oldStatus = project.tasks[taskIndex].status;
      const newStatus = updateData.status || oldStatus;

      project.tasks[taskIndex] = {
        ...project.tasks[taskIndex],
        ...updateData,
        updatedAt: new Date()
      };

      if (updateData.sprintId === null || updateData.sprintId === undefined) {
        project.tasks[taskIndex].sprintId = undefined;
      } else if (updateData.sprintId) {
        project.tasks[taskIndex].sprintId = new mongoose.Types.ObjectId(updateData.sprintId);
      }

      if (updateData.epicId === null || updateData.epicId === undefined) {
        project.tasks[taskIndex].epicId = undefined;
      } else if (updateData.epicId) {
        project.tasks[taskIndex].epicId = new mongoose.Types.ObjectId(updateData.epicId);
      }

      if (oldStatus !== newStatus) {
        if (oldStatus === "Done" && newStatus !== "Done") {
          project.completedTasks = Math.max(0, (project.completedTasks || 0) - 1);
        } else if (oldStatus !== "Done" && newStatus === "Done") {
          project.completedTasks = (project.completedTasks || 0) + 1;
        }
      }

      await project.save();

      return NextResponse.json({
        success: true,
        data: project.tasks[taskIndex],
        message: "Task updated successfully"
      });
    }
  } catch (error: any) {
    console.error('Error updating tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a task from the project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Project ID" },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const taskIndex = project.tasks.findIndex(
      (t: any) => t._id.toString() === taskId || t.taskId === taskId
    );
    
    if (taskIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const taskToDelete = project.tasks[taskIndex];
    
    project.tasks.splice(taskIndex, 1);
    
    project.totalTasks = Math.max(0, (project.totalTasks || 0) - 1);
    if (taskToDelete.status === "Done") {
      project.completedTasks = Math.max(0, (project.completedTasks || 0) - 1);
    }

    await project.save();

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
      deletedTaskId: taskId
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}