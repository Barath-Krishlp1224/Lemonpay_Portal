import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Epic from "@/models/Epic";
import Employee from "@/models/Employee";
import Project from "@/models/Project";
import mongoose from "mongoose";

// Define params type
type Params = Promise<{ id: string }>;

// Define a type for the employee document
type EmployeeDocument = Document & {
  _id: mongoose.Types.ObjectId;
  name: string;
  mailId: string;
  empId: string;
  department?: string;
  role?: string;
};

// GET: Fetch single epic by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Epic ID" }, { status: 400 });
    }

    const epic = await Epic.findById(id);
    if (!epic) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    return NextResponse.json(epic, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update an epic by ID - COMPLETE UPDATE VERSION
export async function PUT(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Epic ID" }, { status: 400 });
    }

    const existingEpic = await Epic.findById(id);
    if (!existingEpic) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    // Check for duplicate name (excluding current epic)
    if (body.name) {
      const duplicateEpic = await Epic.findOne({
        name: { $regex: new RegExp(`^${body.name.trim()}$`, "i") },
        projectId: existingEpic.projectId,
        _id: { $ne: id }
      });

      if (duplicateEpic) {
        return NextResponse.json(
          { error: `Another epic with the name "${body.name.trim()}" already exists in this project.` },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    // Handle basic fields
    if (body.name) updateData.name = body.name.trim();
    if (body.summary) updateData.summary = body.summary.trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.labels !== undefined) updateData.labels = body.labels;
    if (body.sprintId !== undefined) updateData.sprintId = body.sprintId;
    if (body.storyPoints !== undefined) updateData.storyPoints = body.storyPoints;

    // Handle dates
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }

    // Handle owner update if ownerId is provided
    if (body.ownerId) {
      // Validate ownerId
      if (body.ownerId.trim() === "") {
        return NextResponse.json({ error: "Owner ID cannot be empty" }, { status: 400 });
      }
      
      if (!mongoose.Types.ObjectId.isValid(body.ownerId)) {
        return NextResponse.json({ error: "Invalid owner ID format" }, { status: 400 });
      }
      
      const ownerEmployee = await Employee.findById(body.ownerId);
      if (!ownerEmployee) {
        return NextResponse.json({ error: "Owner employee not found" }, { status: 400 });
      }
      
      updateData.owner = {
        _id: ownerEmployee._id.toString(),
        name: ownerEmployee.name,
        email: (ownerEmployee as any).mailId || ""
      };
    }

    // Handle assignees update if assigneeIds is provided
    if (body.assigneeIds !== undefined && Array.isArray(body.assigneeIds)) {
      const assigneesData = [];
      
      for (const assigneeId of body.assigneeIds) {
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
    }

    // Update the epic
    const updatedEpic = await Epic.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEpic) {
      return NextResponse.json({ error: "Failed to update epic" }, { status: 500 });
    }

    return NextResponse.json(updatedEpic, { status: 200 });
  } catch (error: any) {
    console.error("Epic update error:", error);
    return NextResponse.json({ 
      error: error.message.includes("Cast to ObjectId") 
        ? "Invalid employee ID format. Please select a valid employee." 
        : error.message 
    }, { status: 500 });
  }
}

// DELETE: Remove an epic by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    await connectDB();
    const { id } = await params;

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