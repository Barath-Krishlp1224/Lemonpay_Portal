import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import mongoose from "mongoose";

// GET: Get epics for a project with optional filtering
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Filter epics by status if provided
    let epics = project.epics || [];
    if (status) {
      epics = epics.filter((epic: any) => epic.status === status);
    }

    return NextResponse.json({
      epics,
      projectId,
      total: epics.length
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new epic in the project
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

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: "Epic title is required" },
        { status: 400 }
      );
    }

    // Generate a unique epic ID within the project
    const epicId = body.epicId || `${project.key}-E-${(project.epics?.length || 0) + 1}`;

    // Check if epic with same epicId already exists
    const existingEpic = project.epics?.find((epic: any) => epic.epicId === epicId);
    if (existingEpic) {
      return NextResponse.json(
        { error: `Epic with ID ${epicId} already exists in this project` },
        { status: 409 }
      );
    }

    // Create new epic object
    const newEpic = {
      _id: new mongoose.Types.ObjectId(),
      title: body.title,
      description: body.description || "",
      status: body.status || "Not Started",
      epicId: epicId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add epic to project's epics array
    if (!project.epics) {
      project.epics = [];
    }
    
    project.epics.push(newEpic as any);
    await project.save();

    return NextResponse.json({
      success: true,
      data: newEpic,
      message: "Epic created successfully"
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating epic:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update an epic in the project
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

    const { epicId, ...updateData } = body;
    
    if (!epicId) {
      return NextResponse.json(
        { error: "Epic ID is required" },
        { status: 400 }
      );
    }

    // Find the epic in the project
    const epicIndex = project.epics.findIndex(
      (e: any) => e._id.toString() === epicId || e.epicId === epicId
    );
    
    if (epicIndex === -1) {
      return NextResponse.json(
        { error: "Epic not found" },
        { status: 404 }
      );
    }

    // Update the epic
    project.epics[epicIndex] = {
      ...project.epics[epicIndex],
      ...updateData,
      updatedAt: new Date()
    };

    await project.save();

    return NextResponse.json({
      success: true,
      data: project.epics[epicIndex],
      message: "Epic updated successfully"
    });
  } catch (error: any) {
    console.error('Error updating epic:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete an epic from the project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await connectDB();
    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const epicId = searchParams.get("epicId");

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid Project ID" },
        { status: 400 }
      );
    }

    if (!epicId) {
      return NextResponse.json(
        { error: "Epic ID is required" },
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

    // Find the epic in the project
    const epicIndex = project.epics.findIndex(
      (e: any) => e._id.toString() === epicId || e.epicId === epicId
    );
    
    if (epicIndex === -1) {
      return NextResponse.json(
        { error: "Epic not found" },
        { status: 404 }
      );
    }

    // Remove the epic from the array
    project.epics.splice(epicIndex, 1);
    await project.save();

    return NextResponse.json({
      success: true,
      message: "Epic deleted successfully",
      deletedEpicId: epicId
    });
  } catch (error: any) {
    console.error('Error deleting epic:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}