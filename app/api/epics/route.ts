import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Epic from "@/models/Epic";
import Employee from "@/models/Employee";
import Project from "@/models/Project";
import mongoose from "mongoose";

// Define a type for the employee document
type EmployeeDocument = Document & {
  _id: mongoose.Types.ObjectId;
  name: string;
  mailId: string;
  empId: string;
  department?: string;
  role?: string;
};

// GET: Fetch epics for a project or single epic by ID
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const epicId = searchParams.get("epicId");

    // If epicId is provided, return single epic
    if (epicId) {
      if (!mongoose.Types.ObjectId.isValid(epicId)) {
        return NextResponse.json({ error: "Invalid Epic ID" }, { status: 400 });
      }
      
      const epic = await Epic.findById(epicId);
      if (!epic) {
        return NextResponse.json({ error: "Epic not found" }, { status: 404 });
      }
      return NextResponse.json(epic, { status: 200 });
    }

    // Otherwise, filter by projectId if provided
    let query = {};
    if (projectId) {
      query = { projectId };
    }

    const epics = await Epic.find(query).sort({ createdAt: -1 });
    return NextResponse.json(epics, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new epic
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    console.log("Creating epic with data:", body);

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Epic name is required" }, { status: 400 });
    }

    if (!body.summary || !body.summary.trim()) {
      return NextResponse.json({ error: "Epic summary is required" }, { status: 400 });
    }

    if (!body.projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Validate ownerId
    if (!body.ownerId || body.ownerId.trim() === "") {
      return NextResponse.json({ error: "Epic owner is required" }, { status: 400 });
    }

    // Validate ownerId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(body.ownerId)) {
      return NextResponse.json({ error: "Invalid owner ID format" }, { status: 400 });
    }

    // Get project data
    const project = await Project.findById(body.projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get owner data
    const ownerEmployee = await Employee.findById(body.ownerId);
    if (!ownerEmployee) {
      return NextResponse.json({ error: "Owner employee not found" }, { status: 400 });
    }

    // Check for duplicate epic name in the same project
    const existingEpic = await Epic.findOne({
      name: { $regex: new RegExp(`^${body.name.trim()}$`, "i") },
      projectId: body.projectId
    });

    if (existingEpic) {
      return NextResponse.json(
        { error: `An epic with the name "${body.name.trim()}" already exists in this project.` },
        { status: 400 }
      );
    }

    // FIXED: Find the highest existing epic number for this project and increment
    // This ensures we don't get duplicate epic IDs
    const existingEpics = await Epic.find({ 
      projectId: body.projectId,
      epicId: { $regex: new RegExp(`^${project.key}-EPIC-`, "i") }
    }).sort({ createdAt: -1 });

    let epicNumber = 1;
    
    if (existingEpics.length > 0) {
      // Extract the highest epic number
      const epicNumbers = existingEpics.map(epic => {
        const match = epic.epicId.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
      
      const maxEpicNumber = Math.max(...epicNumbers);
      epicNumber = maxEpicNumber + 1;
    }

    // Generate epic ID with proper zero padding
    let epicId = `${project.key}-EPIC-${epicNumber.toString().padStart(3, '0')}`;

    // Verify this epicId doesn't already exist (double-check)
    const duplicateEpicId = await Epic.findOne({ epicId });
    if (duplicateEpicId) {
      // If somehow it exists, find the next available number
      let nextNumber = epicNumber + 1;
      let newEpicId = `${project.key}-EPIC-${nextNumber.toString().padStart(3, '0')}`;
      
      while (await Epic.findOne({ epicId: newEpicId })) {
        nextNumber++;
        newEpicId = `${project.key}-EPIC-${nextNumber.toString().padStart(3, '0')}`;
      }
      
      epicId = newEpicId;
    }

    // Get assignees data
    const assigneesData = [];
    if (body.assigneeIds && Array.isArray(body.assigneeIds)) {
      for (const assigneeId of body.assigneeIds) {
        // Validate assigneeId before querying
        if (assigneeId && mongoose.Types.ObjectId.isValid(assigneeId)) {
          const employee = await Employee.findById(assigneeId);
          if (employee) {
            assigneesData.push({
              _id: employee._id.toString(),
              name: employee.name,
              email: (employee as any).mailId || ""
            });
          }
        }
      }
    }

    // Parse dates
    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const endDate = body.endDate ? new Date(body.endDate) : null;

    // Create epic
    const newEpic = await Epic.create({
      epicId,
      name: body.name.trim(),
      summary: body.summary.trim(),
      description: body.description || "",
      status: body.status || "Not Started",
      priority: body.priority || "Medium",
      startDate,
      endDate,
      owner: {
        _id: ownerEmployee._id.toString(),
        name: ownerEmployee.name,
        email: (ownerEmployee as any).mailId || ""
      },
      assignees: assigneesData,
      labels: body.labels || [],
      projectId: body.projectId,
      projectName: project.name,
      projectKey: project.key,
      createdBy: body.createdBy || "user",
      sprintId: body.sprintId || "",
      storyPoints: body.storyPoints || 0,
    });

    return NextResponse.json(newEpic, { status: 201 });
  } catch (error: any) {
    console.error("Epic creation error:", error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000 && error.keyPattern && error.keyPattern.epicId) {
      return NextResponse.json(
        { 
          error: `Epic ID already exists. Please try again or contact support if this persists.`,
          details: error.message 
        }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      error: error.message.includes("Cast to ObjectId") 
        ? "Invalid employee ID format. Please select a valid employee." 
        : error.message 
    }, { status: 500 });
  }
}

// PUT: Update an epic
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { _id, ...updateData } = body;

    if (!_id) {
      return NextResponse.json({ error: "Epic ID is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return NextResponse.json({ error: "Invalid Epic ID format" }, { status: 400 });
    }

    const existingEpic = await Epic.findById(_id);
    if (!existingEpic) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    // Check for duplicate name (excluding current epic)
    if (updateData.name) {
      const duplicateEpic = await Epic.findOne({
        name: { $regex: new RegExp(`^${updateData.name.trim()}$`, "i") },
        projectId: existingEpic.projectId,
        _id: { $ne: _id }
      });

      if (duplicateEpic) {
        return NextResponse.json(
          { error: `Another epic with the name "${updateData.name.trim()}" already exists in this project.` },
          { status: 400 }
        );
      }
    }

    // Handle owner update if ownerId is provided
    if (updateData.ownerId) {
      // Validate ownerId
      if (updateData.ownerId.trim() === "") {
        return NextResponse.json({ error: "Owner ID cannot be empty" }, { status: 400 });
      }
      
      if (!mongoose.Types.ObjectId.isValid(updateData.ownerId)) {
        return NextResponse.json({ error: "Invalid owner ID format" }, { status: 400 });
      }
      
      const ownerEmployee = await Employee.findById(updateData.ownerId);
      if (!ownerEmployee) {
        return NextResponse.json({ error: "Owner employee not found" }, { status: 400 });
      }
      
      updateData.owner = {
        _id: ownerEmployee._id.toString(),
        name: ownerEmployee.name,
        email: (ownerEmployee as any).mailId || ""
      };
      delete updateData.ownerId;
    }

    // Handle assignees update if assigneeIds is provided
    if (updateData.assigneeIds && Array.isArray(updateData.assigneeIds)) {
      const assigneesData = [];
      
      for (const assigneeId of updateData.assigneeIds) {
        // Validate assigneeId
        if (assigneeId && mongoose.Types.ObjectId.isValid(assigneeId)) {
          const employee = await Employee.findById(assigneeId);
          if (employee) {
            assigneesData.push({
              _id: employee._id.toString(),
              name: employee.name,
              email: (employee as any).mailId || ""
            });
          }
        }
      }
      
      updateData.assignees = assigneesData;
      delete updateData.assigneeIds;
    }

    // Handle date parsing
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    
    if (updateData.endDate) {
      updateData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }

    const updatedEpic = await Epic.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEpic) {
      return NextResponse.json({ error: "Failed to update epic" }, { status: 500 });
    }

    return NextResponse.json(updatedEpic, { status: 200 });
  } catch (error: any) {
    console.error("Epic update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an epic
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Epic ID is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Epic ID" }, { status: 400 });
    }

    const deleted = await Epic.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Epic deleted successfully",
      deletedEpicId: deleted.epicId
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}