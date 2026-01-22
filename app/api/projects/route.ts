import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import mongoose from "mongoose";

// GET: Fetch all projects
export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find().sort({ createdAt: -1 });
    return NextResponse.json(projects, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new project with editable key and duplicate name check
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    // Check if Project Name already exists (Case Insensitive)
    const existingName = await Project.findOne({ 
      name: { $regex: new RegExp(`^${body.name.trim()}$`, "i") } 
    });
    if (existingName) {
      return NextResponse.json(
        { error: `A project with the name "${body.name.trim()}" already exists.` },
        { status: 400 }
      );
    }

    // Get key from request or auto-generate
    let key = body.key;
    if (!key || key.trim() === "") {
      key = body.name
        .split(/\s+/)
        .filter((w: string) => w.length > 0)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5);
      
      if (key.length < 2) {
        key = (body.name.substring(0, 5) + Math.floor(Math.random() * 10)).toUpperCase();
      }
    }

    const normalizedKey = key.toUpperCase().trim();

    // Validate key format
    if (!/^[A-Z0-9]+$/.test(normalizedKey)) {
      return NextResponse.json(
        { error: "Project key can only contain uppercase letters and numbers" },
        { status: 400 }
      );
    }

    if (normalizedKey.length < 2 || normalizedKey.length > 10) {
      return NextResponse.json(
        { error: "Project key must be between 2 and 10 characters" },
        { status: 400 }
      );
    }

    // Check if key already exists
    const existingKey = await Project.findOne({ key: normalizedKey });
    if (existingKey) {
      return NextResponse.json(
        { error: `Project key "${normalizedKey}" is already in use. Please choose a different key.` },
        { status: 400 }
      );
    }

    // Create project without ownerId
    const newProject = await Project.create({
      name: body.name.trim(),
      key: normalizedKey,
      description: body.description || "",
      visibility: "PRIVATE",
      status: "Active",
      // Members array will be empty initially, can be added later
      members: []
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error("Project creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Edit and Save changes
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { _id, ...updateData } = body;

    if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
      return NextResponse.json({ error: "A valid Project ID is required" }, { status: 400 });
    }

    // Check if project exists
    const existingProject = await Project.findById(_id);
    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check for Duplicate Name during update
    if (updateData.name && updateData.name.trim() !== existingProject.name) {
      const duplicateName = await Project.findOne({
        name: { $regex: new RegExp(`^${updateData.name.trim()}$`, "i") },
        _id: { $ne: _id }
      });
      if (duplicateName) {
        return NextResponse.json(
          { error: `Another project already uses the name "${updateData.name.trim()}".` },
          { status: 400 }
        );
      }
    }

    // If updating key, validate and check for uniqueness
    if (updateData.key && updateData.key.toUpperCase().trim() !== existingProject.key) {
      const normalizedKey = updateData.key.toUpperCase().trim();
      
      if (!/^[A-Z0-9]+$/.test(normalizedKey)) {
        return NextResponse.json(
          { error: "Project key can only contain uppercase letters and numbers" },
          { status: 400 }
        );
      }

      if (normalizedKey.length < 2 || normalizedKey.length > 10) {
        return NextResponse.json(
          { error: "Project key must be between 2 and 10 characters" },
          { status: 400 }
        );
      }

      const existingKey = await Project.findOne({ 
        key: normalizedKey, 
        _id: { $ne: _id }
      });
      
      if (existingKey) {
        return NextResponse.json(
          { error: `Project key "${normalizedKey}" is already in use.` },
          { status: 400 }
        );
      }
      
      updateData.key = normalizedKey;
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      _id,
      { 
        $set: updateData,
        $currentDate: { updatedAt: true } // Ensure updatedAt is updated
      },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error: any) {
    console.error("Project update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a project OR remove a member from project
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    // Handle member removal if userId is provided
    if (userId) {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "A valid Project ID is required" }, { status: 400 });
      }

      // Check if project exists
      const project = await Project.findById(id);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      // Check if user is a member
      const memberIndex = project.members.findIndex((m: any) => m.userId === userId);
      if (memberIndex === -1) {
        return NextResponse.json({ error: "Member not found in project" }, { status: 404 });
      }

      // Remove member
      project.members.splice(memberIndex, 1);

      // Ensure at least one admin remains
      const hasAdmin = project.members.some((m: any) => m.role === 'Admin');
      if (!hasAdmin && project.members.length > 0) {
        project.members[0].role = 'Admin';
      }

      await project.save();
      return NextResponse.json({ 
        message: "Member removed successfully",
        projectId: id,
        userId: userId
      }, { status: 200 });
    }
    // Otherwise, handle project deletion
    else {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
      }

      // Check if project exists
      const project = await Project.findById(id);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const deleted = await Project.findByIdAndDelete(id);
      if (!deleted) {
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
      }

      return NextResponse.json({ 
        message: "Project deleted successfully",
        deletedId: id 
      }, { status: 200 });
    }
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Add member to project or update member role
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { projectId, userId, role = "Contributor" } = body;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "A valid Project ID is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!["Viewer", "Contributor", "Admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user is already a member
    const existingMemberIndex = project.members.findIndex((m: any) => m.userId === userId);
    
    if (existingMemberIndex !== -1) {
      // Update existing member's role
      project.members[existingMemberIndex].role = role;
      project.members[existingMemberIndex].addedAt = new Date();
    } else {
      // Add new member
      project.members.push({
        userId,
        role,
        addedAt: new Date()
      });
    }

    await project.save();
    return NextResponse.json(project, { status: 200 });
  } catch (error: any) {
    console.error("Add/update member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}