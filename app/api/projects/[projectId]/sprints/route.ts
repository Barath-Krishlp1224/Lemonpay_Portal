import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import mongoose from "mongoose";

// GET: Get all sprints for a project
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await context.params;

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

    return NextResponse.json({
      success: true,
      sprints: project.sprints || [],
      count: project.sprints?.length || 0
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching sprints:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new sprint in a project
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await context.params;
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

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: "Sprint name is required" },
        { status: 400 }
      );
    }

    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Check for duplicate sprint name in this project
    const existingSprint = project.sprints.find(
      (sprint: any) => sprint.name.toLowerCase() === body.name.toLowerCase().trim()
    );
    if (existingSprint) {
      return NextResponse.json(
        { success: false, error: `A sprint with the name "${body.name}" already exists in this project` },
        { status: 400 }
      );
    }

    // Create new sprint with explicit type casting
    const newSprint = {
      _id: new mongoose.Types.ObjectId(),
      name: body.name.trim(),
      goal: body.goal || "",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: "Planned" as "Planned" | "Active" | "Completed", // Type assertion here
      tasks: body.tasks || [],
      completedTasks: 0,
      totalTasks: 0,
      completedPoints: 0,
      totalPoints: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add sprint to project
    if (!project.sprints) {
      project.sprints = [];
    }
    
    project.sprints.push(newSprint);
    await project.save();

    return NextResponse.json({
      success: true,
      message: "Sprint created successfully",
      sprint: newSprint
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sprint:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update a sprint in a project
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await context.params;
    const body = await req.json();
    const { sprintId, ...updateData } = body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Project ID" },
        { status: 400 }
      );
    }

    if (!sprintId || !mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { success: false, error: "Valid Sprint ID is required" },
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

    // Find the sprint index
    const sprintIndex = project.sprints.findIndex(
      (s: any) => s._id.toString() === sprintId
    );

    if (sprintIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Sprint not found" },
        { status: 404 }
      );
    }

    // Update sprint
    project.sprints[sprintIndex] = {
      ...project.sprints[sprintIndex],
      ...updateData,
      updatedAt: new Date()
    };

    // Validate status if it's being updated
    if (updateData.status && !["Planned", "Active", "Completed"].includes(updateData.status)) {
      return NextResponse.json(
        { success: false, error: "Status must be 'Planned', 'Active', or 'Completed'" },
        { status: 400 }
      );
    }

    await project.save();

    return NextResponse.json({
      success: true,
      message: "Sprint updated successfully",
      sprint: project.sprints[sprintIndex]
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating sprint:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a sprint from a project
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await context.params;
    const body = await req.json();
    const { sprintId } = body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Project ID" },
        { status: 400 }
      );
    }

    if (!sprintId || !mongoose.Types.ObjectId.isValid(sprintId)) {
      return NextResponse.json(
        { success: false, error: "Valid Sprint ID is required" },
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

    // Find the sprint index
    const sprintIndex = project.sprints.findIndex(
      (s: any) => s._id.toString() === sprintId
    );

    if (sprintIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Sprint not found" },
        { status: 404 }
      );
    }

    // Remove sprint from project
    project.sprints.splice(sprintIndex, 1);

    // Move tasks from this sprint back to backlog
    if (project.tasks && Array.isArray(project.tasks)) {
      project.tasks = project.tasks.map((task: any) => {
        if (task.sprintId && task.sprintId.toString() === sprintId) {
          return {
            ...task,
            sprintId: null,
            status: "Backlog",
            updatedAt: new Date()
          };
        }
        return task;
      });
    }

    await project.save();

    return NextResponse.json({
      success: true,
      message: "Sprint deleted successfully. Tasks moved back to backlog.",
      deletedSprintId: sprintId
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting sprint:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}